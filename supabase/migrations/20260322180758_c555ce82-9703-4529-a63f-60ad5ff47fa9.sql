
-- Challenges table
CREATE TABLE public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  title text NOT NULL,
  type text NOT NULL,
  description text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'upcoming',
  target_value numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view group challenges" ON public.challenges
  FOR SELECT TO authenticated
  USING (is_group_member(auth.uid(), group_id));

CREATE POLICY "Members can create challenges" ON public.challenges
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND is_group_member(auth.uid(), group_id));

CREATE POLICY "Creator can update challenge" ON public.challenges
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Creator can delete challenge" ON public.challenges
  FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- Challenge participants table
CREATE TABLE public.challenge_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);

ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view participants" ON public.challenge_participants
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.challenges c
    WHERE c.id = challenge_id AND is_group_member(auth.uid(), c.group_id)
  ));

CREATE POLICY "Users can join challenges" ON public.challenge_participants
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.challenges c
    WHERE c.id = challenge_id AND is_group_member(auth.uid(), c.group_id)
  ));

CREATE POLICY "Users can leave challenges" ON public.challenge_participants
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
