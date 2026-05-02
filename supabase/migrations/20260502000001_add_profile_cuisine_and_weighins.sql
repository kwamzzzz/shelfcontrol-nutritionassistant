-- Add cuisine preferences to profiles and create weigh-ins table.
-- Powers Milestone 1 of Shelf Control: profile personalisation + weight tracking.

-- 1. Cuisine preferences on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cuisine_preferences TEXT[] NOT NULL DEFAULT '{}';

-- 2. WEIGH_INS
CREATE TABLE IF NOT EXISTS public.weigh_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  weight_kg NUMERIC(6,2) NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS weigh_ins_user_recorded_idx
  ON public.weigh_ins (user_id, recorded_at DESC);

ALTER TABLE public.weigh_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own weigh_ins" ON public.weigh_ins
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own weigh_ins" ON public.weigh_ins
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own weigh_ins" ON public.weigh_ins
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own weigh_ins" ON public.weigh_ins
  FOR DELETE USING (auth.uid() = user_id);
