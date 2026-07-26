-- Price Passport: store price observations without exposing shopper identity.
-- Receipt prices continue to live in purchase_items; this table is for prices
-- a shopper records while browsing or comparing stores.

CREATE TABLE IF NOT EXISTS public.price_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  item_brand text,
  store_name text NOT NULL,
  price numeric NOT NULL CHECK (price >= 0),
  currency text NOT NULL DEFAULT 'AED' CHECK (char_length(currency) BETWEEN 3 AND 4),
  package_quantity numeric NOT NULL DEFAULT 1 CHECK (package_quantity > 0),
  package_unit text NOT NULL DEFAULT 'piece',
  observed_at timestamptz NOT NULL DEFAULT now(),
  share_with_community boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS price_observations_item_date_idx
  ON public.price_observations (item_id, observed_at DESC);

CREATE INDEX IF NOT EXISTS price_observations_product_idx
  ON public.price_observations (lower(trim(item_name)), lower(trim(coalesce(item_brand, ''))), observed_at DESC)
  WHERE share_with_community = true;

ALTER TABLE public.price_observations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view scoped price observations"
  ON public.price_observations
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      group_id IS NOT NULL
      AND private.is_group_member(auth.uid(), group_id)
    )
  );

CREATE POLICY "Users can create scoped price observations"
  ON public.price_observations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      group_id IS NULL
      OR private.is_group_member(auth.uid(), group_id)
    )
  );

CREATE POLICY "Users can update scoped price observations"
  ON public.price_observations
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

CREATE POLICY "Users can delete scoped price observations"
  ON public.price_observations
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      group_id IS NOT NULL
      AND private.is_group_member(auth.uid(), group_id)
    )
  );

-- Community lookup deliberately omits user_id, group_id and private notes. The
-- product match is case-insensitive and accepts a missing brand on either side,
-- making the feature useful before the catalogue has full brand metadata.
CREATE OR REPLACE FUNCTION public.get_community_price_observations(
  p_item_name text,
  p_item_brand text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  item_id uuid,
  store_name text,
  price numeric,
  currency text,
  package_quantity numeric,
  package_unit text,
  observed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    po.id,
    po.item_id,
    po.store_name,
    po.price,
    po.currency,
    po.package_quantity,
    po.package_unit,
    po.observed_at
  FROM public.price_observations po
  WHERE auth.uid() IS NOT NULL
    AND po.share_with_community = true
    AND lower(trim(po.item_name)) = lower(trim(p_item_name))
    AND (
      nullif(trim(p_item_brand), '') IS NULL
      OR nullif(trim(po.item_brand), '') IS NULL
      OR lower(trim(po.item_brand)) = lower(trim(p_item_brand))
    )
  ORDER BY po.observed_at DESC
  LIMIT 250;
$$;

REVOKE ALL ON FUNCTION public.get_community_price_observations(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_community_price_observations(text, text) TO authenticated, service_role;
