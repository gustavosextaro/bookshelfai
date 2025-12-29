-- Tabela de "cérebro" do usuário (preferências, linha editorial, anti-repetição)
create table if not exists public.user_brain (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade unique not null,
  style_preferences jsonb default '{}',
  editorial_pillars jsonb default '[]',
  repetition_guard jsonb default '{"used_hooks": [], "used_angles": [], "last_reset": null}',
  usage_stats jsonb default '{"monthly_generations": 0, "limit": 10, "reset_date": null, "tier": "free"}',
  updated_at timestamptz default now()
);

-- Índices
create index if not exists user_brain_user_id_idx on public.user_brain(user_id);

-- RLS
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

-- Trigger para atualizar updated_at
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

-- Trigger para criar user_brain automaticamente após criar profile
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

-- Comentários
comment on table public.user_brain is 'Cérebro do usuário: preferências, linha editorial, anti-repetição';
comment on column public.user_brain.style_preferences is 'Preferências de estilo detectadas (tone, depth, format)';
comment on column public.user_brain.editorial_pillars is 'Pilares editoriais sugeridos';
comment on column public.user_brain.repetition_guard is 'Hooks, ângulos e temas já usados para evitar repetição';
comment on column public.user_brain.usage_stats is 'Controle de uso mensal e limites';
