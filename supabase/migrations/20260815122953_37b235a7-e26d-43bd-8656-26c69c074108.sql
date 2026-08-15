ALTER TABLE public.shopping_list ADD COLUMN IF NOT EXISTS notes text;

-- Update RLS to allow authenticated users to update notes on their own items
CREATE POLICY "Users can update own shopping list notes"
ON public.shopping_list
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);