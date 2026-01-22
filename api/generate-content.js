import { createClient } from '@supabase/supabase-js';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// System Prompt: PRODUTOR DE CONTEÚDO
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

=== ESTRUTURA DE ROTEIRO ===
- **HOOK** (0-15s): 1-2 frases fortes, curiosidade/tensão
- **DESENVOLVIMENTO** (1:10-2:00): Contexto + aplicação + exemplo prático
- **CTA FINAL** (5-15s): 1 ação clara com motivo

DURAÇÃO: 1:00 a 2:30 (média 1:45)`;

// System Prompt: NEXUS DE LEITURA
const NEXUS_SYSTEM_PROMPT = `Você é o Nexus de Leitura - um especialista em transformar livros em conteúdo viral.

=== SEU PAPEL ===
- Construir e manter a VISÃO INTELECTUAL do usuário baseada nos livros que ele leu
- Organizar repertório literário para criar conteúdo único
- Desenvolver linha editorial coerente baseada em livros

=== REGRAS OBRIGATÓRIAS ===
1. Use SEMPRE a memória dos livros fornecida
2. Conecte ideias entre livros diferentes
3. Cite livros quando relevante para demonstrar repertório`;

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Auth
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { 
      customPrompt, 
      conversationHistory = [],
      context = 'produtor',
      bookIds = []
    } = req.body;

    // Build context for Nexus mode
    let bookContext = '';
    if (context === 'nexus' && bookIds.length > 0) {
      const { data: books } = await supabase
        .from('books')
        .select('title, authors, book_memory(themes, insights)')
        .eq('user_id', user.id)
        .in('id', bookIds);

      if (books?.length > 0) {
        bookContext = '\n\nLIVROS DISPONÍVEIS:\n' + books.map(b => 
          `- "${b.title}" por ${b.authors?.join(', ') || 'Autor'}\n` +
          `  Temas: ${b.book_memory?.[0]?.themes?.join(', ') || 'N/A'}`
        ).join('\n');
      }
    }

    const systemPrompt = context === 'nexus' ? NEXUS_SYSTEM_PROMPT : PRODUTOR_SYSTEM_PROMPT;
    const userPrompt = customPrompt + bookContext;
    
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: userPrompt }
    ];

    // Call OpenAI
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
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const aiData = await openaiResponse.json();
    const result = aiData.choices[0].message.content;

    return res.status(200).json({
      success: true,
      result,
      metadata: { context }
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
