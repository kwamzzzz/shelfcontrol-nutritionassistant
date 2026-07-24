DROP POLICY IF EXISTS "Public read access to item-images" ON storage.objects;
CREATE POLICY "Public read access to item-images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'item-images');