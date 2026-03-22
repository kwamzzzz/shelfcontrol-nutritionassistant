
-- Allow users with a valid pending invite to join a group
CREATE POLICY "Invited users can join group"
  ON public.group_members FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.group_invites
      WHERE group_id = group_members.group_id
        AND status = 'pending'
        AND expires_at > now()
    )
  );
