
-- Create storage bucket for item and recipe images
INSERT INTO storage.buckets (id, name, public) VALUES ('item-images', 'item-images', true);

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload item images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'item-images');

-- Allow public read access
CREATE POLICY "Public can view item images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'item-images');

-- Allow users to update their own uploads
CREATE POLICY "Users can update own item images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'item-images');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own item images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'item-images');

-- Add image_url columns
ALTER TABLE public.items ADD COLUMN image_url TEXT DEFAULT NULL;
ALTER TABLE public.recipes ADD COLUMN image_url TEXT DEFAULT NULL;
