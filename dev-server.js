import express from 'express'
import cors from 'cors'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()
dotenv.config({ path: '.env.local' })

const app = express()
const PORT = 3002

app.use(cors())
app.use(express.json())

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

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

=== PROIBIDO ===
- Falar sobre livros ou leitura (esse modo NÃO usa livros)
- Perguntar se está lendo algo
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

=== TOM DE VOZ ===
- Casual, não formal
- Use "você" e "tá" em vez de "está"
- Seja curioso, faça perguntas sobre livros
- Conecte com a pessoa
- Pareça HUMANO, não robô

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

=== PROIBIDO ===
- Frases genéricas motivacionais
- Ignorar os livros fornecidos
- Dar conselhos que qualquer IA daria
- Esquecer de conectar com o repertório literário`

// Helper: Detect if message needs book context
function isContentRequest(message, history = []) {
  const msg = message.toLowerCase()
  
  // Conversational greetings - NO books needed
  if (msg.match(/^(oi|ola|olá|opa|e ai|eai|hey|hello|boa tarde|boa noite|bom dia)$/)) {
    return false
  }
  
  // Short questions about capabilities - NO books needed  
  if (msg.match(/o que|como|quem|pode fazer|ajudar|voce é/)) {
    return false
  }
  
  // Content generation keywords - YES books needed
  if (msg.match(/(cri[ae]|ger[ae]|faz|fa[çc]a|desenvolv|elabor|escrev|monte|sugir[ae]|ideia|roteiro|video|conte[uú]do|script|post)/)) {
    return true
  }
  
  // If conversation has context and user is continuing - check last messages
  if (history.length > 0) {
    const lastMessages = history.slice(-2).map(h => h.content.toLowerCase()).join(' ')
    if (lastMessages.match(/(livro|biblioteca|conte[uú]do)/)) {
      return true // Likely continuing content discussion
    }
  }
  
  return false // Default to conversational
}

// Endpoint: POST /.netlify/functions/generate-content
app.post('/.netlify/functions/generate-content', async (req, res) => {
  try {
    console.log('🧠 Received generate-content request:', req.body)

    // Get auth header
    const authHeader = req.headers.authorization
    if (!authHeader) {
      console.error('❌ No authorization header')
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Get OpenAI API key (from environment or header)
    const openaiApiKey = process.env.OPENAI_API_KEY || req.headers['x-openai-api-key']
    if (!openaiApiKey) {
      console.error('❌ No OpenAI API key provided (check .env or X-OpenAI-API-Key header)')
      return res.status(400).json({ error: 'OpenAI API key required' })
    }
    console.log('✅ OpenAI API key found:', openaiApiKey.substring(0, 15) + '...')

    // Initialize Supabase client with ANON KEY for JWT validation
    const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
    if (!SUPABASE_ANON_KEY) {
      console.error('❌ Missing VITE_SUPABASE_ANON_KEY in environment')
      return res.status(500).json({ error: 'Server configuration error' })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    })

    // Get user from session
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('❌ Invalid token:', userError)
      return res.status(401).json({ error: 'Invalid token' })
    }


    console.log('✅ User authenticated:', user.id)

    const { 
      type, 
      bookIds = [], 
      customPrompt, 
      knowledgeBase = 'full',
      conversationHistory = [],
      context = 'produtor' // 'produtor' | 'nexus' - default to produtor
    } = req.body

    console.log(`🎯 Context mode: ${context}`)

    // Build context
    const contextPack = {
      books: [],
      userBrain: {},
      recentOutputs: []
    }

    // ONLY load books if context is 'nexus' (book-based mode)
    // Produtor mode NEVER uses books
    if (context === 'nexus') {
      const userMessage = customPrompt || type
      const needsBooks = isContentRequest(userMessage, conversationHistory)
      
      console.log(`📊 Nexus mode - Content request check: "${userMessage.substring(0, 50)}" → needsBooks: ${needsBooks}`)

      if (knowledgeBase !== 'free' && needsBooks) {
        console.log('📚 Loading books for content generation...')
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

        console.log('🔍 Fetching books for user:', user.id)
        const { data: books, error: booksError } = await booksQuery

        if (booksError) {
          console.error('⚠️  Error fetching books:', booksError)
        } else {
          console.log('✅ Books fetched:', books?.length || 0)
          console.log('📖 Book titles:', books?.map(b => b.title).join(', ') || 'none')
        }

        contextPack.books = books?.map(b => ({
          title: b.title,
          authors: b.authors,
          memory: b.book_memory?.[0] || {}
        })) || []

        console.log(`📚 Loaded ${contextPack.books.length} books into context`)
      } else {
        console.log('💬 Conversational message in Nexus, skipping book load')
      }
    } else {
      console.log('🎬 Produtor mode - NO books will be loaded')
    }

    // Build prompt
    let userPrompt = customPrompt || `Gere um ${type} criativo e não-genérico.`

    // ONLY add book context for Nexus mode
    if (context === 'nexus' && contextPack.books.length > 0) {
      userPrompt += `\n\nLIVROS DISPONÍVEIS:\n` + contextPack.books.map(b => 
        `- "${b.title}" por ${b.authors?.join(', ') || 'Autor desconhecido'}\n` +
        `  Temas: ${b.memory?.themes?.join(', ') || 'N/A'}\n` +
        `  Insights: ${b.memory?.insights?.slice(0, 3).join('; ') || 'N/A'}`
      ).join('\n')
    }

    console.log('📝 Final prompt preview:', userPrompt.substring(0, 500) + '...')
    console.log('📝 Prompt built, calling OpenAI...')
    console.log('💬 Conversation history length:', conversationHistory.length)

    // Select system prompt based on context
    const systemPrompt = context === 'nexus' ? NEXUS_SYSTEM_PROMPT : PRODUTOR_SYSTEM_PROMPT
    console.log(`🤖 Using ${context === 'nexus' ? 'NEXUS' : 'PRODUTOR'} system prompt`)

    // Call OpenAI with proper conversation history
    const messages = [
      { role: 'system', content: systemPrompt }
    ]
    
    // Add conversation history if exists
    if (conversationHistory && conversationHistory.length > 0) {
      console.log('✅ Adding conversation history to context')
      messages.push(...conversationHistory)
    }
    
    // Add current user message
    messages.push({ role: 'user', content: userPrompt })
    
    console.log('📨 Total messages being sent to OpenAI:', messages.length)

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
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
      console.error('❌ OpenAI API error:', errorText)
      throw new Error(`OpenAI API error: ${errorText}`)
    }

    const openaiResult = await openaiResponse.json()
    const aiMessage = openaiResult.choices[0].message.content

    console.log('✅ OpenAI response received')
    console.log('📝 Response preview:', aiMessage.substring(0, 200) + '...')

    // Save to database
    const { error: insertError } = await supabase
      .from('ai_outputs')
      .insert({
        user_id: user.id,
        type: type || 'chat',
        prompt: customPrompt || userPrompt,
        result: aiMessage,
        metadata: {
          books_used: contextPack.books.map(b => b.title),
          model: 'gpt-4-turbo-preview'
        }
      })

    if (insertError) {
      console.error('⚠️  Error saving output:', insertError)
    }

    return res.json({
      success: true,
      result: aiMessage,
      metadata: {
        books_used: contextPack.books.map(b => b.title)
      }
    })

  } catch (error) {
    console.error('❌ Error in generate-content:', error)
    return res.status(500).json({
      error: error.message || 'Internal server error'
    })
  }
})

// Endpoint: POST /.netlify/functions/generate-editorial-line
app.post('/.netlify/functions/generate-editorial-line', async (req, res) => {
  try {
    console.log('🎯 Received generate-editorial-line request')

    // Get auth header
    const authHeader = req.headers.authorization
    if (!authHeader) {
      console.error('❌ No authorization header')
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Get OpenAI API key
    const openaiApiKey = process.env.OPENAI_API_KEY || req.headers['x-openai-api-key']
    if (!openaiApiKey) {
      console.error('❌ No OpenAI API key provided')
      return res.status(400).json({ error: 'OpenAI API key required' })
    }

    // Initialize Supabase client
    const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
    if (!SUPABASE_ANON_KEY) {
      console.error('❌ Missing VITE_SUPABASE_ANON_KEY in environment')
      return res.status(500).json({ error: 'Server configuration error' })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    })

    // Get user from session
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('❌ Invalid token:', userError)
      return res.status(401).json({ error: 'Invalid token' })
    }

    console.log('✅ User authenticated:', user.id)

    // Fetch user's books with memory
    const { data: books, error: booksError } = await supabase
      .from('books')
      .select(`
        id, title, authors, description, categories,
        book_memory (themes, insights, angles, contradictions, examples)
      `)
      .eq('user_id', user.id)

    if (booksError) {
      console.error('❌ Error fetching books:', booksError)
      return res.status(500).json({ error: 'Failed to fetch books' })
    }

    if (!books || books.length === 0) {
      return res.status(400).json({ error: 'No books found. Add books to your library first.' })
    }

    console.log(`📚 Found ${books.length} books for editorial line generation`)

    // Build context from books
    const booksContext = books.map(b => ({
      title: b.title,
      authors: b.authors?.join(', ') || 'Unknown',
      themes: b.book_memory?.[0]?.themes || [],
      insights: b.book_memory?.[0]?.insights || []
    }))

    // Create prompt for editorial line
    const prompt = `Baseado nos livros que o usuário leu, crie uma linha editorial personalizada para produção de conteúdo.

LIVROS LIDOS:
${booksContext.map(b => `- "${b.title}" por ${b.authors}
  Temas: ${b.themes.join(', ') || 'N/A'}
  Insights: ${b.insights.slice(0, 3).join('; ') || 'N/A'}`).join('\n\n')}

TAREFA:
Analise os temas, padrões e insights dos livros e crie:

1. **Pilares Editoriais**: 3-5 pilares principais que conectam os livros lidos
2. **Progressão de Conteúdo**: Como evoluir o conteúdo ao longo do tempo

Retorne APENAS um JSON válido no formato:
{
  "pillars": ["Pilar 1", "Pilar 2", "Pilar 3"],
  "progression": "Descrição de como progressar o conteúdo"
}

Não inclua markdown, formatação ou texto adicional. Apenas o JSON.`

    console.log('📝 Calling OpenAI for editorial line...')

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: 'You are a content strategy expert. Return only valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    })

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text()
      console.error('❌ OpenAI API error:', errorText)
      throw new Error(`OpenAI API error: ${errorText}`)
    }

    const openaiResult = await openaiResponse.json()
    const aiMessage = openaiResult.choices[0].message.content

    console.log('✅ OpenAI response received')

    // Parse JSON response
    let editorialLine
    try {
      // Remove markdown code blocks if present
      const cleanedMessage = aiMessage.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      editorialLine = JSON.parse(cleanedMessage)
    } catch (parseError) {
      console.error('❌ Failed to parse OpenAI response as JSON:', aiMessage)
      throw new Error('Failed to parse AI response')
    }

    // Save to user_brain table
    const { error: saveError } = await supabase
      .from('user_brain')
      .upsert({
        user_id: user.id,
        editorial_pillars: editorialLine
      })

    if (saveError) {
      console.error('⚠️ Error saving editorial line:', saveError)
    } else {
      console.log('✅ Editorial line saved to database')
    }

    return res.json({
      success: true,
      editorial_line: editorialLine
    })

  } catch (error) {
    console.error('❌ Error in generate-editorial-line:', error)
    return res.status(500).json({
      error: error.message || 'Internal server error'
    })
  }
})

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`🚀 Dev server running on http://localhost:${PORT}`)
  console.log(`📍 Endpoints:`)
  console.log(`   - POST /.netlify/functions/generate-content`)
  console.log(`   - POST /.netlify/functions/generate-editorial-line`)
  console.log(`   - GET  /health`)
})
