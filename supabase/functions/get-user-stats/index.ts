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
            { auth: { persistSession: false } }
        )

        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

        if (authError) throw new Error(`Auth Error: ${authError.message}`)
        if (!user) throw new Error('Unauthorized')

        // Fetch user stats
        const { data: stats, error: statsError } = await supabaseClient
            .from('user_stats')
            .select('*')
            .eq('user_id', user.id)
            .single()

        if (statsError && statsError.code !== 'PGRST116') {
            throw new Error(`Stats Error: ${statsError.message}`)
        }

        // Fetch book usage details
        const { data: bookUsage, error: usageError } = await supabaseClient
            .from('book_usage_stats')
            .select('*')
            .eq('user_id', user.id)
            .order('last_ai_generated', { ascending: false })

        if (usageError) {
            console.warn('Book usage error:', usageError)
        }

        return new Response(JSON.stringify({
            stats: stats || {
                total_books: 0,
                total_ai_generated: 0,
                total_summaries: 0,
                avg_content_per_book: 0
            },
            bookUsage: bookUsage || []
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        console.error('Error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
