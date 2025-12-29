-- Combine todas as migrations em um único arquivo para executar no Supabase Dashboard
-- Execute este arquivo no SQL Editor do Supabase Dashboard (https://hfswimjhtaiuzrnbobua.supabase.co)

-- ============================================
-- MIGRATION 1: Create Profiles
-- ============================================

-- Tabela de perfis dos usuários
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  avatar_url text,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Policies
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Trigger para criar profile automaticamente após signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8))
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- MIGRATION 2: Update Books
-- ============================================

alter table public.books 
  add column if not exists ai_script_count integer default 0,
  add column if not exists ai_summary_count integer default 0,
  add column if not exists user_notes_updated_at timestamptz;

-- ============================================
-- MIGRATION 3: Create Book Notes
-- ============================================

create table if not exists public.book_notes (
  id uuid default gen_random_uuid() primary key,
  book_id uuid references public.books(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  notes_text text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(book_id, user_id)
);

create index if not exists book_notes_book_id_idx on public.book_notes(book_id);
create index if not exists book_notes_user_id_idx on public.book_notes(user_id);

alter table public.book_notes enable row level security;

create policy "Users can view own book notes"
  on public.book_notes for select
  using (auth.uid() = user_id);

create policy "Users can insert own book notes"
  on public.book_notes for insert
  with check (auth.uid() = user_id);

create policy "Users can update own book notes"
  on public.book_notes for update
  using (auth.uid() = user_id);

create policy "Users can delete own book notes"
  on public.book_notes for delete
  using (auth.uid() = user_id);

create or replace function public.update_book_notes_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  update public.books 
  set user_notes_updated_at = now() 
  where id = new.book_id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_book_notes_timestamp on public.book_notes;
create trigger update_book_notes_timestamp
  before update on public.book_notes
  for each row execute procedure public.update_book_notes_timestamp();

-- ============================================
-- MIGRATION 4: Create AI Outputs
-- ============================================

create table if not exists public.ai_outputs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  book_id uuid references public.books(id) on delete set null,
  type text not null check (type in ('script', 'ideas', 'summary', 'flashcards', 'questions', 'quotes')),
  prompt text not null,
  result text not null,
  duration_estimate text,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create index if not exists ai_outputs_user_id_idx on public.ai_outputs(user_id);
create index if not exists ai_outputs_book_id_idx on public.ai_outputs(book_id);
create index if not exists ai_outputs_type_idx on public.ai_outputs(type);
create index if not exists ai_outputs_created_at_idx on public.ai_outputs(created_at desc);

alter table public.ai_outputs enable row level security;

create policy "Users can view own ai outputs"
  on public.ai_outputs for select
  using (auth.uid() = user_id);

create policy "Users can insert own ai outputs"
  on public.ai_outputs for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own ai outputs"
  on public.ai_outputs for delete
  using (auth.uid() = user_id);

create or replace function public.increment_book_ai_counter()
returns trigger as $$
begin
  if new.book_id is not null then
    if new.type = 'script' then
      update public.books 
      set ai_script_count = ai_script_count + 1 
      where id = new.book_id;
    elsif new.type = 'summary' then
      update public.books 
      set ai_summary_count = ai_summary_count + 1 
      where id = new.book_id;
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists increment_book_ai_counter on public.ai_outputs;
create trigger increment_book_ai_counter
  after insert on public.ai_outputs
  for each row execute procedure public.increment_book_ai_counter();

-- ============================================
-- MIGRATION 5: Create Book Memory
-- ============================================

create table if not exists public.book_memory (
  id uuid default gen_random_uuid() primary key,
  book_id uuid references public.books(id) on delete cascade unique not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  themes jsonb default '[]',
  insights jsonb default '[]',
  angles jsonb default '[]',
  contradictions jsonb default '[]',
  examples jsonb default '[]',
  updated_at timestamptz default now()
);

create index if not exists book_memory_book_id_idx on public.book_memory(book_id);
create index if not exists book_memory_user_id_idx on public.book_memory(user_id);

alter table public.book_memory enable row level security;

create policy "Users can view own book memory"
  on public.book_memory for select
  using (auth.uid() = user_id);

create policy "Users can insert own book memory"
  on public.book_memory for insert
  with check (auth.uid() = user_id);

create policy "Users can update own book memory"
  on public.book_memory for update
  using (auth.uid() = user_id);

create policy "Users can delete own book memory"
  on public.book_memory for delete
  using (auth.uid() = user_id);

create or replace function public.update_book_memory_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_book_memory_timestamp on public.book_memory;
create trigger update_book_memory_timestamp
  before update on public.book_memory
  for each row execute procedure public.update_book_memory_timestamp();

-- ============================================
-- MIGRATION 6: Create User Brain
-- ============================================

create table if not exists public.user_brain (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade unique not null,
  style_preferences jsonb default '{}',
  editorial_pillars jsonb default '[]',
  repetition_guard jsonb default '{"used_hooks": [], "used_angles": [], "last_reset": null}',
  usage_stats jsonb default '{"monthly_generations": 0, "limit": 10, "reset_date": null, "tier": "free"}',
  updated_at timestamptz default now()
);

create index if not exists user_brain_user_id_idx on public.user_brain(user_id);

alter table public.user_brain enable row level security;

create policy "Users can view own brain"
  on public.user_brain for select
  using (auth.uid() = user_id);

create policy "Users can insert own brain"
  on public.user_brain for insert
  with check (auth.uid() = user_id);

create policy "Users can update own brain"
  on public.user_brain for update
  using (auth.uid() = user_id);

create or replace function public.update_user_brain_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_user_brain_timestamp on public.user_brain;
create trigger update_user_brain_timestamp
  before update on public.user_brain
  for each row execute procedure public.update_user_brain_timestamp();

create or replace function public.create_user_brain()
returns trigger as $$
begin
  insert into public.user_brain (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_profile_created on public.profiles;
create trigger on_profile_created
  after insert on public.profiles
  for each row execute procedure public.create_user_brain();

-- ============================================
-- CONCLUÍDO!
-- ============================================
-- Todas as 6 migrations foram aplicadas.
-- Você pode agora usar o BookshelfAI localmente.
