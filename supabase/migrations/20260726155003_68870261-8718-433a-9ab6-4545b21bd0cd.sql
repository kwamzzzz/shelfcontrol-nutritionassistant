-- =========================================================================
-- Migration 1: 20260726160000_share_pantry_with_groups.sql
-- =========================================================================

CREATE INDEX IF NOT EXISTS inventory_purchase_group_idx
  ON public.inventory (purchase_id, group_id);

DROP POLICY IF EXISTS "View items from shared purchases" ON public.items;
CREATE POLICY "View items from shared purchases"
  ON public.items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.purchase_items pi
      JOIN public.purchases p ON p.id = pi.purchase_id
      WHERE pi.item_id = items.id
        AND p.group_id IS NOT NULL
        AND private.is_group_member(auth.uid(), p.group_id)
    )
  );

CREATE OR REPLACE FUNCTION public.share_inventory_to_group(
  _inventory_ids uuid[],
  _group_id uuid,
  _mode text DEFAULT 'copy'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_requested integer;
  v_owned integer;
  v_shared integer := 0;
  v_merged integer := 0;
  v_target_id uuid;
  v_source public.inventory%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF _mode NOT IN ('copy', 'move') THEN
    RAISE EXCEPTION 'Share mode must be copy or move';
  END IF;

  IF _group_id IS NULL OR NOT private.is_group_member(v_user_id, _group_id) THEN
    RAISE EXCEPTION 'You are not a member of the destination group';
  END IF;

  SELECT count(*)
  INTO v_requested
  FROM (SELECT DISTINCT unnest(coalesce(_inventory_ids, ARRAY[]::uuid[])) AS id) requested;

  IF v_requested = 0 THEN
    RAISE EXCEPTION 'Choose at least one pantry item';
  END IF;

  SELECT count(*)
  INTO v_owned
  FROM public.inventory i
  JOIN (
    SELECT DISTINCT unnest(_inventory_ids) AS id
  ) requested ON requested.id = i.id
  WHERE i.user_id = v_user_id
    AND i.group_id IS NULL
    AND i.status = 'active';

  IF v_owned <> v_requested THEN
    RAISE EXCEPTION 'Only your active personal pantry items can be shared';
  END IF;

  FOR v_source IN
    SELECT i.*
    FROM public.inventory i
    JOIN (
      SELECT DISTINCT unnest(_inventory_ids) AS id
    ) requested ON requested.id = i.id
    WHERE i.user_id = v_user_id
      AND i.group_id IS NULL
      AND i.status = 'active'
    ORDER BY i.id
    FOR UPDATE OF i
  LOOP
    v_target_id := NULL;

    SELECT i.id
    INTO v_target_id
    FROM public.inventory i
    WHERE i.group_id = _group_id
      AND i.status = 'active'
      AND i.item_id = v_source.item_id
      AND i.unit = v_source.unit
      AND i.storage_location IS NOT DISTINCT FROM v_source.storage_location
      AND i.sealed_status IS NOT DISTINCT FROM v_source.sealed_status
      AND i.expiry_date IS NOT DISTINCT FROM v_source.expiry_date
    ORDER BY i.added_at
    LIMIT 1
    FOR UPDATE;

    IF v_target_id IS NOT NULL THEN
      UPDATE public.inventory
      SET quantity = quantity + v_source.quantity
      WHERE id = v_target_id;

      v_merged := v_merged + 1;

      IF _mode = 'move' THEN
        DELETE FROM public.inventory WHERE id = v_source.id;
      END IF;
    ELSIF _mode = 'move' THEN
      UPDATE public.inventory
      SET group_id = _group_id,
          purchase_id = NULL
      WHERE id = v_source.id;
    ELSE
      INSERT INTO public.inventory (
        user_id,
        item_id,
        quantity,
        unit,
        storage_location,
        expiry_date,
        sealed_status,
        opened_date,
        status,
        group_id,
        purchase_id
      )
      VALUES (
        v_user_id,
        v_source.item_id,
        v_source.quantity,
        v_source.unit,
        v_source.storage_location,
        v_source.expiry_date,
        v_source.sealed_status,
        v_source.opened_date,
        'active',
        _group_id,
        NULL
      );
    END IF;

    v_shared := v_shared + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'kind', 'inventory',
    'mode', _mode,
    'group_id', _group_id,
    'shared_count', v_shared,
    'merged_count', v_merged
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.share_purchase_to_group(
  _purchase_id uuid,
  _group_id uuid,
  _mode text DEFAULT 'copy'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_source public.purchases%ROWTYPE;
  v_destination_purchase_id uuid;
  v_inventory_count integer := 0;
  v_line_count integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF _mode NOT IN ('copy', 'move') THEN
    RAISE EXCEPTION 'Share mode must be copy or move';
  END IF;

  IF _group_id IS NULL OR NOT private.is_group_member(v_user_id, _group_id) THEN
    RAISE EXCEPTION 'You are not a member of the destination group';
  END IF;

  SELECT *
  INTO v_source
  FROM public.purchases
  WHERE id = _purchase_id
    AND user_id = v_user_id
    AND group_id IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only your personal receipts can be shared';
  END IF;

  SELECT count(*)
  INTO v_line_count
  FROM public.purchase_items
  WHERE purchase_id = v_source.id;

  IF _mode = 'move' THEN
    UPDATE public.purchases
    SET group_id = _group_id
    WHERE id = v_source.id;

    v_destination_purchase_id := v_source.id;

    UPDATE public.inventory
    SET group_id = _group_id
    WHERE purchase_id = v_source.id
      AND user_id = v_user_id
      AND group_id IS NULL;

    GET DIAGNOSTICS v_inventory_count = ROW_COUNT;
  ELSE
    INSERT INTO public.purchases (
      user_id,
      group_id,
      store_name,
      total_cost,
      purchased_at,
      notes
    )
    VALUES (
      v_user_id,
      _group_id,
      v_source.store_name,
      v_source.total_cost,
      v_source.purchased_at,
      v_source.notes
    )
    RETURNING id INTO v_destination_purchase_id;

    INSERT INTO public.purchase_items (
      user_id,
      purchase_id,
      item_id,
      quantity,
      unit,
      unit_price,
      expiry_date,
      sealed_status,
      opened_date,
      weight,
      weight_unit,
      notes
    )
    SELECT
      v_user_id,
      v_destination_purchase_id,
      pi.item_id,
      pi.quantity,
      pi.unit,
      pi.unit_price,
      pi.expiry_date,
      pi.sealed_status,
      pi.opened_date,
      pi.weight,
      pi.weight_unit,
      pi.notes
    FROM public.purchase_items pi
    WHERE pi.purchase_id = v_source.id;

    INSERT INTO public.inventory (
      user_id,
      item_id,
      quantity,
      unit,
      storage_location,
      expiry_date,
      sealed_status,
      opened_date,
      status,
      group_id,
      purchase_id
    )
    SELECT
      v_user_id,
      i.item_id,
      i.quantity,
      i.unit,
      i.storage_location,
      i.expiry_date,
      i.sealed_status,
      i.opened_date,
      'active',
      _group_id,
      v_destination_purchase_id
    FROM public.inventory i
    WHERE i.purchase_id = v_source.id
      AND i.user_id = v_user_id
      AND i.group_id IS NULL
      AND i.status = 'active';

    GET DIAGNOSTICS v_inventory_count = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'kind', 'purchase',
    'mode', _mode,
    'group_id', _group_id,
    'purchase_id', v_destination_purchase_id,
    'line_count', v_line_count,
    'inventory_count', v_inventory_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.share_inventory_to_group(uuid[], uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.share_purchase_to_group(uuid, uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.share_inventory_to_group(uuid[], uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.share_purchase_to_group(uuid, uuid, text) TO authenticated;

SELECT pg_notify('pgrst', 'reload schema');

-- =========================================================================
-- Migration 2: 20260726170000_share_cookbook_with_groups.sql
-- =========================================================================

ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.groups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS recipes_group_created_idx
  ON public.recipes (group_id, created_at DESC);

DROP POLICY IF EXISTS "Users can view own recipes" ON public.recipes;
DROP POLICY IF EXISTS "Users can insert own recipes" ON public.recipes;
DROP POLICY IF EXISTS "Users can update own recipes" ON public.recipes;
DROP POLICY IF EXISTS "Users can delete own recipes" ON public.recipes;
DROP POLICY IF EXISTS "View recipes" ON public.recipes;
DROP POLICY IF EXISTS "Insert recipes" ON public.recipes;
DROP POLICY IF EXISTS "Update recipes" ON public.recipes;
DROP POLICY IF EXISTS "Delete recipes" ON public.recipes;

CREATE POLICY "View recipes"
  ON public.recipes
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      group_id IS NOT NULL
      AND private.is_group_member(auth.uid(), group_id)
    )
  );

CREATE POLICY "Insert recipes"
  ON public.recipes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      group_id IS NULL
      OR private.is_group_member(auth.uid(), group_id)
    )
  );

CREATE POLICY "Update recipes"
  ON public.recipes
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      group_id IS NOT NULL
      AND private.is_group_member(auth.uid(), group_id)
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR (
      group_id IS NOT NULL
      AND private.is_group_member(auth.uid(), group_id)
    )
  );

CREATE POLICY "Delete recipes"
  ON public.recipes
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      group_id IS NOT NULL
      AND private.is_group_member(auth.uid(), group_id)
    )
  );

DROP POLICY IF EXISTS "Users can view own recipe_ingredients" ON public.recipe_ingredients;
DROP POLICY IF EXISTS "Users can insert own recipe_ingredients" ON public.recipe_ingredients;
DROP POLICY IF EXISTS "Users can update own recipe_ingredients" ON public.recipe_ingredients;
DROP POLICY IF EXISTS "Users can delete own recipe_ingredients" ON public.recipe_ingredients;
DROP POLICY IF EXISTS "View recipe ingredients" ON public.recipe_ingredients;
DROP POLICY IF EXISTS "Insert recipe ingredients" ON public.recipe_ingredients;
DROP POLICY IF EXISTS "Update recipe ingredients" ON public.recipe_ingredients;
DROP POLICY IF EXISTS "Delete recipe ingredients" ON public.recipe_ingredients;

CREATE POLICY "View recipe ingredients"
  ON public.recipe_ingredients
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.recipes r
      WHERE r.id = recipe_ingredients.recipe_id
        AND r.group_id IS NOT NULL
        AND private.is_group_member(auth.uid(), r.group_id)
    )
  );

CREATE POLICY "Insert recipe ingredients"
  ON public.recipe_ingredients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.recipes r
      WHERE r.id = recipe_ingredients.recipe_id
        AND (
          r.user_id = auth.uid()
          OR (
            r.group_id IS NOT NULL
            AND private.is_group_member(auth.uid(), r.group_id)
          )
        )
    )
  );

CREATE POLICY "Update recipe ingredients"
  ON public.recipe_ingredients
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.recipes r
      WHERE r.id = recipe_ingredients.recipe_id
        AND r.group_id IS NOT NULL
        AND private.is_group_member(auth.uid(), r.group_id)
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.recipes r
      WHERE r.id = recipe_ingredients.recipe_id
        AND r.group_id IS NOT NULL
        AND private.is_group_member(auth.uid(), r.group_id)
    )
  );

CREATE POLICY "Delete recipe ingredients"
  ON public.recipe_ingredients
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.recipes r
      WHERE r.id = recipe_ingredients.recipe_id
        AND r.group_id IS NOT NULL
        AND private.is_group_member(auth.uid(), r.group_id)
    )
  );

DROP POLICY IF EXISTS "View items from shared recipes" ON public.items;
CREATE POLICY "View items from shared recipes"
  ON public.items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.recipe_ingredients ri
      JOIN public.recipes r ON r.id = ri.recipe_id
      WHERE ri.item_id = items.id
        AND r.group_id IS NOT NULL
        AND private.is_group_member(auth.uid(), r.group_id)
    )
  );

CREATE OR REPLACE FUNCTION public.share_recipes_to_group(
  _recipe_ids uuid[],
  _group_id uuid,
  _mode text DEFAULT 'copy'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_requested integer;
  v_owned integer;
  v_shared integer := 0;
  v_ingredient_count integer := 0;
  v_destination_recipe_id uuid;
  v_source public.recipes%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF _mode NOT IN ('copy', 'move') THEN
    RAISE EXCEPTION 'Share mode must be copy or move';
  END IF;

  IF _group_id IS NULL OR NOT private.is_group_member(v_user_id, _group_id) THEN
    RAISE EXCEPTION 'You are not a member of the destination group';
  END IF;

  SELECT count(*)
  INTO v_requested
  FROM (
    SELECT DISTINCT unnest(coalesce(_recipe_ids, ARRAY[]::uuid[])) AS id
  ) requested;

  IF v_requested = 0 THEN
    RAISE EXCEPTION 'Choose at least one recipe';
  END IF;

  SELECT count(*)
  INTO v_owned
  FROM public.recipes r
  JOIN (
    SELECT DISTINCT unnest(_recipe_ids) AS id
  ) requested ON requested.id = r.id
  WHERE r.user_id = v_user_id
    AND r.group_id IS NULL;

  IF v_owned <> v_requested THEN
    RAISE EXCEPTION 'Only your personal recipes can be shared';
  END IF;

  FOR v_source IN
    SELECT r.*
    FROM public.recipes r
    JOIN (
      SELECT DISTINCT unnest(_recipe_ids) AS id
    ) requested ON requested.id = r.id
    WHERE r.user_id = v_user_id
      AND r.group_id IS NULL
    ORDER BY r.id
    FOR UPDATE OF r
  LOOP
    IF _mode = 'move' THEN
      UPDATE public.recipes
      SET group_id = _group_id
      WHERE id = v_source.id;

      SELECT count(*)
      INTO v_owned
      FROM public.recipe_ingredients
      WHERE recipe_id = v_source.id;

      v_ingredient_count := v_ingredient_count + v_owned;
    ELSE
      INSERT INTO public.recipes (
        user_id,
        group_id,
        name,
        servings,
        instructions,
        image_url,
        calories_per_serving,
        carbs_g_per_serving,
        fat_g_per_serving,
        fiber_g_per_serving,
        nutrition_calculated_at,
        nutrition_notes,
        protein_g_per_serving,
        sodium_mg_per_serving,
        sugar_g_per_serving,
        tags
      )
      VALUES (
        v_user_id,
        _group_id,
        v_source.name,
        v_source.servings,
        v_source.instructions,
        v_source.image_url,
        v_source.calories_per_serving,
        v_source.carbs_g_per_serving,
        v_source.fat_g_per_serving,
        v_source.fiber_g_per_serving,
        v_source.nutrition_calculated_at,
        v_source.nutrition_notes,
        v_source.protein_g_per_serving,
        v_source.sodium_mg_per_serving,
        v_source.sugar_g_per_serving,
        v_source.tags
      )
      RETURNING id INTO v_destination_recipe_id;

      INSERT INTO public.recipe_ingredients (
        user_id,
        recipe_id,
        item_id,
        quantity,
        unit
      )
      SELECT
        v_user_id,
        v_destination_recipe_id,
        ri.item_id,
        ri.quantity,
        ri.unit
      FROM public.recipe_ingredients ri
      WHERE ri.recipe_id = v_source.id;

      GET DIAGNOSTICS v_owned = ROW_COUNT;
      v_ingredient_count := v_ingredient_count + v_owned;
    END IF;

    v_shared := v_shared + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'kind', 'recipe',
    'mode', _mode,
    'group_id', _group_id,
    'shared_count', v_shared,
    'ingredient_count', v_ingredient_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.share_recipes_to_group(uuid[], uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.share_recipes_to_group(uuid[], uuid, text) TO authenticated;

SELECT pg_notify('pgrst', 'reload schema');