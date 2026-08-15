CREATE OR REPLACE FUNCTION public.share_shopping_to_group(_shopping_ids uuid[], _group_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_requested integer;
  v_owned integer;
  v_shared integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF _group_id IS NULL OR NOT private.is_group_member(v_user_id, _group_id) THEN
    RAISE EXCEPTION 'You are not a member of the destination group';
  END IF;

  SELECT count(*) INTO v_requested
  FROM (SELECT DISTINCT unnest(coalesce(_shopping_ids, ARRAY[]::uuid[])) AS id) requested;

  IF v_requested = 0 THEN
    RAISE EXCEPTION 'Choose at least one shopping list item';
  END IF;

  SELECT count(*) INTO v_owned
  FROM public.shopping_list s
  JOIN (SELECT DISTINCT unnest(_shopping_ids) AS id) requested ON requested.id = s.id
  WHERE s.user_id = v_user_id AND s.group_id IS NULL;

  IF v_owned <> v_requested THEN
    RAISE EXCEPTION 'Only your personal shopping list items can be shared';
  END IF;

  INSERT INTO public.shopping_list (
    user_id, group_id, item_id, recipe_id, name, quantity, unit,
    category, estimated_cost, basket, notes, image_url, is_purchased
  )
  SELECT
    v_user_id, _group_id, s.item_id, s.recipe_id, s.name, s.quantity, s.unit,
    s.category, s.estimated_cost, s.basket, s.notes, s.image_url, false
  FROM public.shopping_list s
  JOIN (SELECT DISTINCT unnest(_shopping_ids) AS id) requested ON requested.id = s.id
  WHERE s.user_id = v_user_id AND s.group_id IS NULL;

  GET DIAGNOSTICS v_shared = ROW_COUNT;

  RETURN jsonb_build_object(
    'kind', 'shopping',
    'mode', 'copy',
    'group_id', _group_id,
    'shared_count', v_shared
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.share_shopping_to_group(uuid[], uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.share_shopping_to_group(uuid[], uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.share_shopping_to_group(uuid[], uuid) TO authenticated;