import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type GroupShareMode = "copy" | "move";

export interface InventoryShareResult {
  kind: "inventory";
  mode: GroupShareMode;
  group_id: string;
  shared_count: number;
  merged_count: number;
}

export interface PurchaseShareResult {
  kind: "purchase";
  mode: GroupShareMode;
  group_id: string;
  purchase_id: string;
  line_count: number;
  inventory_count: number;
}

const invalidateSharedKitchen = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: ["inventory"] });
  queryClient.invalidateQueries({ queryKey: ["inventory-all"] });
  queryClient.invalidateQueries({ queryKey: ["purchases"] });
  queryClient.invalidateQueries({ queryKey: ["group_activity"] });
  queryClient.invalidateQueries({ queryKey: ["items"] });
};

export const useShareInventoryToGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      inventoryIds,
      groupId,
      mode,
    }: {
      inventoryIds: string[];
      groupId: string;
      mode: GroupShareMode;
    }) => {
      const { data, error } = await supabase.rpc("share_inventory_to_group", {
        _inventory_ids: inventoryIds,
        _group_id: groupId,
        _mode: mode,
      });
      if (error) throw error;
      return data as unknown as InventoryShareResult;
    },
    onSuccess: () => invalidateSharedKitchen(queryClient),
  });
};

export const useSharePurchaseToGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      purchaseId,
      groupId,
      mode,
    }: {
      purchaseId: string;
      groupId: string;
      mode: GroupShareMode;
    }) => {
      const { data, error } = await supabase.rpc("share_purchase_to_group", {
        _purchase_id: purchaseId,
        _group_id: groupId,
        _mode: mode,
      });
      if (error) throw error;
      return data as unknown as PurchaseShareResult;
    },
    onSuccess: () => invalidateSharedKitchen(queryClient),
  });
};
