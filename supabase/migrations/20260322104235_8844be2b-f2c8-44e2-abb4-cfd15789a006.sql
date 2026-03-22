
-- New tables
CREATE TABLE public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Security definer for membership checks
CREATE OR REPLACE FUNCTION public.is_group_member(_user_id uuid, _group_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.group_members WHERE user_id = _user_id AND group_id = _group_id);
$$;

-- RLS for groups
CREATE POLICY "Members can view groups" ON public.groups FOR SELECT TO authenticated
  USING (public.is_group_member(auth.uid(), id));
CREATE POLICY "Creator can update group" ON public.groups FOR UPDATE TO authenticated
  USING (created_by = auth.uid());
CREATE POLICY "Creator can delete group" ON public.groups FOR DELETE TO authenticated
  USING (created_by = auth.uid());
CREATE POLICY "Authenticated can create groups" ON public.groups FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- RLS for group_members
CREATE POLICY "Members can view memberships" ON public.group_members FOR SELECT TO authenticated
  USING (public.is_group_member(auth.uid(), group_id));
CREATE POLICY "Group creator can manage members" ON public.group_members FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.groups WHERE id = group_id AND created_by = auth.uid()));
CREATE POLICY "Members can leave" ON public.group_members FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Add nullable group_id with FK constraints to existing tables
ALTER TABLE public.inventory ADD COLUMN group_id uuid REFERENCES public.groups(id) ON DELETE SET NULL;
ALTER TABLE public.purchases ADD COLUMN group_id uuid REFERENCES public.groups(id) ON DELETE SET NULL;
ALTER TABLE public.shopping_list ADD COLUMN group_id uuid REFERENCES public.groups(id) ON DELETE SET NULL;
ALTER TABLE public.consumption_logs ADD COLUMN group_id uuid REFERENCES public.groups(id) ON DELETE SET NULL;
ALTER TABLE public.waste_logs ADD COLUMN group_id uuid REFERENCES public.groups(id) ON DELETE SET NULL;
