-- Create books table
create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade not null,
  title text not null,
  authors text[] default '{}',
  pages int,
  status text check (status in ('read', 'reading', 'want_to_read')) default 'read',
  read_date date,
  cover_url text,
  description text,
  categories text[] default '{}',
  google_books_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS
alter table public.books enable row level security;

-- Policies
drop policy if exists "books_select_own" on public.books;
create policy "books_select_own" on public.books for select using (auth.uid() = user_id);

drop policy if exists "books_insert_own" on public.books;
create policy "books_insert_own" on public.books for insert with check (auth.uid() = user_id);

drop policy if exists "books_update_own" on public.books;
create policy "books_update_own" on public.books for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "books_delete_own" on public.books;
create policy "books_delete_own" on public.books for delete using (auth.uid() = user_id);

-- Trigger for updated_at
drop trigger if exists trg_books_updated_at on public.books;
create trigger trg_books_updated_at
before update on public.books
for each row
execute function public.set_updated_at();
