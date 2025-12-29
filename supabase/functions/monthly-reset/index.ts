// Supabase Scheduled Edge Function (Deno)
// Reseta usage_current para 0 e move reset_date para o próximo mês.

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

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' })

  const supabaseUrl = getEnv('SUPABASE_URL')
  const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY')

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const now = new Date()
  const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const nextResetDate = nextReset.toISOString().slice(0, 10)

  const { error } = await supabase
    .from('user_ai_usage')
    .update({ usage_current: 0, reset_date: nextResetDate })
    .lt('reset_date', now.toISOString().slice(0, 10))

  if (error) return json(500, { error: 'reset_failed' })

  return json(200, { ok: true, reset_date: nextResetDate })
})
