-- Adicionar sistema de créditos mensais para usuários
-- Permite controle de uso de IA no plano gratuito

-- Adicionar colunas na tabela profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS ai_credits_remaining INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS credits_reset_date TIMESTAMP DEFAULT (NOW() + INTERVAL '30 days'),
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';

-- Adicionar índice para melhorar performance de queries de reset
CREATE INDEX IF NOT EXISTS idx_credits_reset_date ON profiles(credits_reset_date WHERE subscription_tier = 'free');

-- Atualizar usuários existentes com créditos iniciais
UPDATE profiles
SET 
  ai_credits_remaining = 10,
  credits_reset_date = (NOW() + INTERVAL '30 days'),
  subscription_tier = 'free'
WHERE ai_credits_remaining IS NULL;

-- Função para resetar créditos mensalmente
CREATE OR REPLACE FUNCTION reset_monthly_credits()
RETURNS TABLE(reset_count INTEGER) AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  -- Resetar créditos apenas para usuários free cuja data expirou
  UPDATE profiles
  SET 
    ai_credits_remaining = 10,
    credits_reset_date = credits_reset_date + INTERVAL '30 days'
  WHERE 
    subscription_tier = 'free'
    AND credits_reset_date <= NOW();
    
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  
  RETURN QUERY SELECT affected_rows;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para decrementar crédito (com validação)
CREATE OR REPLACE FUNCTION decrement_user_credit(user_id UUID)
RETURNS TABLE(
  success BOOLEAN,
  remaining_credits INTEGER,
  error_message TEXT
) AS $$
DECLARE
  current_credits INTEGER;
  user_tier TEXT;
BEGIN
  -- Buscar créditos e tier atuais
  SELECT ai_credits_remaining, subscription_tier
  INTO current_credits, user_tier
  FROM profiles
  WHERE id = user_id;
  
  -- Verificar se usuário existe
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0, 'Usuário não encontrado'::TEXT;
    RETURN;
  END IF;
  
  -- Usuários premium/pro/enterprise têm créditos ilimitados
  IF user_tier != 'free' THEN
    RETURN QUERY SELECT TRUE, 999, NULL::TEXT;
    RETURN;
  END IF;
  
  -- Verificar se tem créditos disponíveis
  IF current_credits <= 0 THEN
    RETURN QUERY SELECT FALSE, 0, 'Sem créditos disponíveis'::TEXT;
    RETURN;
  END IF;
  
  -- Decrementar crédito
  UPDATE profiles
  SET ai_credits_remaining = ai_credits_remaining - 1
  WHERE id = user_id;
  
  -- Retornar sucesso com créditos restantes
  RETURN QUERY 
    SELECT TRUE, (current_credits - 1), NULL::TEXT
    FROM profiles
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários nas colunas
COMMENT ON COLUMN profiles.ai_credits_remaining IS 'Créditos de IA restantes neste ciclo (10 mensagens por mês para plano free)';
COMMENT ON COLUMN profiles.credits_reset_date IS 'Data do próximo reset de créditos (30 dias)';
COMMENT ON COLUMN profiles.subscription_tier IS 'Tier de assinatura: free, premium, pro, enterprise';
