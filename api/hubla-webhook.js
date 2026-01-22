import { createClient } from '@supabase/supabase-js';

// Hub.la Product ID → Subscription Tier & Credits Mapping
const PRODUCT_MAPPING = {
  '2SI6fQaWg0KNtnEHKIQI': { tier: 'premium', credits: 500 },
  'eYhBOW8mv1XlNCT5Pmxx': { tier: 'premium', credits: 500 },
  '61euzeBFRfquwm9ko3eU': { tier: 'enterprise', credits: 1000 },
  'otXE08CrBF1rA9ZjC3mm': { tier: 'enterprise', credits: 1000 }
};

const VALID_EVENTS = ['sale.confirmed', 'sale.completed', 'subscription.activated', 'subscription.renewed', 'payment.confirmed', 'customer.member_added'];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type, x-hubla-token, x-hubla-idempotency');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  console.log('🔔 Hub.la Webhook received');

  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Check idempotency
    const idempotencyKey = req.headers['x-hubla-idempotency'];
    if (idempotencyKey) {
      const { data: existing } = await supabase
        .from('processed_webhooks')
        .select('id')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();
      
      if (existing) {
        console.log('⏭️ Duplicate ignored:', idempotencyKey);
        return res.status(200).json({ message: 'Duplicate ignored' });
      }
    }

    const payload = req.body;
    console.log('📦 Payload:', JSON.stringify(payload, null, 2));

    const eventType = payload?.type || payload?.event || 'unknown';
    const eventData = payload?.event || payload?.data || payload;

    // Check if relevant event
    if (!VALID_EVENTS.some(e => eventType.includes(e))) {
      return res.status(200).json({ message: 'Event not relevant', event: eventType });
    }

    // Extract email
    const customerEmail = (
      eventData?.user?.email ||
      eventData?.customer?.email ||
      eventData?.buyer?.email ||
      payload?.email
    )?.toLowerCase()?.trim();

    if (!customerEmail) {
      return res.status(400).json({ error: 'No customer email found' });
    }

    // Extract product ID
    const productId = (
      eventData?.products?.[0]?.offers?.[0]?.id ||
      eventData?.products?.[0]?.id ||
      eventData?.product?.id ||
      payload?.product_id
    );

    if (!productId) {
      return res.status(400).json({ error: 'No product ID found' });
    }

    const subscriptionDetails = PRODUCT_MAPPING[productId];
    if (!subscriptionDetails) {
      return res.status(200).json({ error: 'Unknown product', productId });
    }

    console.log(`📧 ${customerEmail} → ${subscriptionDetails.tier} (${subscriptionDetails.credits} credits)`);

    // Find user by email
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const user = authUsers?.users?.find(u => u.email?.toLowerCase() === customerEmail);

    if (!user) {
      console.warn(`⚠️ User not found: ${customerEmail}`);
      return res.status(200).json({ message: 'User not found - manual upgrade needed', email: customerEmail });
    }

    // Update profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        subscription_tier: subscriptionDetails.tier,
        ai_credits_remaining: subscriptionDetails.credits,
        subscription_status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      return res.status(500).json({ error: 'Update failed' });
    }

    // Log for idempotency
    if (idempotencyKey) {
      await supabase.from('processed_webhooks').insert({
        idempotency_key: idempotencyKey,
        event_type: eventType,
        customer_email: customerEmail,
        product_id: productId,
        tier: subscriptionDetails.tier,
        processed_at: new Date().toISOString()
      }).catch(() => {});
    }

    console.log(`🎉 SUCCESS: ${customerEmail} → ${subscriptionDetails.tier}`);
    return res.status(200).json({ 
      success: true, 
      email: customerEmail, 
      tier: subscriptionDetails.tier,
      credits: subscriptionDetails.credits
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
