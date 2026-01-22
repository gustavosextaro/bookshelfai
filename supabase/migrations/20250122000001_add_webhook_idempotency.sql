-- Migration: Add webhook processing table for idempotency
-- This prevents duplicate webhook processing from Hub.la

-- Create processed_webhooks table
CREATE TABLE IF NOT EXISTS processed_webhooks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    idempotency_key TEXT UNIQUE NOT NULL,
    event_type TEXT,
    customer_email TEXT,
    product_id TEXT,
    tier TEXT,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_processed_webhooks_idempotency 
ON processed_webhooks(idempotency_key);

-- Add subscription_status column to profiles if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'subscription_status'
    ) THEN
        ALTER TABLE profiles ADD COLUMN subscription_status TEXT DEFAULT 'inactive';
    END IF;
END $$;

-- RLS policies for processed_webhooks (service role only)
ALTER TABLE processed_webhooks ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table
CREATE POLICY "Service role only for processed_webhooks" 
ON processed_webhooks FOR ALL 
USING (auth.role() = 'service_role');

-- Comment for documentation
COMMENT ON TABLE processed_webhooks IS 'Tracks processed Hub.la webhooks to prevent duplicate processing';
