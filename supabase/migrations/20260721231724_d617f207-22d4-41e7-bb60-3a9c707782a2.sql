ALTER TABLE public.purchase_items
  ADD COLUMN IF NOT EXISTS weight numeric,
  ADD COLUMN IF NOT EXISTS weight_unit text,
  ADD COLUMN IF NOT EXISTS notes text;

NOTIFY pgrst, 'reload schema';