-- Create user_profiles table
create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  display_name text,
  photo_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create ai_generation_log table
create table if not exists public.ai_generation_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  book_id uuid references public.books(id) on delete cascade not null,
  content_type text not null,
  created_at timestamptz default now()
);

-- Create indexes
create index if not exists idx_user_profiles_user_id on public.user_profiles(user_id);
create index if not exists idx_ai_generation_log_user_id on public.ai_generation_log(user_id);
create index if not exists idx_ai_generation_log_book_id on public.ai_generation_log(book_id);

-- Enable RLS
alter table public.user_profiles enable row level security;
alter table public.ai_generation_log enable row level security;

-- RLS Policies for user_profiles
create policy "Users can view their own profile"
  on public.user_profiles for select
  using (auth.uid() = user_id);

create policy "Users can insert their own profile"
  on public.user_profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own profile"
  on public.user_profiles for update
  using (auth.uid() = user_id);

-- RLS Policies for ai_generation_log
create policy "Users can view their own AI logs"
  on public.ai_generation_log for select
  using (auth.uid() = user_id);

create policy "Users can insert their own AI logs"
  on public.ai_generation_log for insert
  with check (auth.uid() = user_id);

-- Create view for user stats
create or replace view public.user_stats as
select
  u.id as user_id,
  count(distinct b.id) as total_books,
  count(distinct l.id) as total_ai_generations,
  count(distinct l.id)::float / nullif(count(distinct b.id), 0) as avg_content_per_book
from auth.users u
left join public.books b on b.user_id = u.id
left join public.ai_generation_log l on l.user_id = u.id
group by u.id;

-- Create view for book usage stats
create or replace view public.book_usage_stats as
select
  b.id as book_id,
  b.user_id,
  b.title,
  count(l.id) as ai_generation_count,
  max(l.created_at) as last_ai_use
from public.books b
left join public.ai_generation_log l on l.book_id = b.id
group by b.id, b.user_id, b.title;
