-- Tabela de memória/conhecimento extraído de cada livro
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

-- Índices
create index if not exists book_memory_book_id_idx on public.book_memory(book_id);
create index if not exists book_memory_user_id_idx on public.book_memory(user_id);

-- RLS
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

-- Trigger para atualizar updated_at
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

-- Comentários
comment on table public.book_memory is 'Memória estruturada de cada livro (temas, insights, ângulos)';
comment on column public.book_memory.themes is 'Array de temas centrais do livro';
comment on column public.book_memory.insights is 'Array de ideias principais';
comment on column public.book_memory.angles is 'Array de ângulos prontos para conteúdo';
comment on column public.book_memory.contradictions is 'Ideias que este livro contraria';
comment on column public.book_memory.examples is 'Exemplos práticos e analogias';
