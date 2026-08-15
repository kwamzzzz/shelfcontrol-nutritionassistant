import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ShoppingShareResult {
  kind: "shopping";
  mode: "copy";
  group_id: string;
  shared_count: number;
}

export const useShareShoppingToGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      shoppingIds,
      groupId,
    }: {
      shoppingIds: string[];
      groupId: string;
    }) => {
      const { data, error } = await supabase.rpc("share_shopping_to_group", {
        _shopping_ids: shoppingIds,
        _group_id: groupId,
      });
      if (error) throw error;
      return data as unknown as ShoppingShareResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shopping_list"] });
      queryClient.invalidateQueries({ queryKey: ["group_activity"] });
    },
  });
};
