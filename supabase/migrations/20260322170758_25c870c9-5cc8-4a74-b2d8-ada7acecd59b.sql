
-- Insight state tracking
CREATE TABLE public.insight_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  group_id uuid REFERENCES public.groups(id) ON DELETE SET NULL,
  insight_id text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  UNIQUE(user_id, insight_id, group_id)
);
ALTER TABLE public.insight_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own insight state" ON public.insight_state
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own insight state" ON public.insight_state
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own insight state" ON public.insight_state
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- User action tracking
CREATE TABLE public.insight_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  insight_id text NOT NULL,
  action_taken text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.insight_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own actions" ON public.insight_actions
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own actions" ON public.insight_actions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
