import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Tables } from "@/integrations/supabase/types";

export type Symptom = Tables<"symptoms">;

export const useSymptoms = (limit = 50) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["symptoms", user?.id, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("symptoms")
        .select("*")
        .order("recorded_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as Symptom[];
    },
    enabled: !!user,
  });
};

export const useAddSymptom = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      mood?: number | null;
      energy?: number | null;
      digestion?: number | null;
      notes?: string | null;
      consumption_id?: string | null;
      recorded_at?: string;
    }) => {
      const { error } = await supabase.from("symptoms").insert({
        user_id: user!.id,
        mood: input.mood ?? null,
        energy: input.energy ?? null,
        digestion: input.digestion ?? null,
        notes: input.notes ?? null,
        consumption_id: input.consumption_id ?? null,
        recorded_at: input.recorded_at ?? new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["symptoms"] }),
  });
};

export const useDeleteSymptom = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("symptoms").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["symptoms"] }),
  });
};
