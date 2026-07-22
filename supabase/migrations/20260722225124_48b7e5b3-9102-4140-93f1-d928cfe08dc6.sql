-- 1) group_members: force role='member' on self-service invite acceptance
DROP POLICY IF EXISTS "Invited users can join group" ON public.group_members;
CREATE POLICY "Invited users can join group"
ON public.group_members
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND role = 'member'
  AND EXISTS (
    SELECT 1 FROM public.group_invites
    WHERE group_invites.group_id = group_members.group_id
      AND group_invites.status = 'pending'
      AND group_invites.expires_at > now()
  )
);

-- 2) storage.objects: restrict item-images uploads to the uploader's own path/owner
DROP POLICY IF EXISTS "Authenticated users can upload item images" ON storage.objects;
CREATE POLICY "Authenticated users can upload item images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'item-images'
  AND owner = auth.uid()
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3) profiles: allow users to create only their own profile row
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);