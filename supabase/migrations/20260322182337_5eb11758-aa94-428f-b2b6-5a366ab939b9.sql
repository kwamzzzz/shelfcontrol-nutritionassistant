
-- Water tracking logs
CREATE TABLE public.water_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount_ml INTEGER NOT NULL DEFAULT 250,
  logged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE
);

ALTER TABLE public.water_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own water logs" ON public.water_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can view own water logs" ON public.water_logs FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own water logs" ON public.water_logs FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Nutrition goals
CREATE TABLE public.nutrition_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  calorie_goal INTEGER NOT NULL DEFAULT 2000,
  protein_goal INTEGER NOT NULL DEFAULT 50,
  carbs_goal INTEGER NOT NULL DEFAULT 250,
  fat_goal INTEGER NOT NULL DEFAULT 65,
  water_goal_ml INTEGER NOT NULL DEFAULT 2000,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.nutrition_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own goals" ON public.nutrition_goals FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can view own goals" ON public.nutrition_goals FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can update own goals" ON public.nutrition_goals FOR UPDATE TO authenticated USING (user_id = auth.uid());
