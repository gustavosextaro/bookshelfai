-- Execute this SQL in Supabase (SQL Editor) or via migrations with Supabase CLI.

create table if not exists public.user_ai_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  provider text not null check (provider in ('openai', 'gemini')),
  api_key_encrypted text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_ai_usage (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null check (plan in ('free', 'pro', 'creator')),
  monthly_limit int not null,
  usage_current int not null default 0,
  reset_date date not null
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_ai_settings_updated_at on public.user_ai_settings;
create trigger trg_user_ai_settings_updated_at
before update on public.user_ai_settings
for each row
execute function public.set_updated_at();

alter table public.user_ai_settings enable row level security;
alter table public.user_ai_usage enable row level security;

-- Policies for user_ai_settings
drop policy if exists "user_ai_settings_select_own" on public.user_ai_settings;
create policy "user_ai_settings_select_own" on public.user_ai_settings for select using (auth.uid() = user_id);

drop policy if exists "user_ai_settings_insert_own" on public.user_ai_settings;
create policy "user_ai_settings_insert_own" on public.user_ai_settings for insert with check (auth.uid() = user_id);

drop policy if exists "user_ai_settings_update_own" on public.user_ai_settings;
create policy "user_ai_settings_update_own" on public.user_ai_settings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "user_ai_settings_delete_own" on public.user_ai_settings;
create policy "user_ai_settings_delete_own" on public.user_ai_settings for delete using (auth.uid() = user_id);

-- Policies for user_ai_usage
drop policy if exists "user_ai_usage_select_own" on public.user_ai_usage;
create policy "user_ai_usage_select_own" on public.user_ai_usage for select using (auth.uid() = user_id);
-- Usage is typically updated by system/edges, but for now we might need read access.
-- Insert/Update should ideally be service-role only or strictly controlled.
