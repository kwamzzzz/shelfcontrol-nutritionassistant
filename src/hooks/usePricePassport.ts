import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGroupContext } from "@/contexts/GroupContext";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type PriceObservation = Tables<"price_observations">;

export interface CommunityPriceObservation {
  id: string;
  item_id: string;
  store_name: string;
  price: number;
  currency: string;
  package_quantity: number;
  package_unit: string;
  observed_at: string;
}

export const usePriceObservations = (
  itemId: string | undefined,
  itemName: string | undefined,
  itemBrand: string | null | undefined,
) => {
  const { user } = useAuth();
  const { activeGroupId } = useGroupContext();

  return useQuery({
    queryKey: ["price-observations", user?.id, activeGroupId, itemId, itemName, itemBrand],
    queryFn: async () => {
      let scopedQuery = supabase
        .from("price_observations")
        .select("*")
        .eq("item_id", itemId!)
        .order("observed_at", { ascending: false });

      scopedQuery = activeGroupId
        ? scopedQuery.eq("group_id", activeGroupId)
        : scopedQuery.is("group_id", null);

      const [{ data: scoped, error: scopedError }, { data: community, error: communityError }] =
        await Promise.all([
          scopedQuery,
          supabase.rpc("get_community_price_observations", {
            p_item_name: itemName!,
            p_item_brand: itemBrand || null,
          }),
        ]);

      if (scopedError) throw scopedError;
      if (communityError) throw communityError;

      return {
        scoped: (scoped ?? []) as PriceObservation[],
        community: (community ?? []) as CommunityPriceObservation[],
      };
    },
    enabled: Boolean(user && itemId && itemName),
  });
};

export const useCreatePriceObservation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { activeGroupId } = useGroupContext();

  return useMutation({
    mutationFn: async (
      observation: Omit<
        TablesInsert<"price_observations">,
        "user_id" | "group_id"
      >,
    ) => {
      const { data, error } = await supabase
        .from("price_observations")
        .insert({
          ...observation,
          user_id: user!.id,
          group_id: activeGroupId,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["price-observations"] });
    },
  });
};
