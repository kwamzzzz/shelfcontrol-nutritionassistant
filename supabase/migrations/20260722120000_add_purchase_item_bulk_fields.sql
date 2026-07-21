-- Bulk purchase entry: capture a second measure (weight + weight unit) and
-- per-item notes/annotations on each purchase line item. All additive + nullable,
-- so existing rows and the existing add-purchase flow are unaffected.
ALTER TABLE public.purchase_items
  ADD COLUMN IF NOT EXISTS weight numeric,
  ADD COLUMN IF NOT EXISTS weight_unit text,
  ADD COLUMN IF NOT EXISTS notes text;
