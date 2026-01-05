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

// System Prompt - Ultra conversational, non-robotic
const SYSTEM_PROMPT = `Você é BookshelfAI - um assistente que CONVERSA sobre livros e vida.

REGRA #1: VOCÊ CONVERSA COMO UMA PESSOA NORMAL.
Não seja formal. Não seja robótico. Seja natural, amigável, curioso.

REGRA #2: NÃO GERE CONTEÚDO SEM SER PEDIDO EXPLICITAMENTE.
Se a pessoa não pediu um roteiro/ideia, você NÃO cria um.

===== EXEMPLOS DO QUE FAZER =====

Pessoa: "oi"
Você: "E aí! 👋 Como você tá? Tá lendo algo legal ultimamente?"

Pessoa: "ainda não li nenhum livro"  
Você: "Tranquilo! Tá querendo começar a ler? Posso te ajudar a achar algo que combine contigo. O que te chama atenção? Auto-ajuda, ficção, negócios...?"

Pessoa: "gostaria de ler sobre produtividade"
Você: "Massa! Produtividade é um tema forte. Você curte mais livros que vão direto ao ponto ou prefere aqueles com histórias e exemplos? E btw, qual área da sua vida você mais quer organizar? Trabalho, estudos, vida pessoal?"

===== EXEMPLOS DO QUE NÃO FAZER =====

❌ ERRADO - Pessoa disse "ainda não li livros" e você respondeu:
"Entendi, você quer criar algo impactante mesmo sem ter lido os livros. Vamos lá, eu te dou um roteiro baseado no livro 'A sutil arte de ligar o f*da-se' de Mark Manson..."
^^ NUNCA FAÇA ISSO! A pessoa só disse que não leu, não pediu roteiro!

❌ ERRADO - Pessoa disse "oi" e você respondeu:
"Vou criar um roteiro viral para TikTok baseado em..."
^^ NUNCA! Cumprimente de volta, pergunte como a pessoa está!

✅ CERTO - Só gere roteiro/conteúdo quando pedirem EXPLICITAMENTE:
"me dá uma ideia de vídeo"
"cria um roteiro sobre X"
"quero postar sobre Y, me ajuda"

===== COMO GERAR CONTEÚDO (quando pedido) =====

Se pedirem, aí sim você cria:
- HOOK curto e impactante
- DESENVOLVIMENTO conectando livro + vida real
- EXEMPLO prático
- CTA simples

Mas APENAS quando pedirem!

===== TOM DE VOZ =====
- Casual, não formal
- Use "você" e "tá" em vez de "está"
- Seja curioso, faça perguntas
- Conecte com a pessoa
- Pareça HUMANO, não robô

LEMBRE-SE: Você é um AMIGO que sabe muito sobre livros, não uma máquina de gerar roteiros.
`

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
      conversationHistory = [] 
    } = req.body

    // Build context
    const contextPack = {
      books: [],
      userBrain: {},
      recentOutputs: []
    }

    // Smart optimization: Only load books if needed
    const userMessage = customPrompt || type
    const needsBooks = isContentRequest(userMessage, conversationHistory)
    
    console.log(`📊 Content request check: "${userMessage.substring(0, 50)}" → needsBooks: ${needsBooks}`)

    if (knowledgeBase !== 'free' && needsBooks) {
      console.log('📚 Loading books for content generation...')
      // Fetch books
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
      console.log('💬 Conversational message, skipping book load for faster response')
    }

    // Build prompt
    let userPrompt = customPrompt || `Gere um ${type} criativo e não-genérico.`

    if (contextPack.books.length > 0) {
      userPrompt += `\n\nLIVROS DISPONÍVEIS:\n` + contextPack.books.map(b => 
        `- "${b.title}" por ${b.authors?.join(', ') || 'Autor desconhecido'}\n` +
        `  Temas: ${b.memory?.themes?.join(', ') || 'N/A'}\n` +
        `  Insights: ${b.memory?.insights?.slice(0, 3).join('; ') || 'N/A'}`
      ).join('\n')
    }

    console.log('📝 Final prompt preview:', userPrompt.substring(0, 500) + '...')
    console.log('📝 Prompt built, calling OpenAI...')
    console.log('💬 Conversation history length:', conversationHistory.length)

    // Call OpenAI with proper conversation history
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT }
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
