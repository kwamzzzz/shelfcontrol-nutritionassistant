
-- Add cuisine_preferences to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cuisine_preferences text[] DEFAULT '{}'::text[];

-- Symptoms table
CREATE TABLE IF NOT EXISTS public.symptoms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  mood smallint,
  energy smallint,
  digestion smallint,
  notes text,
  consumption_id uuid,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.symptoms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own symptoms" ON public.symptoms FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own symptoms" ON public.symptoms FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own symptoms" ON public.symptoms FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users delete own symptoms" ON public.symptoms FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Weigh-ins table
CREATE TABLE IF NOT EXISTS public.weigh_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  weight_kg numeric NOT NULL,
  note text,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.weigh_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own weigh_ins" ON public.weigh_ins FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own weigh_ins" ON public.weigh_ins FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own weigh_ins" ON public.weigh_ins FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users delete own weigh_ins" ON public.weigh_ins FOR DELETE TO authenticated USING (user_id = auth.uid());
