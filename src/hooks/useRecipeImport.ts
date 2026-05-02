import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCreateRecipe } from "@/hooks/useRecipes";

export interface ImportedIngredient {
  name: string;
  quantity: number | null;
  unit: string | null;
}

export interface ImportedRecipe {
  name: string;
  servings: number | null;
  instructions: string | null;
  ingredients: ImportedIngredient[];
  source?: { url?: string; method: "json-ld" | "ai" };
}

export const useRecipeImport = () => {
  const { user } = useAuth();
  const createRecipe = useCreateRecipe();
  const [parsed, setParsed] = useState<ImportedRecipe | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAndParse = useCallback(async (input: { url?: string; text?: string }) => {
    setIsLoading(true);
    setError(null);
    setParsed(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("import-recipe", {
        body: { url: input.url, text: input.text },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setParsed(data as ImportedRecipe);
    } catch (err: any) {
      setError(err?.message ?? "Failed to import recipe");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setParsed(null);
    setError(null);
  }, []);

  const saveToLibrary = useCallback(
    async (override?: Partial<ImportedRecipe>) => {
      if (!parsed || !user) return;
      const recipe = { ...parsed, ...override };
      setIsSaving(true);
      setError(null);
      try {
        // For each ingredient: find or create an items row, then build NewIngredientLine[].
        const ingredientLines = [] as Array<{ item_id: string; quantity: number; unit: string }>;

        for (const ing of recipe.ingredients) {
          const { data: existing } = await supabase
            .from("items")
            .select("id")
            .eq("user_id", user.id)
            .ilike("name", ing.name)
            .limit(1)
            .maybeSingle();

          let itemId = existing?.id;
          if (!itemId) {
            const { data: created, error: createErr } = await supabase
              .from("items")
              .insert({
                user_id: user.id,
                name: ing.name,
                category: "Imported",
                default_unit: ing.unit ?? "unit",
              } as any)
              .select("id")
              .single();
            if (createErr) throw createErr;
            itemId = created!.id;
          }

          ingredientLines.push({
            item_id: itemId!,
            quantity: ing.quantity ?? 1,
            unit: ing.unit ?? "unit",
          });
        }

        await createRecipe.mutateAsync({
          name: recipe.name,
          servings: recipe.servings,
          instructions: recipe.instructions,
          ingredients: ingredientLines,
        });

        reset();
      } catch (err: any) {
        setError(err?.message ?? "Failed to save recipe");
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [parsed, user, createRecipe, reset],
  );

  return { parsed, setParsed, isLoading, isSaving, error, fetchAndParse, reset, saveToLibrary };
};
