ALTER TABLE public.shopping_list
  ADD COLUMN IF NOT EXISTS in_cart boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cart_added_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS shopping_list_in_cart_idx ON public.shopping_list (in_cart) WHERE in_cart;