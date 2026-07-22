ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}'::text[];
CREATE INDEX IF NOT EXISTS recipes_tags_gin_idx ON public.recipes USING GIN (tags);