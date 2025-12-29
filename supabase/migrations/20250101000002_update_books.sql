-- Adicionar colunas para rastreamento de uso com IA
alter table public.books 
  add column if not exists ai_script_count integer default 0,
  add column if not exists ai_summary_count integer default 0,
  add column if not exists user_notes_updated_at timestamptz;

-- Comentários
comment on column public.books.ai_script_count is 'Quantidade de roteiros gerados a partir deste livro';
comment on column public.books.ai_summary_count is 'Quantidade de resumos gerados a partir deste livro';
comment on column public.books.user_notes_updated_at is 'Última atualização das notas do usuário sobre o livro';
