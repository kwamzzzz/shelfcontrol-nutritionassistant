import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type Recipe = Tables<"recipes">;
export type RecipeIngredient = Tables<"recipe_ingredients"> & { items: Tables<"items"> };
export type RecipeWithIngredients = Recipe & { recipe_ingredients: RecipeIngredient[] };

export const useRecipes = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["recipes", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipes")
        .select("*, recipe_ingredients(*, items(*))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as RecipeWithIngredients[];
    },
    enabled: !!user,
  });
};

export type NewIngredientLine = {
  item_id: string;
  quantity: number;
  unit: string;
};

export const useCreateRecipe = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      servings: number | null;
      instructions: string | null;
      ingredients: NewIngredientLine[];
      image_url?: string | null;
    }) => {
      const { data: recipe, error: rErr } = await supabase
        .from("recipes")
        .insert({
          user_id: user!.id,
          name: input.name,
          servings: input.servings,
          instructions: input.instructions,
          image_url: input.image_url ?? null,
        } as any)
        .select()
        .single();
      if (rErr) throw rErr;

      if (input.ingredients.length > 0) {
        const rows = input.ingredients.map((ing) => ({
          user_id: user!.id,
          recipe_id: recipe.id,
          item_id: ing.item_id,
          quantity: ing.quantity,
          unit: ing.unit,
        }));
        const { error: iErr } = await supabase.from("recipe_ingredients").insert(rows);
        if (iErr) throw iErr;
      }

      return recipe;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recipes"] }),
  });
};

export const useUpdateRecipe = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      name: string;
      servings: number | null;
      instructions: string | null;
      ingredients: NewIngredientLine[];
      image_url?: string | null;
    }) => {
      // Update recipe row
      const { error: rErr } = await supabase
        .from("recipes")
        .update({
          name: input.name,
          servings: input.servings,
          instructions: input.instructions,
          image_url: input.image_url ?? null,
        } as any)
        .eq("id", input.id);
      if (rErr) throw rErr;

      // Replace ingredients: delete old, insert new
      const { error: dErr } = await supabase
        .from("recipe_ingredients")
        .delete()
        .eq("recipe_id", input.id);
      if (dErr) throw dErr;

      if (input.ingredients.length > 0) {
        const rows = input.ingredients.map((ing) => ({
          user_id: user!.id,
          recipe_id: input.id,
          item_id: ing.item_id,
          quantity: ing.quantity,
          unit: ing.unit,
        }));
        const { error: iErr } = await supabase.from("recipe_ingredients").insert(rows);
        if (iErr) throw iErr;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recipes"] }),
  });
};

export const useDeleteRecipe = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error: iErr } = await supabase.from("recipe_ingredients").delete().eq("recipe_id", id);
      if (iErr) throw iErr;
      const { error } = await supabase.from("recipes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recipes"] }),
  });
};

/**
 * Cook a recipe:
 * 1. Create a consumption_log row per ingredient
 * 2. Deduct quantities from inventory (FIFO by added_at — oldest first)
 *
 * Deduction rules for Phase 1:
 * - Matches inventory rows by item_id (ignores unit mismatch for simplicity)
 * - Deducts from oldest inventory row first
 * - If total inventory < needed, deducts what's available (partial cook)
 * - Removes inventory rows that reach 0
 * - Returns a summary of what was deducted vs. what was short
 */
export const useCookRecipe = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (recipe: RecipeWithIngredients) => {
      const shortages: { name: string; needed: number; available: number }[] = [];

      // Fetch user's full inventory once
      const { data: inventory, error: invErr } = await supabase
        .from("inventory")
        .select("*")
        .eq("user_id", user!.id)
        .order("added_at", { ascending: true });
      if (invErr) throw invErr;

      // Build a mutable copy for deduction tracking
      const invRows = (inventory ?? []).map((r) => ({ ...r, remaining: Number(r.quantity) }));

      for (const ing of recipe.recipe_ingredients) {
        let needed = Number(ing.quantity);
        const matching = invRows.filter((r) => r.item_id === ing.item_id);
        const available = matching.reduce((s, r) => s + r.remaining, 0);

        if (available < needed) {
          shortages.push({
            name: ing.items?.name ?? "Unknown",
            needed,
            available,
          });
        }

        // Deduct FIFO
        for (const row of matching) {
          if (needed <= 0) break;
          const deduct = Math.min(row.remaining, needed);
          row.remaining -= deduct;
          needed -= deduct;
        }

        // Log consumption regardless of shortage
        const { error: cErr } = await supabase.from("consumption_logs").insert({
          user_id: user!.id,
          item_id: ing.item_id,
          quantity: Number(ing.quantity),
          recipe_id: recipe.id,
        });
        if (cErr) throw cErr;
      }

      // Apply inventory updates
      for (const row of invRows) {
        const original = Number(
          (inventory ?? []).find((r) => r.id === row.id)?.quantity ?? 0
        );
        if (row.remaining === original) continue;

        if (row.remaining <= 0) {
          const { error } = await supabase.from("inventory").delete().eq("id", row.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("inventory")
            .update({ quantity: row.remaining })
            .eq("id", row.id);
          if (error) throw error;
        }
      }

      return { shortages };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["consumption_logs"] });
    },
  });
};
