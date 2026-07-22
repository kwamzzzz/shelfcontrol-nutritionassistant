import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import RecipeBreadcrumb from "@/components/cookbook/RecipeBreadcrumb";
import RecipeHero from "@/components/cookbook/RecipeHero";
import IngredientsCard from "@/components/cookbook/IngredientsCard";
import InstructionsCard from "@/components/cookbook/InstructionsCard";
import NutritionCard from "@/components/cookbook/NutritionCard";
import StepByStepMode from "@/components/cookbook/StepByStepMode";
import AddIngredientDialog from "@/components/cookbook/AddIngredientDialog";
import { Button } from "@/components/ui/button";
import { CalendarPlus, ShoppingCart } from "lucide-react";
import { MOCK_RECIPES, type MockRecipe } from "@/data/cookbookMockData";
import { useRecipes, type RecipeWithIngredients } from "@/hooks/useRecipes";

function adaptRecipe(r: RecipeWithIngredients): MockRecipe {
  const rawInstr = (r.instructions ?? "").trim();
  const steps = rawInstr
    ? rawInstr
        .split(/\n+/)
        .map((s) => s.replace(/^\s*\d+[\.\)]\s*/, "").trim())
        .filter(Boolean)
    : ["No instructions yet."];
  const servings = r.servings ?? 1;
  const anyR = r as any;
  return {
    id: r.id,
    title: r.name,
    description: steps[0] ?? "",
    image:
      r.image_url ||
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1400&q=80",
    prepMins: 10,
    cookMins: 20,
    servings,
    caloriesPerServing: Number(anyR.calories_per_serving ?? 0),
    tags: [],
    ingredients: (r.recipe_ingredients ?? []).map((ing, i) => ({
      id: ing.id ?? `ing-${i}`,
      name: ing.items?.name ?? "Ingredient",
      quantity: ing.quantity ?? null,
      unit: ing.unit ?? "",
    })),
    instructions: steps,
    nutrition: {
      calories: Number(anyR.calories_per_serving ?? 0),
      carbs: Number(anyR.carbs_g_per_serving ?? 0),
      protein: Number(anyR.protein_g_per_serving ?? 0),
      fat: Number(anyR.fat_g_per_serving ?? 0),
      fiber: Number(anyR.fiber_g_per_serving ?? 0),
      sugar: Number(anyR.sugar_g_per_serving ?? 0),
      sodium: Number(anyR.sodium_mg_per_serving ?? 0),
    },
  };
}

const RecipeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: recipes, isLoading } = useRecipes();
  const qc = useQueryClient();
  const [calculating, setCalculating] = useState(false);
  const [savingNutrition, setSavingNutrition] = useState(false);
  const [addIngredientOpen, setAddIngredientOpen] = useState(false);
  const recipe = useMemo<MockRecipe | null>(() => {
    const dbMatch = recipes?.find((r) => r.id === id);
    if (dbMatch) return adaptRecipe(dbMatch);
    const mock = MOCK_RECIPES.find((r) => r.id === id);
    return mock ?? null;
  }, [recipes, id]);

  const [servings, setServings] = useState(recipe?.servings ?? 1);
  const [favorite, setFavorite] = useState(false);
  const [stepMode, setStepMode] = useState(false);

  useEffect(() => {
    if (recipe) setServings(recipe.servings);
  }, [recipe?.id, recipe?.servings]);

  const notImpl = (label: string) => () => toast.info(`${label} — coming soon`);

  const handleCalculateNutrition = async () => {
    if (!recipe) return;
    if (!recipe.ingredients.length) {
      toast.error("Add ingredients before calculating nutrition.");
      return;
    }
    setCalculating(true);
    try {
      const { data, error } = await supabase.functions.invoke("calculate-recipe-nutrition", {
        body: { recipe_id: recipe.id },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      await qc.invalidateQueries({ queryKey: ["recipes"] });
      toast.success("Nutrition calculated");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not calculate nutrition");
    } finally {
      setCalculating(false);
    }
  };

  const handleSaveNutrition = async (n: MockRecipe["nutrition"]) => {
    if (!recipe) return;
    setSavingNutrition(true);
    try {
      const { error } = await supabase
        .from("recipes")
        .update({
          calories_per_serving: n.calories,
          carbs_g_per_serving: n.carbs,
          protein_g_per_serving: n.protein,
          fat_g_per_serving: n.fat,
          fiber_g_per_serving: n.fiber,
          sugar_g_per_serving: n.sugar,
          sodium_mg_per_serving: n.sodium,
        } as any)
        .eq("id", recipe.id);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["recipes"] });
      toast.success("Nutrition updated");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save nutrition");
    } finally {
      setSavingNutrition(false);
    }
  };

  if (!recipe) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        {isLoading ? "Loading recipe…" : "Recipe not found."}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <RecipeBreadcrumb
        title={recipe.title}
        onEdit={notImpl("Edit recipe")}
        onShare={notImpl("Share recipe")}
        onPrint={() => window.print()}
        onNew={() => navigate("/recipes")}
        onDuplicate={notImpl("Duplicate recipe")}
      />

      <div className="space-y-5 min-w-0">
        <RecipeHero
          recipe={recipe}
          servings={servings}
          favorite={favorite}
          onToggleFavorite={() => setFavorite((f) => !f)}
          onEditImage={notImpl("Edit image")}
        />

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={notImpl("Add to Meal Plan")}
            className="gap-2 rounded-full"
          >
            <CalendarPlus className="h-3.5 w-3.5" /> Add to Meal Plan
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={notImpl("Add to Shopping List")}
            className="gap-2 rounded-full"
          >
            <ShoppingCart className="h-3.5 w-3.5" /> Add to Shopping List
          </Button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_360px] gap-5">
          <IngredientsCard
            ingredients={recipe.ingredients}
            baseServings={recipe.servings}
            servings={servings}
            onServingsChange={setServings}
            onAddIngredient={() => setAddIngredientOpen(true)}
          />
          <InstructionsCard steps={recipe.instructions} onOpenStepByStep={() => setStepMode(true)} />
          <NutritionCard
            nutrition={recipe.nutrition}
            servings={servings}
            onCalculate={handleCalculateNutrition}
            calculating={calculating}
            onSave={handleSaveNutrition}
            saving={savingNutrition}
          />
        </div>

        {recipe.tips && recipe.tips.length > 0 && (
          <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur p-5 shadow-sm">
            <h3 className="font-medium text-foreground">Tips & Notes</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground list-disc list-inside">
              {recipe.tips.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <StepByStepMode
        open={stepMode}
        onOpenChange={setStepMode}
        steps={recipe.instructions}
        ingredients={recipe.ingredients}
        servingsScale={servings / recipe.servings}
      />

      <AddIngredientDialog
        recipeId={recipe.id}
        open={addIngredientOpen}
        onOpenChange={setAddIngredientOpen}
      />
    </div>
  );
};

export default RecipeDetail;