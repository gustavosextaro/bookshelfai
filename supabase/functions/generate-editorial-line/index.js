import { createClient } from '@supabase/supabase-js'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const EDITORIAL_LINE_PROMPT = `Você é um estrategista editorial especializado em conteúdo digital.

Baseado nos livros que o usuário leu, crie uma LINHA EDITORIAL coerente e estratégica.

Retorne um JSON com:

{
  "pillars": ["Pilar 1", "Pilar 2", "Pilar 3"], // 3-5 pilares temáticos principais
  "week_calendar": [
    {
      "day": 1,
      "theme": "Tema específico do dia",
      "book": "Livro base",
      "angle": "Ângulo de abordagem"
    },
    // ... 7 dias
  ],
  "connections": [
    "Livro A + Livro B = Conexão interessante"
  ],
  "progression": "Descrição da progressão de complexidade ao longo da semana"
}

REGRAS:
- Pilares devem ser amplos mas conectados
- Calendário deve ter progressão lógica (básico → avançado)
- Conexões devem mostrar sinergias entre livros
- Evite redundância temática`

export default async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { 
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        }
      })
    }

    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 })
    }

    // 1. Buscar todos os livros do usuário com memória
    const { data: books } = await supabase
      .from('books')
      .select(`
        id, title, authors,
        book_memory (themes, insights, angles)
      `)
      .eq('user_id', user.id)
      .order('read_date', { ascending: false })

    if (!books || books.length === 0) {
      return new Response(JSON.stringify({ 
        error: 'Nenhum livro encontrado. Adicione livros primeiro.' 
      }), { status: 400 })
    }

    // 2. Construir contexto
    const booksContext = books.map(b => ({
      title: b.title,
      authors: b.authors,
      themes: b.book_memory?.[0]?.themes || [],
      insights: b.book_memory?.[0]?.insights || [],
      angles: b.book_memory?.[0]?.angles || []
    }))

    const context = `LIVROS DO USUÁRIO:\n${JSON.stringify(booksContext, null, 2)}`

    // 3. Chamar OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: EDITORIAL_LINE_PROMPT },
          { role: 'user', content: context }
        ],
        temperature: 0.8,
        max_tokens: 1500,
        response_format: { type: 'json_object' }
      })
    })

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text()
      throw new Error(`OpenAI API error: ${errorText}`)
    }

    const aiData = await openaiResponse.json()
    const editorialLine = JSON.parse(aiData.choices[0].message.content)

    // 4. Salvar em user_brain
    await supabase
      .from('user_brain')
      .update({ 
        editorial_pillars: editorialLine,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)

    return new Response(JSON.stringify({
      success: true,
      editorial_line: editorialLine
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })

  } catch (error) {
    console.error('Error in generate-editorial-line:', error)
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
}
