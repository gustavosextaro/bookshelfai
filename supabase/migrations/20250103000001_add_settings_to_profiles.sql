-- Add settings JSONB column to profiles table
-- This column stores user preferences including:
-- - favorites: array of book IDs
-- - last_reset_at: timestamp for stats reset
-- - openai_api_key: encrypted API key (if needed)

alter table public.profiles 
add column if not exists settings jsonb default '{}'::jsonb;

-- Add comment
comment on column public.profiles.settings is 'User settings and preferences stored as JSONB';

-- Index for faster JSON queries (optional but recommended)
create index if not exists profiles_settings_idx 
on public.profiles using gin(settings);
