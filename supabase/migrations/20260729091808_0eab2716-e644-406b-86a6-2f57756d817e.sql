DROP POLICY IF EXISTS "Users can read own item images" ON storage.objects;

CREATE POLICY "Signed-in users can read item images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'item-images');