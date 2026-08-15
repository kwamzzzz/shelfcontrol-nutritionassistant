ALTER TABLE public.shopping_list
  ADD COLUMN IF NOT EXISTS recipe_id uuid REFERENCES public.recipes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS shopping_list_recipe_id_idx ON public.shopping_list (recipe_id);