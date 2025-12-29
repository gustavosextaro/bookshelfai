// Supabase Edge Function (Deno)
// Aplica limite mensal por AÇÕES e chama OpenAI/Gemini usando APENAS a key do usuário.

import { createClient } from 'jsr:@supabase/supabase-js@2'

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

function getEnv(name: string) {
  const v = Deno.env.get(name)
  if (!v) throw new Error(`Missing env: ${name}`)
  return v
}

async function importKey(secret: string) {
  const enc = new TextEncoder()
  const raw = await crypto.subtle.digest('SHA-256', enc.encode(secret))
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

function fromB64(b64str: string) {
  const binary = atob(b64str)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function decrypt(secret: string, payload: string) {
  const parts = payload.split(':')
  if (parts.length !== 3 || parts[0] !== 'v1') throw new Error('invalid_cipher')
  const iv = fromB64(parts[1])
  const ct = fromB64(parts[2])

  const key = await importKey(secret)
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
  return new TextDecoder().decode(pt)
}

function computeLimits(plan: string) {
  if (plan === 'creator') return 400
  if (plan === 'pro') return 150
  return 20
}

function actionCost(actionType: string) {
  if (actionType === 'cross_reference') return 2
  return 1
}

async function callOpenAI({ apiKey, prompt }: { apiKey: string; prompt: string }) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Você é um assistente útil e direto.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
    }),
  })

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const msg = data?.error?.message || 'API Key inválida ou sem permissão.'
    const err = new Error(msg)
    ;(err as any).status = res.status
    throw err
  }

  return data?.choices?.[0]?.message?.content ?? ''
}

async function callGemini({ apiKey, prompt }: { apiKey: string; prompt: string }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7 },
    }),
  })

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const msg = data?.error?.message || 'API Key inválida ou sem permissão.'
    const err = new Error(msg)
    ;(err as any).status = res.status
    throw err
  }

  const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join('')
  return text || ''
}

function buildPrompt(actionType: string, input: any) {
  const books = Array.isArray(input?.books) ? input.books : []
  const insights = books
    .slice(0, 30)
    .map((b: any) => `- ${b?.title ?? 'não disponível'} (${b?.authors?.length ? b.authors.join(', ') : 'autor não disponível'})`)
    .join('\n')

  if (actionType === 'ideas') {
    return `Com base nos insights abaixo extraídos de livros lidos pelo usuário, gere 10 ideias de conteúdo focadas em autoridade para criadores de conteúdo no Instagram.\n\nLivros/insights:\n${insights || '- não disponível'}\n\nRegras:\n- Responda em português.\n- Liste 10 ideias numeradas.\n- Cada ideia deve ter: título curto + 1 frase de ângulo.`
  }

  if (actionType === 'script') {
    const topic = input?.topic || 'um tema genérico'
    return `Crie um roteiro curto (até 60s) para um vídeo no Instagram sobre: ${topic}.\n\nBaseie-se nos seguintes livros lidos:\n${insights || '- não disponível'}\n\nEstrutura:\n- Hook (1 frase)\n- 3 pontos\n- CTA final.`
  }

  if (actionType === 'cross_reference') {
    return `Compare e conecte repertórios entre os livros abaixo. Gere 5 conexões (ideias) que misturem conceitos em uma perspectiva original.\n\nLivros:\n${insights || '- não disponível'}\n\nResponda em português, com 5 itens numerados.`
  }

  return `Ação desconhecida: ${actionType}`
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' })

  const supabaseUrl = getEnv('SUPABASE_URL')
  const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY')
  const encryptionSecret = getEnv('AI_KEY_ENCRYPTION_SECRET')

  const authHeader = req.headers.get('Authorization') || ''

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()

  if (userErr || !user) return json(401, { error: 'not_authenticated' })

  const body = await req.json().catch(() => null)
  const actionType = body?.actionType
  const input = body?.input

  if (typeof actionType !== 'string' || !actionType) return json(400, { error: 'invalid_action' })

  const cost = actionCost(actionType)

  const { data: usage, error: usageErr } = await supabase
    .from('user_ai_usage')
    .select('plan, monthly_limit, usage_current, reset_date')
    .eq('user_id', user.id)
    .maybeSingle()

  if (usageErr || !usage) {
    return json(400, { error: 'usage_not_initialized' })
  }

  const limit = Number.isFinite(usage.monthly_limit) ? usage.monthly_limit : computeLimits(usage.plan)
  const current = Number.isFinite(usage.usage_current) ? usage.usage_current : 0

  if (current + cost > limit) {
    return json(429, { error: 'monthly_limit_reached', message: 'Limite mensal de gerações atingido' })
  }

  const { data: settings, error: settingsErr } = await supabase
    .from('user_ai_settings')
    .select('provider, api_key_encrypted')
    .eq('user_id', user.id)
    .maybeSingle()

  if (settingsErr || !settings) {
    return json(400, { error: 'missing_ai_settings', message: 'Conecte sua própria IA para liberar as gerações inteligentes.' })
  }

  const apiKey = await decrypt(encryptionSecret, settings.api_key_encrypted)
  const prompt = buildPrompt(actionType, input)

  let output = ''
  try {
    if (settings.provider === 'openai') {
      output = await callOpenAI({ apiKey, prompt })
    } else {
      output = await callGemini({ apiKey, prompt })
    }
  } catch (e) {
    return json(400, { error: 'provider_error', message: (e as Error).message || 'API Key informada é inválida ou não possui permissão.' })
  }

  const { error: incErr } = await supabase
    .from('user_ai_usage')
    .update({ usage_current: current + cost })
    .eq('user_id', user.id)

  if (incErr) {
    return json(500, { error: 'usage_increment_failed' })
  }

  return json(200, { ok: true, output, usage: { current: current + cost, limit } })
})
