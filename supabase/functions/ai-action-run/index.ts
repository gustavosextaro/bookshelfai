import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error('Missing Authorization header')

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            {
               auth: { persistSession: false }
            }
        )

        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

        if (authError) throw new Error(`Auth Error: ${authError.message}`)
        if (!user) throw new Error('Unauthorized')

        const { actionType } = await req.json()

        // =============================================
        // FETCH ALL USER'S BOOKS (ENTIRE LIBRARY)
        // =============================================
        const { data: allBooks, error: booksError } = await supabaseClient
            .from('books')
            .select('*')
            .eq('user_id', user.id)
            .order('read_date', { ascending: true })

        if (booksError) throw new Error(`Database Error: ${booksError.message}`)
        if (!allBooks || allBooks.length === 0) {
            throw new Error('Adicione pelo menos um livro antes de gerar conteúdo.')
        }

        // =============================================
        // FETCH AI GENERATION HISTORY
        // =============================================
        const { data: generationHistory, error: historyError } = await supabaseClient
            .from('ai_generation_log')
            .select('book_id, content_type, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50)

        if (historyError) console.warn('Failed to fetch history:', historyError)

        // OpenAI API Key from environment variable (secure)
        const apiKey = Deno.env.get('OPENAI_API_KEY') ?? ''
        if (!apiKey) throw new Error('OPENAI_API_KEY not configured')

        // =============================================
        // BUILD LIBRARY CONTEXT
        // =============================================
        const libraryContext = allBooks.map((book, idx) => `
${idx + 1}. "${book.title}"
   - Autor: ${book.authors?.join(', ') || 'Desconhecido'}
   - Categorias: ${book.categories?.join(', ') || 'N/A'}
   - Data de leitura: ${book.read_date || 'N/A'}
   ${book.description ? `- Sinopse: ${book.description.substring(0, 200)}...` : ''}
   ${book.user_notes ? `- Notas pessoais: ${book.user_notes}` : ''}
`).join('\n')

        const historyContext = generationHistory && generationHistory.length > 0
            ? `\n## HISTÓRICO DE CONTEÚDOS GERADOS (últimos ${generationHistory.length}):\n` +
              generationHistory.map(h => `- ${h.content_type} (${new Date(h.created_at).toLocaleDateString('pt-BR')})`).join('\n')
            : ''

        // =============================================
        // SYSTEM PROMPT: INTELLECTUAL MEMORY
        // =============================================
        const systemPrompt = `Você é um Sistema de Inteligência Editorial e Intelectual.

SEU PAPEL NÃO É GERAR TEXTOS ISOLADOS.
Seu papel é:
- Construir e manter a VISÃO INTELECTUAL do usuário ao longo do tempo
- Organizar repertório
- Desenvolver linha editorial coerente
- Amplificar autoridade

PRINCÍPIO FUNDAMENTAL:
O usuário NÃO está pagando para "gerar conteúdo".
Ele está pagando para:
- NÃO repetir ideias
- NÃO soar raso
- NÃO depender de tendências
- CONSTRUIR uma visão própria coerente

LIMITAÇÕES TÉCNICAS:
- Você NÃO pode ler livros completos (copyright)
- Você DEVE sintetizar ideias centrais baseado em:
  * Consenso público
  * Resenhas
  * Análises críticas
  * Entrevistas do autor

PROCESSO OBRIGATÓRIO (think step-by-step, INTERNAMENTE):

ETAPA 1 — Análise de Histórico
- Quais ideias o usuário MAIS REPETE?
- Quais temas estão saturados?
- Qual tese dominante emerge?
- Há ausência de contraponto?

ETAPA 2 — Identificação de Padrões
- Quais categorias predominam?
- Há evolução cronológica clara?
- Há contradições entre livros?

ETAPA 3 — Decisão Editorial
Escolha UMA estratégia:
1) EVOLUÇÃO → aprofundar ideia existente
2) TENSIONAMENTO → confrontar padrão repetitivo
3) EXPANSÃO → abrir nova linha de pensamento

NUNCA gere conteúdo genérico, motivacional ou raso.
Escreva como alguém experiente, crítico e seguro.`

        let userPrompt = ''

        // =============================================
        // CONTENT TYPE PROMPTS
        // =============================================
        if (actionType === 'script') {
            userPrompt = `## BIBLIOTECA COMPLETA DO USUÁRIO (${allBooks.length} livros):

${libraryContext}
${historyContext}

---

TAREFA: Criar um roteiro de vídeo (TikTok/Reels) de 1:30 a 2:00 minutos.

PROCESSO OBRIGATÓRIO (execute internamente, não mostre):

1. ANÁLISE DE PADRÕES
   - Que TESE CENTRAL emerge da biblioteca inteira?
   - Quais livros reforçam a mesma ideia?
   - Há algum contraponto importante?
   - O que está SATURADO no repertório?

2. DECISÃO EDITORIAL
   - Este conteúdo vai EVOLUIR uma ideia?
   - Vai TENSIONAR um padrão?
   - Vai EXPANDIR para novo território?

3. CONEXÃO COM PRESENTE
   - Como essa síntese se conecta ao mercado digital atual?
   - Que problema real isso resolve para criadores?

ESTRUTURA OBRIGATÓRIA:

═══ HOOK (0-15s) ═══
Quebra de expectativa baseada em padrões da biblioteca.
Exemplo: "Eu li ${allBooks.length} livros sobre [tema] e descobri que quase todo mundo erra nisso."

═══ DESENVOLVIMENTO (1:15) ═══
- Síntese da IDEIA CENTRAL que emerge de múltiplos livros
- Contraste com senso comum do mercado
- Exemplo prático e moderno
- NUNCA liste livros individualmente
- Foco na TESE, não nos títulos

═══ CTA (10-15s) ═══
Reflexão provocativa.
Exemplo: "Se isso fez clicar, comenta 'REPERTÓRIO' e salva pra depois."

CRITICAL: 
- NÃO mencione todos os livros
- NÃO faça lista
- SINTETIZE a visão intelectual que emerge do conjunto
- Escreva como quem TEM autoridade construída

DURAÇÃO ESTIMADA: inclua no final.`

        } else if (actionType === 'ideas') {
            userPrompt = `## BIBLIOTECA COMPLETA DO USUÁRIO (${allBooks.length} livros):

${libraryContext}
${historyContext}

---

TAREFA: Gerar 5 ideias de conteúdo criativo baseadas na SÍNTESE INTELECTUAL da biblioteca.

PROCESSO (interno):
1. Identifique a TESE DOMINANTE que emerge dos livros
2. Identifique CONTRADIÇÕES interessantes entre livros
3. Identifique GAPS (ausências) no repertório

FORMATO:
Para cada ideia:
- Título/gancho
- Formato (vídeo, carrossel, thread)
- Ângulo narrativo
- Quais livros sustentam essa ideia (não listar, apenas contabilizar)

REGRAS:
- Baseie-se na SÍNTESE, não em livros isolados
- Evite "X lições de Y livros"
- Foque em APLICAÇÃO para criadores
- Mostre autoridade construída`

        } else if (actionType === 'quotes') {
            userPrompt = `## BIBLIOTECA COMPLETA DO USUÁRIO (${allBooks.length} livros):

${libraryContext}
${historyContext}

---

TAREFA: Gerar 5 frases marcantes que sintetizam a VISÃO INTELECTUAL da biblioteca.

IMPORTANTE:
- NÃO cite livros literalmente
- REFORMULE a síntese em frases impactantes
- Cada frase deve refletir o CONSENSO ou TENSÃO entre múltiplos livros

FORMATO:
- Concisa (máx 2 linhas)
- Provocativa
- Compartilhável
- Aplicável

Exemplo de tom:
"Depois de ler ${allBooks.length} livros sobre [tema], entendi que [insight contraintuitivo]."

EVITE clichês motivacionais.`

        } else if (actionType === 'questions') {
            userPrompt = `## BIBLIOTECA COMPLETA DO USUÁRIO (${allBooks.length} livros):

${libraryContext}
${historyContext}

---

TAREFA: Gerar 5 perguntas provocativas baseadas em TENSÕES da biblioteca.

PROCESSO:
1. Identifique onde livros CONTRADIZEM uns aos outros
2. Identifique onde há CONSENSO mas falta profundidade
3. Crie perguntas que explorem essas tensões

FORMATO:
- Abertas (não sim/não)
- Provocam pensamento crítico
- Conectam com dilemas reais de criadores
- Respondíveis com experiência pessoal

EVITE perguntas genéricas ou óbvias.`

        } else {
            throw new Error('Tipo de conteúdo não suportado')
        }

        // =============================================
        // CALL OPENAI
        // =============================================
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.85,
                max_tokens: 2500
            })
        })
        
        const data = await res.json()
        if (data.error) throw new Error(`OpenAI Error: ${data.error.message}`)
        const output = data.choices?.[0]?.message?.content || ''

        // =============================================
        // LOG GENERATION (use first book as reference)
        // =============================================
        await supabaseClient.from('ai_generation_log').insert({
            user_id: user.id,
            book_id: allBooks[0].id, // reference to first/latest book
            content_type: actionType
        })

        return new Response(JSON.stringify({ 
            output,
            metadata: {
                booksAnalyzed: allBooks.length,
                oldestBook: allBooks[0]?.title,
                newestBook: allBooks[allBooks.length - 1]?.title
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        console.error('Edge Function Error:', JSON.stringify(error, Object.getOwnPropertyNames(error)))
        
        return new Response(JSON.stringify({ error: error.message || 'Unknown Error' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
