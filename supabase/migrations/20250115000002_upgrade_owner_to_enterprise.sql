-- Upgrade owner account to Enterprise tier
-- This gives unlimited AI credits and full access to all features

-- Update owner profile to Enterprise
UPDATE profiles
SET 
  subscription_tier = 'enterprise',
  ai_credits_remaining = 999,
  credits_reset_date = NOW() + INTERVAL '365 days' -- Enterprise doesn't need monthly reset
WHERE email = 'gustavosextaro@gmail.com';

-- Verify the update
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM profiles
  WHERE email = 'gustavosextaro@gmail.com' 
    AND subscription_tier = 'enterprise';
    
  IF updated_count = 0 THEN
    RAISE WARNING 'Owner account not found or not updated. Email may not match.';
  ELSE
    RAISE NOTICE 'Owner account successfully upgraded to Enterprise tier!';
  END IF;
END $$;

-- Add comment
COMMENT ON COLUMN profiles.subscription_tier IS 'User subscription tier: free (5 credits/month), premium (unlimited), pro (unlimited), enterprise (unlimited + all features)';
