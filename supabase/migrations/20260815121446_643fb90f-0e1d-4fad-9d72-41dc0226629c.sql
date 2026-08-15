ALTER TABLE public.shopping_list ADD COLUMN IF NOT EXISTS basket text;
CREATE INDEX IF NOT EXISTS shopping_list_basket_idx ON public.shopping_list (basket);