-- Fix para criar profile e user_brain para usuário existente
-- Execute este SQL no Supabase Dashboard

-- 1. Buscar o ID do usuário existente
-- SELECT id FROM auth.users WHERE email = 'gustavosextaro@gmail.com';

-- 2. Criar profile manualmente (substitua o UUID abaixo pelo ID real do usuário)
-- Você pode obter o UUID executando a query acima ou verificando no Supabase Dashboard > Authentication > Users

-- EXEMPLO (SUBSTITUA O UUID):
-- INSERT INTO public.profiles (id, username, avatar_url)
-- VALUES (
--   '7b41xxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', -- Substitua pelo ID real
--   'Gustavo Sextaro',
--   NULL
-- )
-- ON CONFLICT (id) DO UPDATE
-- SET username = EXCLUDED.username;

-- 3. O trigger create_user_brain() irá criar automaticamente o user_brain
-- quando o profile for criado

-- ALTERNATIVA MAIS SIMPLES:
-- Para criar profiles para TODOS os usuários existentes que ainda não têm:

INSERT INTO public.profiles (id, username)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'username', 'Usuário ' || substr(id::text, 1, 8))
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- Isso vai criar automaticamente os user_brains via trigger
