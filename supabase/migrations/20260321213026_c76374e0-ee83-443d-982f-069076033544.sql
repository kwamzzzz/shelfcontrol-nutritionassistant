
-- waste_logs table
CREATE TABLE public.waste_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  item_id UUID REFERENCES public.items(id) ON DELETE CASCADE NOT NULL,
  inventory_id UUID REFERENCES public.inventory(id) ON DELETE SET NULL,
  purchase_id UUID REFERENCES public.purchases(id) ON DELETE SET NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'unit',
  discarded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reason TEXT,
  note TEXT
);

ALTER TABLE public.waste_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own waste_logs" ON public.waste_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own waste_logs" ON public.waste_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own waste_logs" ON public.waste_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own waste_logs" ON public.waste_logs FOR DELETE USING (auth.uid() = user_id);

-- Add new fields to items
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS fiber_g NUMERIC DEFAULT 0;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS sugar_g NUMERIC DEFAULT 0;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS sodium_mg NUMERIC DEFAULT 0;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS serving_size TEXT;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS nutrition_basis TEXT DEFAULT 'per_unit';

-- Add sealed_status and opened_date to inventory
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS sealed_status TEXT DEFAULT 'sealed';
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS opened_date DATE;

-- Add unit, meal_type, note to consumption_logs
ALTER TABLE public.consumption_logs ADD COLUMN IF NOT EXISTS unit TEXT;
ALTER TABLE public.consumption_logs ADD COLUMN IF NOT EXISTS meal_type TEXT;
ALTER TABLE public.consumption_logs ADD COLUMN IF NOT EXISTS note TEXT;
