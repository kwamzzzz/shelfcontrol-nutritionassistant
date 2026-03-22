
-- Add completion tracking to shopping_list
ALTER TABLE public.shopping_list ADD COLUMN IF NOT EXISTS completed_by uuid;
ALTER TABLE public.shopping_list ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Update RLS for shopping_list to support group collaboration
-- Drop old user-only policies
DROP POLICY IF EXISTS "Users can view own shopping_list" ON public.shopping_list;
DROP POLICY IF EXISTS "Users can insert own shopping_list" ON public.shopping_list;
DROP POLICY IF EXISTS "Users can update own shopping_list" ON public.shopping_list;
DROP POLICY IF EXISTS "Users can delete own shopping_list" ON public.shopping_list;

-- New group-aware policies
CREATE POLICY "View shopping list" ON public.shopping_list FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (group_id IS NOT NULL AND public.is_group_member(auth.uid(), group_id)));

CREATE POLICY "Insert shopping list" ON public.shopping_list FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Update shopping list" ON public.shopping_list FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR (group_id IS NOT NULL AND public.is_group_member(auth.uid(), group_id)));

CREATE POLICY "Delete shopping list" ON public.shopping_list FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR (group_id IS NOT NULL AND public.is_group_member(auth.uid(), group_id)));

-- Update RLS for inventory to support group collaboration
DROP POLICY IF EXISTS "Users can view own inventory" ON public.inventory;
DROP POLICY IF EXISTS "Users can insert own inventory" ON public.inventory;
DROP POLICY IF EXISTS "Users can update own inventory" ON public.inventory;
DROP POLICY IF EXISTS "Users can delete own inventory" ON public.inventory;

CREATE POLICY "View inventory" ON public.inventory FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (group_id IS NOT NULL AND public.is_group_member(auth.uid(), group_id)));

CREATE POLICY "Insert inventory" ON public.inventory FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Update inventory" ON public.inventory FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR (group_id IS NOT NULL AND public.is_group_member(auth.uid(), group_id)));

CREATE POLICY "Delete inventory" ON public.inventory FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR (group_id IS NOT NULL AND public.is_group_member(auth.uid(), group_id)));

-- Update RLS for purchases to support group collaboration
DROP POLICY IF EXISTS "Users can view own purchases" ON public.purchases;
DROP POLICY IF EXISTS "Users can insert own purchases" ON public.purchases;
DROP POLICY IF EXISTS "Users can update own purchases" ON public.purchases;
DROP POLICY IF EXISTS "Users can delete own purchases" ON public.purchases;

CREATE POLICY "View purchases" ON public.purchases FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (group_id IS NOT NULL AND public.is_group_member(auth.uid(), group_id)));

CREATE POLICY "Insert purchases" ON public.purchases FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Update purchases" ON public.purchases FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR (group_id IS NOT NULL AND public.is_group_member(auth.uid(), group_id)));

CREATE POLICY "Delete purchases" ON public.purchases FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR (group_id IS NOT NULL AND public.is_group_member(auth.uid(), group_id)));

-- Update RLS for consumption_logs to support group collaboration
DROP POLICY IF EXISTS "Users can view own consumption_logs" ON public.consumption_logs;
DROP POLICY IF EXISTS "Users can insert own consumption_logs" ON public.consumption_logs;
DROP POLICY IF EXISTS "Users can update own consumption_logs" ON public.consumption_logs;
DROP POLICY IF EXISTS "Users can delete own consumption_logs" ON public.consumption_logs;

CREATE POLICY "View consumption logs" ON public.consumption_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (group_id IS NOT NULL AND public.is_group_member(auth.uid(), group_id)));

CREATE POLICY "Insert consumption logs" ON public.consumption_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Update consumption logs" ON public.consumption_logs FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR (group_id IS NOT NULL AND public.is_group_member(auth.uid(), group_id)));

CREATE POLICY "Delete consumption logs" ON public.consumption_logs FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR (group_id IS NOT NULL AND public.is_group_member(auth.uid(), group_id)));

-- Update RLS for waste_logs to support group collaboration
DROP POLICY IF EXISTS "Users can view own waste_logs" ON public.waste_logs;
DROP POLICY IF EXISTS "Users can insert own waste_logs" ON public.waste_logs;
DROP POLICY IF EXISTS "Users can update own waste_logs" ON public.waste_logs;
DROP POLICY IF EXISTS "Users can delete own waste_logs" ON public.waste_logs;

CREATE POLICY "View waste logs" ON public.waste_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (group_id IS NOT NULL AND public.is_group_member(auth.uid(), group_id)));

CREATE POLICY "Insert waste logs" ON public.waste_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Update waste logs" ON public.waste_logs FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR (group_id IS NOT NULL AND public.is_group_member(auth.uid(), group_id)));

CREATE POLICY "Delete waste logs" ON public.waste_logs FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR (group_id IS NOT NULL AND public.is_group_member(auth.uid(), group_id)));

-- Update RLS for purchase_items to support group collaboration
DROP POLICY IF EXISTS "Users can view own purchase_items" ON public.purchase_items;
DROP POLICY IF EXISTS "Users can insert own purchase_items" ON public.purchase_items;
DROP POLICY IF EXISTS "Users can update own purchase_items" ON public.purchase_items;
DROP POLICY IF EXISTS "Users can delete own purchase_items" ON public.purchase_items;

CREATE POLICY "View purchase items" ON public.purchase_items FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (EXISTS (
    SELECT 1 FROM public.purchases p
    WHERE p.id = purchase_items.purchase_id
    AND p.group_id IS NOT NULL
    AND public.is_group_member(auth.uid(), p.group_id)
  )));

CREATE POLICY "Insert purchase items" ON public.purchase_items FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Update purchase items" ON public.purchase_items FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR (EXISTS (
    SELECT 1 FROM public.purchases p
    WHERE p.id = purchase_items.purchase_id
    AND p.group_id IS NOT NULL
    AND public.is_group_member(auth.uid(), p.group_id)
  )));

CREATE POLICY "Delete purchase items" ON public.purchase_items FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR (EXISTS (
    SELECT 1 FROM public.purchases p
    WHERE p.id = purchase_items.purchase_id
    AND p.group_id IS NOT NULL
    AND public.is_group_member(auth.uid(), p.group_id)
  )));

-- Update RLS for items so group members can see items used in shared contexts
DROP POLICY IF EXISTS "Users can view own items" ON public.items;
CREATE POLICY "View items" ON public.items FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (EXISTS (
    SELECT 1 FROM public.inventory inv
    WHERE inv.item_id = items.id
    AND inv.group_id IS NOT NULL
    AND public.is_group_member(auth.uid(), inv.group_id)
  )) OR (EXISTS (
    SELECT 1 FROM public.shopping_list sl
    WHERE sl.item_id = items.id
    AND sl.group_id IS NOT NULL
    AND public.is_group_member(auth.uid(), sl.group_id)
  )));
