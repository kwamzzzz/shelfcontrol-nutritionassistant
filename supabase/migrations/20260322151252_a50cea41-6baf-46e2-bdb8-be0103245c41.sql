
-- Group invites table
CREATE TABLE public.group_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  email text NOT NULL,
  invited_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  invite_token uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  UNIQUE(invite_token)
);

ALTER TABLE public.group_invites ENABLE ROW LEVEL SECURITY;

-- Group members can view invites for their groups
CREATE POLICY "Members can view group invites"
  ON public.group_invites FOR SELECT TO authenticated
  USING (public.is_group_member(auth.uid(), group_id));

-- Group creator/admin can create invites
CREATE POLICY "Group admins can create invites"
  ON public.group_invites FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = group_invites.group_id
        AND user_id = auth.uid()
        AND role IN ('admin', 'owner')
    )
  );

-- Inviter can update (revoke) their own invites
CREATE POLICY "Inviter can update own invites"
  ON public.group_invites FOR UPDATE TO authenticated
  USING (invited_by = auth.uid());

-- Inviter can delete own invites
CREATE POLICY "Inviter can delete own invites"
  ON public.group_invites FOR DELETE TO authenticated
  USING (invited_by = auth.uid());

-- Anyone authenticated can read an invite by token (for acceptance page)
CREATE POLICY "Anyone can read invite by token"
  ON public.group_invites FOR SELECT TO authenticated
  USING (true);
