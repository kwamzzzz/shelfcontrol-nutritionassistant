-- Supabase grants function execution directly to `anon` by default.
-- These sharing operations require an authenticated group member, so remove
-- that explicit grant in addition to the existing PUBLIC revocations.

REVOKE ALL ON FUNCTION public.share_inventory_to_group(uuid[], uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.share_purchase_to_group(uuid, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.share_recipes_to_group(uuid[], uuid, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.share_inventory_to_group(uuid[], uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.share_purchase_to_group(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.share_recipes_to_group(uuid[], uuid, text) TO authenticated;

SELECT pg_notify('pgrst', 'reload schema');
