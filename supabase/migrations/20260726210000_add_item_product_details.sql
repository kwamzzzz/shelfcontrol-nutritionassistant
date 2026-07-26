-- Product-level facts belong to the catalogue item and follow every pantry batch.
-- Batch-specific storage, opened state and expiry remain on public.inventory.
ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS country_of_origin text,
  ADD COLUMN IF NOT EXISTS additional_info text;

