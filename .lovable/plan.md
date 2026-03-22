

# Group System & Sidebar Restructure (Revised)

## Adjustments Incorporated

1. **FK constraints**: All `group_id` columns get proper `REFERENCES groups(id) ON DELETE SET NULL` — nullable but referentially enforced.
2. **Recipes stays in sidebar**: Kept under MAIN section.
3. **LocalStorage persistence**: Group context reads/writes `localStorage` so selection survives refresh.
4. **Future-ready personal mode**: `GroupContext` uses `activeGroupId: string | null` with a helper `isPersonalMode`. Code structured so a future migration to a "private group" row is a single-point change in the context provider.

## Schema Migration

```sql
-- New tables
CREATE TABLE public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text, -- household, couple, roommates, fitness, other
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

-- RLS for groups: members can read, creator can update/delete
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
```

## Files to Create/Change

| File | Change |
|---|---|
| `src/contexts/GroupContext.tsx` | **New** — `activeGroupId: string | null`, `isPersonalMode`, localStorage persistence |
| `src/hooks/useGroups.ts` | **New** — fetch user groups, create group, add self as member on create |
| `src/components/layout/GroupSwitcher.tsx` | **New** — dropdown in header: Personal + groups list |
| `src/components/layout/AppSidebar.tsx` | Sectioned nav (MAIN incl. Recipes, INTELLIGENCE, GROUP, SYSTEM) |
| `src/components/layout/AppLayout.tsx` | Add GroupSwitcher in header, wrap with GroupProvider |
| `src/App.tsx` | Add routes: `/groups`, `/groups/:id`, `/challenges`, `/profile`, `/settings` |
| `src/pages/Groups.tsx` | **New** — group list + create dialog |
| `src/pages/GroupDetail.tsx` | **New** — members + activity placeholder |
| `src/pages/Challenges.tsx` | **New** — coming soon placeholder |
| `src/pages/Profile.tsx` | **New** — view/edit name |
| `src/pages/Settings.tsx` | **New** — placeholder |
| `src/components/groups/CreateGroupDialog.tsx` | **New** — name + type form |

## GroupContext Design (Future-Ready)

```typescript
// activeGroupId = null means Personal mode
// Later: can assign a real "private group" UUID without changing consumers
const GroupContext = createContext<{
  activeGroupId: string | null;
  setActiveGroupId: (id: string | null) => void;
  isPersonalMode: boolean;
}>();

// Provider reads from localStorage('shelf-control-active-group')
// setActiveGroupId writes to localStorage + state
```

All data hooks will later filter by `activeGroupId` — for now they continue working as-is (user_id scoped).

## Sidebar Structure

```text
MAIN: Dashboard, Pantry, Purchases, Consumption, Shopping List, Recipes
INTELLIGENCE: Analytics, Nutrition (coming soon badge)
GROUP: Groups, Challenges (coming soon badge)
SYSTEM: Profile, Settings, Sign Out
```

## Build Order

1. Schema migration
2. GroupContext + useGroups hook
3. GroupSwitcher component
4. Sidebar restructure
5. New pages (Groups, GroupDetail, Challenges, Profile, Settings)
6. Route updates in App.tsx + AppLayout.tsx

