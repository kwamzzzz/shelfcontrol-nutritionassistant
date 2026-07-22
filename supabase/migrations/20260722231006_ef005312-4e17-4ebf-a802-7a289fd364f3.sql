
-- 1. Fix group_members join policy to require matching invite email
DROP POLICY IF EXISTS "Invited users can join group" ON public.group_members;
CREATE POLICY "Invited users can join group"
ON public.group_members
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND role = 'member'
  AND EXISTS (
    SELECT 1 FROM public.group_invites gi
    WHERE gi.group_id = group_members.group_id
      AND gi.status = 'pending'
      AND gi.expires_at > now()
      AND gi.email = (SELECT auth.jwt() ->> 'email')
  )
);

-- 2. Restrict invite visibility - remove blanket member access
DROP POLICY IF EXISTS "Members can view group invites" ON public.group_invites;

CREATE POLICY "Inviter can view own invites"
ON public.group_invites
FOR SELECT
TO authenticated
USING (invited_by = auth.uid());

-- (The existing "Users can see invites for their email" policy already covers invitees.)

-- 3. Remove broad SELECT policy on item-images bucket to prevent listing.
-- Public bucket still serves individual object URLs without a policy.
DROP POLICY IF EXISTS "Public can view item images" ON storage.objects;
