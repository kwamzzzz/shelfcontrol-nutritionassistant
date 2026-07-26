
-- 1. Revoke EXECUTE on SECURITY DEFINER functions from anon/authenticated
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_community_price_observations(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_community_price_observations(text, text) TO authenticated;

-- 2. Ownership-scoped SELECT policy on item-images storage objects
DROP POLICY IF EXISTS "Users can read own item images" ON storage.objects;
CREATE POLICY "Users can read own item images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'item-images'
  AND owner = auth.uid()
);
