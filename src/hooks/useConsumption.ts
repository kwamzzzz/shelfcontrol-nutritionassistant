import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGroupContext } from "@/contexts/GroupContext";
import type { Tables } from "@/integrations/supabase/types";

export type ConsumptionLog = Tables<"consumption_logs"> & {
  items: Tables<"items">;
  recipes: Tables<"recipes"> | null;
};

export const useConsumptionLogs = () => {
  const { user } = useAuth();
  const { activeGroupId } = useGroupContext();
  return useQuery({
    queryKey: ["consumption_logs", user?.id, activeGroupId],
    queryFn: async () => {
      let query = supabase
        .from("consumption_logs")
        .select("*, items(*), recipes(*)")
        .order("consumed_at", { ascending: false });

      if (activeGroupId) {
        query = query.eq("group_id", activeGroupId);
      } else {
        query = query.is("group_id", null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ConsumptionLog[];
    },
    enabled: !!user,
  });
};

export const useCreateConsumptionLog = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { activeGroupId } = useGroupContext();
  return useMutation({
    mutationFn: async (input: {
      item_id: string;
      quantity: number;
      consumed_at?: string;
    }) => {
      const { data, error } = await supabase
        .from("consumption_logs")
        .insert({
          user_id: user!.id,
          group_id: activeGroupId,
          item_id: input.item_id,
          quantity: input.quantity,
          consumed_at: input.consumed_at ?? new Date().toISOString(),
        })
        .select("*, items(*), recipes(*)")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["consumption_logs"] }),
  });
};

export const useDeleteConsumptionLog = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("consumption_logs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["consumption_logs"] }),
  });
};
