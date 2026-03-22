import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface NutritionGoals {
  calorie_goal: number;
  protein_goal: number;
  carbs_goal: number;
  fat_goal: number;
  water_goal_ml: number;
}

const DEFAULTS: NutritionGoals = {
  calorie_goal: 2000,
  protein_goal: 50,
  carbs_goal: 250,
  fat_goal: 65,
  water_goal_ml: 2000,
};

export const useNutritionGoals = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["nutrition_goals", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nutrition_goals")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data ?? DEFAULTS;
    },
    enabled: !!user,
  });
};

export const useUpsertGoals = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (goals: NutritionGoals) => {
      const { error } = await supabase
        .from("nutrition_goals")
        .upsert(
          { user_id: user!.id, ...goals, updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["nutrition_goals"] }),
  });
};
