import { createClient } from '@supabase/supabase-js'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

// System Prompt - Cérebro de Conteúdo + Personalidade Conversacional
const SYSTEM_PROMPT = `Você é o BookshelfAI Content Brain - um especialista em produção de conteúdos virais e criação de roteiros.

=== PERSONALIDADE E TOM ===
Tom: divertido, sério e ao mesmo tempo autoritário.
Você é direto, focado e não permite que a conversa fuja do objetivo.
Sempre redirecione para produção de conteúdo se a pessoa desviar.

=== FLUXO INICIAL (PRIMEIRA CONVERSA) ===
Quando o usuário disser "começar" ou qualquer saudação inicial:

1. APRESENTAÇÃO (uma única vez)
"Olá! Sou o Cérebro de Conteúdo do BookshelfAI. Meu papel é te ajudar a criar roteiros virais, ideias de conteúdo não-genéricas e construir uma linha editorial consistente com base nos livros que você já leu. Vou te fazer algumas perguntas para entender exatamente o que você precisa."

2. PERGUNTAR O NOME
"Primeiro, qual é o seu nome?"

3. SEQUÊNCIA DE PERGUNTAS (uma por vez, esperar resposta)
- P1: Nicho de atuação, tempo na área, por que escolheu isso + idade média do público
- P2: 5 principais dores com produção de conteúdo (só dar exemplos se pedir)
- P3: 5 dificuldades técnicas/profissionais na produção
- P4: Tom de voz desejado (autoritário, meigo, engraçado, etc)
- P5: Objetivo principal (vender, ensinar, demonstrar expertise, etc)
- P6: 5 medos pessoais (medo de parecer ridículo, não dar certo, etc)
- P7: Público-alvo que quer comunicar
- P8: "Já tem alguma ideia de roteiro para eu analisar?"

IMPORTANTE: 
- Uma pergunta por vez
- Não avançar sem resposta completa
- Se fugir do assunto, redirecionar: "Entendo, mas antes disso preciso que você responda..."
- Armazenar cada resposta para personalizar os roteiros

=== GERAÇÃO DE CONTEÚDO ===
Após entender o usuário, ao gerar roteiros/conteúdo:

REGRAS OBRIGATÓRIAS:
1. Use SEMPRE a memória dos livros fornecida
2. NUNCA afirme que leu o livro inteiro - trabalhe com análises públicas + notas do usuário
3. Evite repetição usando o repetition_guard
4. Conecte ideias entre livros diferentes
5. Proponha ângulos novos e específicos

ESTRUTURA DE ROTEIRO:
- HOOK (0-15s): 1-2 frases fortes, curiosidade/tensão
- DESENVOLVIMENTO (1:10-2:00):
  A) Contexto do problema real
  B) Ideia do livro aplicada
  C) Exemplo prático + metáfora + ação hoje
- NARRATIVA: história ou exemplo concreto para ilustrar
- CTA FINAL (5-15s): 1 ação clara com motivo

DURAÇÃO: 1:00 a 2:30 (média 1:45)

PROIBIDO:
- Frases genéricas ("no mundo de hoje...", "é fundamental...")
- Listas longas sem profundidade
- Linguagem de coach barato
- Repetir hooks/ângulos já usados

=== ANÁLISE DE ROTEIROS ===
Ao analisar um roteiro fornecido, aponte:
- ✅ Pontos fortes (com justificativa)
- ❌ Pontos fracos (com solução específica)
- ⏱️ Tempo estimado de cada seção
- 💡 Sugestões de melhoria baseadas nos livros do usuário

Sempre justifique cada crítica com base em psicologia de engajamento e conhecimento dos livros.`

export default async (req) => {
  try {
    // CORS headers
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

    // Get user from auth header
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
    const { 
      type, 
      bookIds = [], 
      customPrompt, 
      knowledgeBase = 'full',
      conversationHistory = [] 
    } = body

    // 1. Verificar limite de uso
    const { data: userBrain } = await supabase
      .from('user_brain')
      .select('usage_stats')
      .eq('user_id', user.id)
      .single()

    const usageStats = userBrain?.usage_stats || { monthly_generations: 0, limit: 10, tier: 'free' }
    
    // Reset mensal
    const now = new Date()
    const resetDate = usageStats.reset_date ? new Date(usageStats.reset_date) : null
    if (!resetDate || now > resetDate) {
      usageStats.monthly_generations = 0
      usageStats.reset_date = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()
    }

    if (usageStats.monthly_generations >= usageStats.limit) {
      return new Response(JSON.stringify({ 
        error: 'Limite mensal atingido',
        message: `Você atingiu o limite de ${usageStats.limit} gerações mensais. Faça upgrade para Pro para continuar.`,
        usageStats 
      }), { status: 429 })
    }

    // 2. Buscar contexto (book_memory + user_brain + histórico)
    const contextPack = {
      books: [],
      userBrain: {},
      recentOutputs: []
    }

    if (knowledgeBase !== 'free') {
      // Buscar livros
      const bookIdsToUse = knowledgeBase === 'specific' && bookIds.length > 0 
        ? bookIds 
        : null

      const booksQuery = supabase
        .from('books')
        .select(`
          id, title, authors, description, categories,
          book_memory (themes, insights, angles, contradictions, examples)
        `)
        .eq('user_id', user.id)

      if (bookIdsToUse) {
        booksQuery.in('id', bookIdsToUse)
      }

      const { data: books } = await booksQuery

      contextPack.books = books?.map(b => ({
        title: b.title,
        authors: b.authors,
        memory: b.book_memory?.[0] || {}
      })) || []
    }

    // User brain
    const { data: brain } = await supabase
      .from('user_brain')
      .select('style_preferences, editorial_pillars, repetition_guard')
      .eq('user_id', user.id)
      .single()

    contextPack.userBrain = brain || {}

    // Últimos 10 outputs (anti-repetição)
    const { data: recentOutputs } = await supabase
      .from('ai_outputs')
      .select('type, result, metadata')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    contextPack.recentOutputs = recentOutputs || []

    // 3. Construir prompt para OpenAI
    let userPrompt = customPrompt || `Gere um ${type} criativo e não-genérico.`

    if (contextPack.books.length > 0) {
      userPrompt += `\n\nLIVROS DISPONÍVEIS:\n` + contextPack.books.map(b => 
        `- "${b.title}" por ${b.authors?.join(', ') || 'Autor desconhecido'}\n` +
        `  Temas: ${b.memory?.themes?.join(', ') || 'N/A'}\n` +
        `  Insights: ${b.memory?.insights?.slice(0, 3).join('; ') || 'N/A'}`
      ).join('\n')
    }

    if (contextPack.userBrain.repetition_guard?.used_hooks?.length > 0) {
      userPrompt += `\n\nEVITE REPETIR: ${contextPack.userBrain.repetition_guard.used_hooks.slice(0, 10).join(', ')}`
    }

    // 4. Chamar OpenAI
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversationHistory,
      { role: 'user', content: userPrompt }
    ]

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages,
        temperature: 0.8,
        max_tokens: 2000
      })
    })

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text()
      throw new Error(`OpenAI API error: ${errorText}`)
    }

    const aiData = await openaiResponse.json()
    const result = aiData.choices[0].message.content

    // Estimar duração (contar palavras e estimar ~150 palavras/min)
    const wordCount = result.split(/\s+/).length
    const estimatedSeconds = Math.round((wordCount / 150) * 60)
    const minutes = Math.floor(estimatedSeconds / 60)
    const seconds = estimatedSeconds % 60
    const durationEstimate = `${minutes}:${seconds.toString().padStart(2, '0')}`

    // 5. Salvar output
    const metadata = {
      books_used: contextPack.books.map(b => b.title),
      knowledge_base: knowledgeBase,
      word_count: wordCount
    }

    const { data: savedOutput } = await supabase
      .from('ai_outputs')
      .insert({
        user_id: user.id,
        book_id: bookIds[0] || null,
        type,
        prompt: customPrompt || '',
        result,
        duration_estimate: durationEstimate,
        metadata
      })
      .select()
      .single()

    // 6. Atualizar usage_stats
    usageStats.monthly_generations += 1
    await supabase
      .from('user_brain')
      .update({ 
        usage_stats: usageStats,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)

    // 7. Retornar resultado
    return new Response(JSON.stringify({
      success: true,
      output_id: savedOutput.id,
      result,
      duration_estimate: durationEstimate,
      metadata,
      usage: {
        used: usageStats.monthly_generations,
        limit: usageStats.limit,
        remaining: usageStats.limit - usageStats.monthly_generations
      }
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })

  } catch (error) {
    console.error('Error in generate-content:', error)
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
