ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS calories_per_serving numeric,
  ADD COLUMN IF NOT EXISTS protein_g_per_serving numeric,
  ADD COLUMN IF NOT EXISTS carbs_g_per_serving numeric,
  ADD COLUMN IF NOT EXISTS fat_g_per_serving numeric,
  ADD COLUMN IF NOT EXISTS fiber_g_per_serving numeric,
  ADD COLUMN IF NOT EXISTS sugar_g_per_serving numeric,
  ADD COLUMN IF NOT EXISTS sodium_mg_per_serving numeric,
  ADD COLUMN IF NOT EXISTS nutrition_calculated_at timestamptz,
  ADD COLUMN IF NOT EXISTS nutrition_notes text;