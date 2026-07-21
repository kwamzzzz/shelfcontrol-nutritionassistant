
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.is_group_member(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.group_members WHERE user_id = _user_id AND group_id = _group_id);
$$;

REVOKE ALL ON FUNCTION private.is_group_member(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_group_member(uuid, uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Anyone can read invite by token" ON public.group_invites;

DO $$
DECLARE r record;
  new_qual text;
  new_check text;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        (qual LIKE '%is_group_member(%' AND qual NOT LIKE '%private.is_group_member%')
        OR (with_check LIKE '%is_group_member(%' AND with_check NOT LIKE '%private.is_group_member%')
      )
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    new_qual := regexp_replace(coalesce(r.qual,''), '(^|[^.])is_group_member\(', '\1private.is_group_member(', 'g');
    new_check := regexp_replace(coalesce(r.with_check,''), '(^|[^.])is_group_member\(', '\1private.is_group_member(', 'g');
    IF r.cmd = 'SELECT' THEN
      EXECUTE format('CREATE POLICY %I ON %I.%I FOR SELECT USING (%s)', r.policyname, r.schemaname, r.tablename, new_qual);
    ELSIF r.cmd = 'INSERT' THEN
      EXECUTE format('CREATE POLICY %I ON %I.%I FOR INSERT WITH CHECK (%s)', r.policyname, r.schemaname, r.tablename, new_check);
    ELSIF r.cmd = 'UPDATE' THEN
      EXECUTE format('CREATE POLICY %I ON %I.%I FOR UPDATE USING (%s)%s', r.policyname, r.schemaname, r.tablename, new_qual,
        CASE WHEN r.with_check IS NOT NULL AND r.with_check <> '' THEN ' WITH CHECK ('||new_check||')' ELSE '' END);
    ELSIF r.cmd = 'DELETE' THEN
      EXECUTE format('CREATE POLICY %I ON %I.%I FOR DELETE USING (%s)', r.policyname, r.schemaname, r.tablename, new_qual);
    ELSE
      EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (%s)%s', r.policyname, r.schemaname, r.tablename, new_qual,
        CASE WHEN r.with_check IS NOT NULL AND r.with_check <> '' THEN ' WITH CHECK ('||new_check||')' ELSE '' END);
    END IF;
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS public.is_group_member(uuid, uuid);

DROP POLICY IF EXISTS "Public can view item images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own item images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own item images" ON storage.objects;

CREATE POLICY "Users can update own item images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'item-images' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'item-images' AND owner = auth.uid());

CREATE POLICY "Users can delete own item images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'item-images' AND owner = auth.uid());
