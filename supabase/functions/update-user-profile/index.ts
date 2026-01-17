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
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            { auth: { persistSession: false } }
        )

        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

        if (authError) throw new Error(`Auth Error: ${authError.message}`)
        if (!user) throw new Error('Unauthorized')

        const { username, avatar_url } = await req.json()

        const { data: updatedProfile, error: updateError } = await supabaseClient
            .from('profiles')
            .update({
                username,
                avatar_url
            })
            .eq('id', user.id)
            .select()
            .single()

        if (updateError) throw new Error(`Update Error: ${updateError.message}`)

        return new Response(JSON.stringify(updatedProfile), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        console.error('Error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        return new Response(JSON.stringify({ error: errorMessage }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
