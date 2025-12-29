# Supabase (BookshelfAI)

## Frontend

Este projeto usa Supabase Auth no frontend via variáveis `VITE_*`.

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Backend (Edge Functions)

As Edge Functions usam **secrets** configurados no Supabase (NUNCA no frontend):

- `SUPABASE_SERVICE_ROLE_KEY`
- `AI_KEY_ENCRYPTION_SECRET`

A `service role key` não deve ser commitada.
