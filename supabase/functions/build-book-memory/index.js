import { createClient } from '@supabase/supabase-js'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const MEMORY_EXTRACTION_PROMPT = `Você é um especialista em análise de livros e extração de conhecimento estruturado.

Sua tarefa é extrair informações estruturadas de um livro para criar uma "memória utilizável" para geração de conteúdo.

IMPORTANTE: Você NÃO leu o livro inteiro. Baseie-se em:
- Descrição oficial do livro
- Análises públicas e resenhas
- Notas do usuário (se fornecidas)

Extraia exatamente:

1. TEMAS CENTRAIS (5-12 temas principais)
   Ex: ["disciplina", "foco profundo", "produtividade", "minimalismo"]

2. INSIGHTS PRINCIPAIS (3-8 ideias-chave)
   Ex: ["A atenção é o novo petróleo", "Multitasking destrói criatividade"]

3. ÂNGULOS DE CONTEÚDO (5-15 ângulos prontos)
   Ex: ["Por que redes sociais são fábricas de distração", "A regra dos 90 minutos"]

4. CONTRADIÇÕES (ideias que este livro contraria)
   Ex: ["Contradiz a ideia de que trabalhar mais horas = mais produtividade"]

5. EXEMPLOS PRÁTICOS (analogias e cases reais)
   Ex: ["Bill Gates: semanas de isolamento para pensar", "Carl Jung: torre no lago"]

Retorne APENAS um JSON válido neste formato:
{
  "themes": [...],
  "insights": [...],
  "angles": [...],
  "contradictions": [...],
  "examples": [...]
}`

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

    const body = await req.json()
    const { bookId, userNotes } = body

    // 1. Buscar informações do livro
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('*')
      .eq('id', bookId)
      .eq('user_id', user.id)
      .single()

    if (bookError || !book) {
      return new Response(JSON.stringify({ error: 'Book not found' }), { status: 404 })
    }

    // 2. Construir contexto para IA
    let context = `LIVRO: "${book.title}"\n`
    if (book.authors?.length) context += `AUTORES: ${book.authors.join(', ')}\n`
    if (book.description) context += `DESCRIÇÃO: ${book.description}\n`
    if (book.categories?.length) context += `CATEGORIAS: ${book.categories.join(', ')}\n`
    if (userNotes) context += `\nNOTAS DO USUÁRIO:\n${userNotes}\n`

    // 3. Chamar OpenAI para extração
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: MEMORY_EXTRACTION_PROMPT },
          { role: 'user', content: context }
        ],
        temperature: 0.7,
        max_tokens: 1500,
        response_format: { type: 'json_object' }
      })
    })

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text()
      throw new Error(`OpenAI API error: ${errorText}`)
    }

    const aiData = await openaiResponse.json()
    const memoryData = JSON.parse(aiData.choices[0].message.content)

    // 4. Salvar na tabela book_memory (upsert)
    const { data: savedMemory, error: memoryError } = await supabase
      .from('book_memory')
      .upsert({
        book_id: bookId,
        user_id: user.id,
        themes: memoryData.themes || [],
        insights: memoryData.insights || [],
        angles: memoryData.angles || [],
        contradictions: memoryData.contradictions || [],
        examples: memoryData.examples || [],
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'book_id'
      })
      .select()
      .single()

    if (memoryError) {
      throw new Error(`Error saving memory: ${memoryError.message}`)
    }

    return new Response(JSON.stringify({
      success: true,
      memory: savedMemory
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })

  } catch (error) {
    console.error('Error in build-book-memory:', error)
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
