-- Tabela de notas do usuário sobre livros
create table if not exists public.book_notes (
  id uuid default gen_random_uuid() primary key,
  book_id uuid references public.books(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  notes_text text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Índices
create index if not exists book_notes_book_id_idx on public.book_notes(book_id);
create index if not exists book_notes_user_id_idx on public.book_notes(user_id);

-- RLS
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

-- Trigger para atualizar updated_at
create or replace function public.update_book_notes_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  -- Também atualiza o timestamp na tabela books
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

-- Comentários
comment on table public.book_notes is 'Notas e highlights do usuário sobre cada livro';
