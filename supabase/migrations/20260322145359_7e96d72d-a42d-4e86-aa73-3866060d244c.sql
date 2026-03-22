
DROP POLICY IF EXISTS "Members can view groups" ON public.groups;

CREATE POLICY "Members can view groups" ON public.groups
  FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR is_group_member(auth.uid(), id));
