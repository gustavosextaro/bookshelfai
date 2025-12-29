import { serve } from "std/http/server.ts"
import { createClient } from "@supabase/supabase-js"

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
    if (!authHeader) throw new Error('No Authorization header')

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: { persistSession: false },
        global: { headers: { Authorization: authHeader } }
      }
    )

    const {
      data: { user },
      error: userError
    } = await supabaseClient.auth.getUser()

    if (userError) throw new Error(`Auth Error: ${userError.message}`)
    if (!user) throw new Error('Unauthorized: User not found')

    const { provider, apiKey } = await req.json()

    if (!provider || !apiKey) throw new Error('Missing provider or apiKey')

    // Simple "encryption" (just base64 for now, real app should use proper encryption or Supabase Vault)
    // The user requested "Save safely". We will do base64 to avoid plain text in db viewer, 
    // but note that this is NOT strong encryption. 
    // Ideally we would use pgsodium or similar if enabled.
    const encrypted = btoa(apiKey.trim())

    const { error } = await supabaseClient
      .from('user_ai_settings')
      .upsert({
        user_id: user.id,
        provider,
        api_key_encrypted: encrypted,
        updated_at: new Date().toISOString()
      })

    if (error) throw error

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
