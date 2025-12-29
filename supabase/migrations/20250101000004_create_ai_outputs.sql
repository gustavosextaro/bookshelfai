-- Tabela de outputs gerados pela IA
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

-- Índices
create index if not exists ai_outputs_user_id_idx on public.ai_outputs(user_id);
create index if not exists ai_outputs_book_id_idx on public.ai_outputs(book_id);
create index if not exists ai_outputs_type_idx on public.ai_outputs(type);
create index if not exists ai_outputs_created_at_idx on public.ai_outputs(created_at desc);

-- RLS
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

-- Trigger para incrementar contadores nos livros
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

-- Comentários
comment on table public.ai_outputs is 'Conteúdos gerados pela IA (roteiros, resumos, etc)';
comment on column public.ai_outputs.metadata is 'JSON com books_used, tone, themes, etc';
