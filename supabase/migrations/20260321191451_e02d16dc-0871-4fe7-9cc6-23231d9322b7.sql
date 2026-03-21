
-- Add expiry/sealed fields to purchase_items for tracking at purchase time
ALTER TABLE public.purchase_items ADD COLUMN IF NOT EXISTS expiry_date date;
ALTER TABLE public.purchase_items ADD COLUMN IF NOT EXISTS sealed_status text DEFAULT 'sealed';
ALTER TABLE public.purchase_items ADD COLUMN IF NOT EXISTS opened_date date;

-- Add brand to items for future richer item records
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS brand text;
