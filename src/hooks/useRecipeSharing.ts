import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { GroupShareMode } from "@/hooks/usePantrySharing";

export interface RecipeShareResult {
  kind: "recipe";
  mode: GroupShareMode;
  group_id: string;
  shared_count: number;
  ingredient_count: number;
}

export const useShareRecipesToGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      recipeIds,
      groupId,
      mode,
    }: {
      recipeIds: string[];
      groupId: string;
      mode: GroupShareMode;
    }) => {
      const { data, error } = await supabase.rpc("share_recipes_to_group", {
        _recipe_ids: recipeIds,
        _group_id: groupId,
        _mode: mode,
      });
      if (error) throw error;
      return data as unknown as RecipeShareResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["group_activity"] });
    },
  });
};
