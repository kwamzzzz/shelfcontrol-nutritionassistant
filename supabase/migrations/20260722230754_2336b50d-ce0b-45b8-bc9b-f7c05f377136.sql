DROP POLICY IF EXISTS "Public can view item images" ON storage.objects;
CREATE POLICY "Public can view item images"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'item-images');