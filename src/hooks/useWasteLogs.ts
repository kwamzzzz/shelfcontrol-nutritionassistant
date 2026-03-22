import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGroupContext } from "@/contexts/GroupContext";

export const useWasteLogs = () => {
  const { user } = useAuth();
  const { activeGroupId, isPersonalMode } = useGroupContext();
  return useQuery({
    queryKey: ["waste_logs", user?.id, activeGroupId],
    queryFn: async () => {
      let query = supabase.from("waste_logs").select("*, items(name, category)").order("discarded_at", { ascending: false });
      if (isPersonalMode) {
        query = query.is("group_id", null).eq("user_id", user!.id);
      } else {
        query = query.eq("group_id", activeGroupId!);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useCreateWasteLog = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { activeGroupId } = useGroupContext();
  return useMutation({
    mutationFn: async (input: {
      item_id: string;
      inventory_id?: string;
      quantity: number;
      unit: string;
      reason?: string;
      note?: string;
    }) => {
      const { data, error } = await supabase
        .from("waste_logs")
        .insert({
          user_id: user!.id,
          group_id: activeGroupId,
          item_id: input.item_id,
          inventory_id: input.inventory_id ?? null,
          quantity: input.quantity,
          unit: input.unit,
          reason: input.reason ?? null,
          note: input.note ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["waste_logs"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
};
