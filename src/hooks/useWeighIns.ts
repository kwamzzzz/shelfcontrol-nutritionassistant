import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Tables } from "@/integrations/supabase/types";

export type WeighIn = Tables<"weigh_ins">;

export const useWeighIns = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["weigh_ins", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weigh_ins")
        .select("*")
        .order("recorded_at", { ascending: false });
      if (error) throw error;
      return data as WeighIn[];
    },
    enabled: !!user,
  });
};

export const useAddWeighIn = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { weight_kg: number; recorded_at?: string; note?: string | null }) => {
      const { error } = await supabase.from("weigh_ins").insert({
        user_id: user!.id,
        weight_kg: input.weight_kg,
        recorded_at: input.recorded_at ?? new Date().toISOString(),
        note: input.note ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["weigh_ins"] }),
  });
};

export const useDeleteWeighIn = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("weigh_ins").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["weigh_ins"] }),
  });
};
