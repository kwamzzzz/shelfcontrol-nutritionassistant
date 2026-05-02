-- Symptoms log: how the user feels after meals/days. Feeds the AI coach context.

CREATE TABLE IF NOT EXISTS public.symptoms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  mood SMALLINT CHECK (mood IS NULL OR (mood BETWEEN 1 AND 5)),
  energy SMALLINT CHECK (energy IS NULL OR (energy BETWEEN 1 AND 5)),
  digestion SMALLINT CHECK (digestion IS NULL OR (digestion BETWEEN 1 AND 5)),
  notes TEXT,
  consumption_id UUID REFERENCES public.consumption_logs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS symptoms_user_recorded_idx
  ON public.symptoms (user_id, recorded_at DESC);

ALTER TABLE public.symptoms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own symptoms" ON public.symptoms
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own symptoms" ON public.symptoms
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own symptoms" ON public.symptoms
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own symptoms" ON public.symptoms
  FOR DELETE USING (auth.uid() = user_id);
