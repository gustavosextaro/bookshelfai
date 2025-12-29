-- Add published_date and language fields to books table
ALTER TABLE public.books
ADD COLUMN IF NOT EXISTS published_date TEXT,
ADD COLUMN IF NOT EXISTS language TEXT;
