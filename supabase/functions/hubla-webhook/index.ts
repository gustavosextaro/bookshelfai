// Hub.la Payment Webhook Handler
// Robust version with token validation, idempotency, and credits management

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hubla-token, x-hubla-signature, x-hubla-idempotency',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

// Hub.la Product ID → Subscription Tier & Credits Mapping
const PRODUCT_MAPPING: Record<string, { tier: string; credits: number }> = {
  // Premium Mensal - R$ 57
  '2SI6fQaWg0KNtnEHKIQI': { tier: 'premium', credits: 500 },
  // Premium Anual - R$ 197
  'eYhBOW8mv1XlNCT5Pmxx': { tier: 'premium', credits: 500 },
  // Enterprise Mensal - R$ 87
  '61euzeBFRfquwm9ko3eU': { tier: 'enterprise', credits: 1000 },
  // Enterprise Anual - R$ 297
  'otXE08CrBF1rA9ZjC3mm': { tier: 'enterprise', credits: 1000 }
}

// Valid payment events from Hub.la
const VALID_EVENTS = [
  'sale.confirmed',
  'sale.completed', 
  'subscription.activated',
  'subscription.renewed',
  'payment.confirmed',
  'purchase.approved',
  'customer.member_added'
]

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()
  console.log('🔔 Hub.la Webhook received at', new Date().toISOString())

  try {
    // ===== 1. VALIDATE REQUEST METHOD =====
    if (req.method !== 'POST') {
      console.log('❌ Method not allowed:', req.method)
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ===== 2. VALIDATE HUB.LA TOKEN =====
    const hublaToken = req.headers.get('x-hubla-token') || req.headers.get('authorization')?.replace('Bearer ', '') || ''
    const expectedToken = Deno.env.get('HUBLA_WEBHOOK_TOKEN') || ''
    
    if (expectedToken && hublaToken && hublaToken !== expectedToken) {
      console.log('❌ Invalid Hub.la token')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ===== 3. INITIALIZE SUPABASE =====
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('VITE_SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing Supabase configuration')
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // ===== 4. CHECK IDEMPOTENCY (avoid duplicates) =====
    const idempotencyKey = req.headers.get('x-hubla-idempotency') || ''
    
    if (idempotencyKey) {
      // Check if we already processed this event
      const { data: existingEvent } = await supabase
        .from('processed_webhooks')
        .select('id')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle()

      if (existingEvent) {
        console.log('⏭️ Duplicate event ignored:', idempotencyKey)
        return new Response(JSON.stringify({ message: 'Duplicate event ignored' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // ===== 5. PARSE WEBHOOK PAYLOAD =====
    const payload = await req.json()
    console.log('📦 Payload:', JSON.stringify(payload, null, 2))

    const eventType = payload?.type || payload?.event || 'unknown'
    const eventData = payload?.event || payload?.data || payload

    // Check if this is a relevant payment event
    if (!VALID_EVENTS.some(e => eventType.includes(e) || eventType === e)) {
      console.log(`⏭️ Skipping non-payment event: ${eventType}`)
      return new Response(JSON.stringify({ message: 'Event not relevant', event: eventType }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ===== 6. EXTRACT CUSTOMER EMAIL =====
    const customerEmail = (
      eventData?.user?.email ||
      eventData?.customer?.email || 
      eventData?.buyer?.email || 
      eventData?.purchaser?.email ||
      eventData?.email ||
      payload?.customer?.email ||
      payload?.user?.email ||
      payload?.email
    )?.toLowerCase()?.trim()

    if (!customerEmail) {
      console.error('❌ No customer email found in webhook')
      return new Response(JSON.stringify({ error: 'No customer email found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`📧 Customer email: ${customerEmail}`)

    // ===== 7. EXTRACT PRODUCT/OFFER ID =====
    const productId = (
      eventData?.products?.[0]?.offers?.[0]?.id ||
      eventData?.products?.[0]?.id ||
      eventData?.product?.id ||
      eventData?.offer?.id ||
      eventData?.product_id ||
      eventData?.offerId ||
      payload?.product?.id ||
      payload?.offer?.id ||
      payload?.product_id
    )

    console.log(`🛒 Product/Offer ID: ${productId}`)

    if (!productId) {
      console.error('❌ No product ID found in webhook')
      return new Response(JSON.stringify({ error: 'No product ID found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ===== 8. GET SUBSCRIPTION DETAILS =====
    const subscriptionDetails = PRODUCT_MAPPING[productId]
    
    if (!subscriptionDetails) {
      console.error(`❌ Unknown product ID: ${productId}`)
      // Log it but return 200 to avoid Hub.la retrying
      return new Response(JSON.stringify({ 
        error: 'Unknown product', 
        productId,
        knownProducts: Object.keys(PRODUCT_MAPPING)
      }), {
        status: 200, // Return 200 to stop retries
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`✅ Upgrading to: ${subscriptionDetails.tier} with ${subscriptionDetails.credits} credits`)

    // ===== 9. FIND USER BY EMAIL =====
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.error('❌ Error listing users:', authError.message)
      return new Response(JSON.stringify({ error: 'Database error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const user = authUsers?.users?.find(u => 
      u.email?.toLowerCase() === customerEmail
    )

    if (!user) {
      console.warn(`⚠️ User not found for email: ${customerEmail}`)
      // Return 200 but log for manual processing later
      return new Response(JSON.stringify({ 
        message: 'User not found - requires manual upgrade',
        email: customerEmail,
        tier: subscriptionDetails.tier,
        credits: subscriptionDetails.credits
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`👤 Found user: ${user.id} (${user.email})`)

    // ===== 10. UPDATE USER PROFILE =====
    const updateData = {
      subscription_tier: subscriptionDetails.tier,
      ai_credits_remaining: subscriptionDetails.credits,
      subscription_status: 'active',
      updated_at: new Date().toISOString()
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)

    if (updateError) {
      console.error('❌ Error updating profile:', updateError.message)
      return new Response(JSON.stringify({ error: 'Failed to update subscription' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ===== 11. RECORD PROCESSED WEBHOOK (idempotency) =====
    if (idempotencyKey) {
      await supabase.from('processed_webhooks').insert({
        idempotency_key: idempotencyKey,
        event_type: eventType,
        customer_email: customerEmail,
        product_id: productId,
        tier: subscriptionDetails.tier,
        processed_at: new Date().toISOString()
      }).catch(err => {
        // Don't fail if logging fails
        console.warn('⚠️ Failed to log webhook:', err.message)
      })
    }

    const duration = Date.now() - startTime
    console.log(`🎉 SUCCESS! Upgraded ${customerEmail} to ${subscriptionDetails.tier} with ${subscriptionDetails.credits} credits in ${duration}ms`)

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Subscription upgraded successfully',
      email: customerEmail,
      tier: subscriptionDetails.tier,
      credits: subscriptionDetails.credits,
      duration: `${duration}ms`
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Webhook error:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
