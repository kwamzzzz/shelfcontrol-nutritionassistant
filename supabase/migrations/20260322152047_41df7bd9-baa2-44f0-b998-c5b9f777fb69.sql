
-- Allow users to see invites addressed to their own email
CREATE POLICY "Users can see invites for their email"
  ON public.group_invites FOR SELECT TO authenticated
  USING (email = (SELECT auth.jwt()->>'email'));

-- Allow invited users to update invite status (accept/decline)
CREATE POLICY "Invited users can update their invites"
  ON public.group_invites FOR UPDATE TO authenticated
  USING (email = (SELECT auth.jwt()->>'email'));
