-- Create RPC function to get brain stats for the dashboard
create or replace function public.get_brain_stats()
returns json
language plpgsql
security definer
as $$
declare
  result json;
begin
  select json_build_object(
    'booksCount', (select count(*) from public.books where user_id = auth.uid()),
    'scriptsCount', (select count(*) from public.ai_outputs where type = 'script' and user_id = auth.uid()),
    'insightsCount', (select count(*) from public.book_memory where user_id = auth.uid())
  ) into result;
  
  return result;
end;
$$;
