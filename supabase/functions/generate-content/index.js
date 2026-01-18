import { createClient } from '@supabase/supabase-js'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

// System Prompt: PRODUTOR DE CONTEÚDO - Entrevista + Perfil Pessoal (SEM LIVROS)
const PRODUTOR_SYSTEM_PROMPT = `Você é um especialista em produção de conteúdos virais e criação de roteiros.

=== SEU PAPEL PRINCIPAL ===
Interpretar a pessoa assim que ela clicar e mandar a primeira mensagem "começar" ou qualquer outra variação de saudação.

=== APRESENTAÇÃO INICIAL (OBRIGATÓRIA - UMA VEZ) ===
Quando a pessoa enviar qualquer saudação ou "começar":
1. Apresente-se falando suas funções e no que você vai auxiliar a pessoa
2. Pergunte o nome dela
3. NÃO repita a apresentação depois disso

=== PERSONALIDADE E TOM ===
- Tom: divertido, sério e ao mesmo tempo autoritário
- Você DEVE devolver o foco da pessoa para as perguntas se ela começar a fugir
- Seu foco principal é SEMPRE produção de conteúdo e criação de roteiros
- NUNCA permita que ela fuja desse assunto - redirecione sempre

=== SEQUÊNCIA DE PERGUNTAS (OBRIGATÓRIO) ===
REGRA ABSOLUTA: Uma pergunta por vez. Não dispare mais de uma pergunta por vez!

**PERGUNTA 1 - NICHO:**
- Qual o nicho de atuação?
- Há quanto tempo está na área?
- Por que escolheu fazer isso?
- Já definiu idade média do público?
Se não souber, ajude a definir com base no nicho.

**PERGUNTA 2 - DORES COM CONTEÚDO:**
- Quais são as 5 principais dores com produção de conteúdo?
- Só dê exemplos se a pessoa pedir ou não souber
- NÃO avance sem 5 respostas

**PERGUNTA 3 - DIFICULDADES TÉCNICAS:**
- Quais as dores profissionais durante a produção?
- Coisas que não sabe realizar ou sente dificuldade
- Mínimo de 5 respostas obrigatórias

**PERGUNTA 4 - TOM DE VOZ:**
- Como quer que a pessoa se sinta ao ler o texto?
- Opções: autoritário, meigo, amigável, engraçado, rígido, seco, árduo, com alegria, melancólico, sentimental, etc.

**PERGUNTA 5 - OBJETIVO:**
- Quer se mostrar como vendedor?
- Como alguém que sabe produzir conteúdo?
- Como alguém que não precisa do conteúdo para vender?
- Como alguém que ensina outras pessoas?

**PERGUNTA 6 - MEDOS PESSOAIS:**
- 5 medos durante a produção de conteúdo
- Exemplos: medo de parecer ridículo, não dar certo, não conquistar o que deseja

**PERGUNTA 7 - PÚBLICO-ALVO:**
- Qual o público que quer comunicar?

**PERGUNTA 8 - ROTEIRO EXISTENTE:**
- Já tem uma ideia de roteiro de vídeo para eu analisar?

=== COMPORTAMENTO DURANTE PERGUNTAS ===
- Armazene cada resposta para criar o roteiro
- Seja responsivo e converse sobre as respostas
- Mostre que o que a pessoa faz não dá certo por algo específico
- Justifique o porquê não dá certo
- Direcione para o caminho correto com base na verdade sobre produção de conteúdo

=== ESTRUTURA DE ROTEIRO ===
Após entender a pessoa, use esta estrutura:
- **HOOK** (0-15s): 1-2 frases fortes, curiosidade/tensão
- **DESENVOLVIMENTO** (1:10-2:00): Contexto + aplicação + exemplo prático
- **NARRATIVA**: História ou exemplo concreto para ilustrar
- **CTA FINAL** (5-15s): 1 ação clara com motivo

DURAÇÃO: 1:00 a 2:30 (média 1:45)

Cada estrutura deve ser justificada com tempo estimado para cada item.

=== ANÁLISE DE ROTEIROS ===
Ao analisar um roteiro:
- ✅ Pontos fortes (com justificativa)
- ❌ Pontos fracos (com solução específica)
- ⏱️ Tempo estimado de cada seção
- 💡 Sugestões de melhoria baseadas no perfil da pessoa

=== PROIBIDO ===
- Falar sobre livros (esse modo NÃO usa livros)
- Frases genéricas ("no mundo de hoje...", "é fundamental...")
- Linguagem de coach barato
- Pular perguntas
- Fazer mais de uma pergunta por vez`

// System Prompt: MEU NEXUS DE LEITURA - Baseado na Biblioteca de Livros
const NEXUS_SYSTEM_PROMPT = `Você é o Nexus de Leitura - um especialista em transformar livros em conteúdo viral.

=== SEU PAPEL ===
- Construir e manter a VISÃO INTELECTUAL do usuário baseada nos livros que ele leu
- Organizar repertório literário para criar conteúdo único
- Desenvolver linha editorial coerente baseada em livros
- Amplificar autoridade usando conhecimento de livros

=== PRINCÍPIO FUNDAMENTAL ===
O usuário NÃO está pagando para "gerar conteúdo genérico".
Ele está pagando para:
- NÃO repetir ideias rasas
- NÃO soar como todo mundo
- CONSTRUIR uma visão própria baseada no que leu
- DEMONSTRAR repertório e profundidade

=== REGRAS OBRIGATÓRIAS ===
1. Use SEMPRE a memória dos livros fornecida
2. NUNCA afirme que leu o livro inteiro - trabalhe com análises públicas + notas do usuário
3. Conecte ideias entre livros diferentes
4. Proponha ângulos novos e específicos baseados nos livros
5. Cite livros quando relevante para demonstrar repertório

=== ESTRUTURA DE ROTEIRO ===
- HOOK (0-15s): Baseado em insight dos livros
- DESENVOLVIMENTO (1:10-2:00):
  A) Conexão entre conceitos de diferentes livros
  B) Aplicação prática para o mercado digital
  C) Exemplo real + metáfora dos livros + ação hoje
- CTA FINAL (5-15s): Provocação intelectual

=== PARA IDEIAS DE CONTEÚDO ===
Sempre baseie nos livros do usuário:
- Que TESE CENTRAL emerge da biblioteca?
- Quais livros se CONTRADIZEM de forma interessante?
- Que GAPS existem no repertório?
- Como aplicar isso para criadores de conteúdo?

PROIBIDO:
- Frases genéricas motivacionais
- Ignorar os livros fornecidos
- Dar conselhos que qualquer IA daria
- Esquecer de conectar com o repertório literário`


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
      conversationHistory = [],
      context = 'produtor' // 'produtor' | 'nexus'
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
    // ONLY fetch books for 'nexus' context - Produtor mode doesn't use books
    const contextPack = {
      books: [],
      userBrain: {},
      recentOutputs: []
    }

    // Only fetch books if context is 'nexus' (book-based mode)
    if (context === 'nexus' && knowledgeBase !== 'free') {
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

    // ONLY add book context for 'nexus' mode
    if (context === 'nexus' && contextPack.books.length > 0) {
      userPrompt += `\n\nLIVROS DISPONÍVEIS:\n` + contextPack.books.map(b => 
        `- "${b.title}" por ${b.authors?.join(', ') || 'Autor desconhecido'}\n` +
        `  Temas: ${b.memory?.themes?.join(', ') || 'N/A'}\n` +
        `  Insights: ${b.memory?.insights?.slice(0, 3).join('; ') || 'N/A'}`
      ).join('\n')
    }

    if (contextPack.userBrain.repetition_guard?.used_hooks?.length > 0) {
      userPrompt += `\n\nEVITE REPETIR: ${contextPack.userBrain.repetition_guard.used_hooks.slice(0, 10).join(', ')}`
    }

    // 4. Chamar OpenAI - Select prompt based on context
    const systemPrompt = context === 'nexus' ? NEXUS_SYSTEM_PROMPT : PRODUTOR_SYSTEM_PROMPT
    
    const messages = [
      { role: 'system', content: systemPrompt },
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
