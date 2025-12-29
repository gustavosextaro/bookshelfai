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
        if (!authHeader) throw new Error('Missing Authorization header')

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
        if (!user) throw new Error('Unauthorized')

        const { data: settings, error } = await supabaseClient
            .from('user_ai_settings')
            .select('provider, api_key_encrypted')
            .eq('user_id', user.id)
            .single()

        if (error && error.code !== 'PGRST116') { // PGRST116 is "row not found"
            throw error
        }

        let maskedKey = null
        if (settings?.api_key_encrypted) {
            try {
                const raw = atob(settings.api_key_encrypted).trim()
                if (raw.length > 8) {
                    maskedKey = `${raw.slice(0, 3)}...${raw.slice(-4)}`
                } else {
                    maskedKey = '********'
                }
            } catch {
                maskedKey = '********'
            }
        }

        return new Response(JSON.stringify({
            provider: settings?.provider || 'openai',
            hasKey: !!settings?.api_key_encrypted,
            maskedKey
        }), {
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
