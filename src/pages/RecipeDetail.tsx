import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import RecipeBreadcrumb from "@/components/cookbook/RecipeBreadcrumb";
import RecipeHero from "@/components/cookbook/RecipeHero";
import { useSignedImage } from "@/hooks/useSignedImage";
import IngredientsCard from "@/components/cookbook/IngredientsCard";
import InstructionsCard from "@/components/cookbook/InstructionsCard";
import NutritionCard from "@/components/cookbook/NutritionCard";
import RecipeSourceCard from "@/components/cookbook/RecipeSourceCard";
import StepByStepMode from "@/components/cookbook/StepByStepMode";
import AddIngredientDialog from "@/components/cookbook/AddIngredientDialog";
import EditRecipeDialog from "@/components/recipes/EditRecipeDialog";
import ShareToGroupDialog from "@/components/groups/ShareToGroupDialog";
import { Button } from "@/components/ui/button";
import { CalendarPlus, ShoppingCart } from "lucide-react";
import { MOCK_RECIPES, type MockRecipe } from "@/data/cookbookMockData";
import { useRecipes, type RecipeWithIngredients } from "@/hooks/useRecipes";
import { useInventory } from "@/hooks/usePantry";
import { useCreateShoppingItem, useShoppingList } from "@/hooks/useShoppingList";
import { calculateNutrition } from "@/lib/nutrition";
import {
  computeIngredientNeeds,
  safeScale,
  shoppingListHasIngredient,
  toShoppingLine,
} from "@/lib/recipe-pantry";

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Please try again.";

function adaptRecipe(r: RecipeWithIngredients): MockRecipe {
  const rawInstr = (r.instructions ?? "").trim();
  const steps = rawInstr
    ? rawInstr
        .split(/\n+/)
        .map((s) => s.replace(/^\s*\d+[.)]\s*/, "").trim())
        .filter(Boolean)
    : [];
  const servings = r.servings ?? 1;
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
    caloriesPerServing: Number(r.calories_per_serving ?? 0),
    tags: r.tags ?? [],
    ingredients: (r.recipe_ingredients ?? []).map((ing, i) => ({
      id: ing.id ?? `ing-${i}`,
      name: ing.items?.name ?? "Ingredient",
      quantity: ing.quantity ?? null,
      unit: ing.unit ?? "",
      item_id: ing.item_id,
    })),
    instructions: steps,
    nutrition: {
      calories: Number(r.calories_per_serving ?? 0),
      carbs: Number(r.carbs_g_per_serving ?? 0),
      protein: Number(r.protein_g_per_serving ?? 0),
      fat: Number(r.fat_g_per_serving ?? 0),
      fiber: Number(r.fiber_g_per_serving ?? 0),
      sugar: Number(r.sugar_g_per_serving ?? 0),
      sodium: Number(r.sodium_mg_per_serving ?? 0),
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
  const [savingSteps, setSavingSteps] = useState(false);
  const [addIngredientOpen, setAddIngredientOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const databaseRecipe = useMemo(
    () => recipes?.find((candidate) => candidate.id === id) ?? null,
    [recipes, id],
  );
  const baseRecipe = useMemo<MockRecipe | null>(() => {
    if (databaseRecipe) return adaptRecipe(databaseRecipe);
    const mock = MOCK_RECIPES.find((r) => r.id === id);
    return mock ?? null;
  }, [databaseRecipe, id]);

  // Recipe photos live in a private bucket, so swap in a short-lived signed URL.
  const signedHero = useSignedImage(baseRecipe?.image);
  const recipe = useMemo<MockRecipe | null>(
    () => (baseRecipe ? { ...baseRecipe, image: signedHero ?? baseRecipe.image } : null),
    [baseRecipe, signedHero]
  );

  // Live, per-serving nutrition summed from each ingredient's stored macros ×
  // amount used. Updates whenever ingredients change. Ingredients without macro
  // data contribute nothing, so this is 0 until those items are filled in — the
  // AI "Calculate" button remains for that. Falls back to the stored estimate.
  const displayNutrition = useMemo(() => {
    const stored = recipe?.nutrition ?? null;
    if (!databaseRecipe) return stored;
    const perServing = Math.max(1, databaseRecipe.servings ?? 1);
    const totals = (databaseRecipe.recipe_ingredients ?? []).reduce(
      (acc, ri) => {
        const n = calculateNutrition(ri.items, Number(ri.quantity), ri.unit);
        acc.calories += n.calories;
        acc.protein += n.protein;
        acc.carbs += n.carbs;
        acc.fat += n.fat;
        acc.fiber += n.fiber;
        acc.sugar += n.sugar;
        acc.sodium += n.sodium;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 },
    );
    if (totals.calories <= 0 && totals.protein <= 0 && totals.carbs <= 0 && totals.fat <= 0) {
      return stored; // no usable macro data on the ingredients — keep the estimate
    }
    return {
      calories: totals.calories / perServing,
      carbs: totals.carbs / perServing,
      protein: totals.protein / perServing,
      fat: totals.fat / perServing,
      fiber: totals.fiber / perServing,
      sugar: totals.sugar / perServing,
      sodium: totals.sodium / perServing,
    };
  }, [databaseRecipe, recipe?.nutrition]);

  const [servings, setServings] = useState(recipe?.servings ?? 1);
  const [favorite, setFavorite] = useState(false);
  const [stepMode, setStepMode] = useState(false);

  // Depend on the values, not the object: `recipe` is a useMemo that returns a
  // fresh literal on every ["recipes"] refetch, so keying on its identity would
  // snap the servings scaler back to base every time an ingredient is saved.
  const loadedRecipeKey = recipe?.id;
  const loadedBaseServings = recipe?.servings;
  useEffect(() => {
    if (loadedBaseServings != null) setServings(loadedBaseServings);
  }, [loadedRecipeKey, loadedBaseServings]);

  const notImpl = (label: string) => () => toast.info(`${label} — coming soon`);

  const { data: inventory, isLoading: inventoryLoading } = useInventory();
  // Dedupe is only meaningful once the list has actually arrived — adding
  // before it resolves would duplicate everything already on it.
  const { data: shoppingItems, isLoading: shoppingLoading } = useShoppingList();
  const createShoppingItem = useCreateShoppingItem();
  const [addingToList, setAddingToList] = useState(false);

  /** Queue everything this recipe needs that the pantry can't cover. */
  const handleAddMissingToShoppingList = async () => {
    if (!recipe) return;
    const needs = computeIngredientNeeds(
      recipe.ingredients,
      inventory,
      safeScale(servings, recipe.servings),
    );
    const lacking = needs.filter((n) => n.status === "missing" || n.status === "short");

    if (lacking.length === 0) {
      toast.success("You already have everything this recipe needs.");
      return;
    }

    const open = (shoppingItems ?? [])
      .filter((row) => !row.is_purchased)
      .map((row) => ({ name: row.name, item_id: row.item_id ?? null }));
    const queued = lacking.filter(
      (n) =>
        !shoppingListHasIngredient(open, {
          name: n.ingredient.name,
          item_id: n.ingredient.item_id ?? null,
        }),
    );

    if (queued.length === 0) {
      toast.info("Everything you're short of is already on your shopping list.");
      return;
    }

    setAddingToList(true);
    let added = 0;
    try {
      for (const need of queued) {
        const amount = need.shortfall > 0 ? need.shortfall : need.scaledQty ?? 1;
        const line = toShoppingLine(need.ingredient.name, amount, need.ingredient.unit ?? "");
        try {
          await createShoppingItem.mutateAsync({
            name: line.name,
            quantity: line.quantity,
            item_id: need.ingredient.item_id ?? null,
          });
          added += 1;
        } catch {
          // One bad row shouldn't strand the rest of the list.
        }
      }
    } finally {
      setAddingToList(false);
    }

    if (added === 0) toast.error("Could not add those to your shopping list.");
    else toast.success(`Added ${added} ${added === 1 ? "item" : "items"} to your shopping list`);
  };

  const handleEditImage = () => fileInputRef.current?.click();

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !recipe) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setUploadingImage(true);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const userId = userData.user?.id;
      if (!userId) throw new Error("You must be signed in to upload images");

      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("item-images")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from("item-images").getPublicUrl(path);
      const publicUrl = urlData.publicUrl;

      const { error: updErr } = await supabase
        .from("recipes")
        .update({ image_url: publicUrl })
        .eq("id", recipe.id);
      if (updErr) throw updErr;

      await qc.invalidateQueries({ queryKey: ["recipes"] });
      toast.success("Recipe image updated");
    } catch (error: unknown) {
      toast.error(errorMessage(error));
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

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
      const response = data as { error?: string } | null;
      if (response?.error) throw new Error(response.error);
      await qc.invalidateQueries({ queryKey: ["recipes"] });
      toast.success("Nutrition calculated");
    } catch (error: unknown) {
      toast.error(errorMessage(error));
    } finally {
      setCalculating(false);
    }
  };

  const handleSaveSteps = async (steps: string[]) => {
    if (!recipe) return;
    setSavingSteps(true);
    try {
      const joined = steps.map((s, i) => `${i + 1}. ${s}`).join("\n");
      const { error } = await supabase
        .from("recipes")
        .update({ instructions: joined })
        .eq("id", recipe.id);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["recipes"] });
      toast.success("Instructions updated");
    } catch (error: unknown) {
      toast.error(errorMessage(error));
    } finally {
      setSavingSteps(false);
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
        })
        .eq("id", recipe.id);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["recipes"] });
      toast.success("Nutrition updated");
    } catch (error: unknown) {
      toast.error(errorMessage(error));
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
        onEdit={() => setEditOpen(true)}
        onShare={
          databaseRecipe?.group_id === null
            ? () => setSharing(true)
            : undefined
        }
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
          onEditImage={handleEditImage}
          uploadingImage={uploadingImage}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageChange}
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
            onClick={handleAddMissingToShoppingList}
            disabled={inventoryLoading || shoppingLoading || addingToList}
            className="gap-2 rounded-full"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            {addingToList ? "Adding…" : "Add missing to Shopping List"}
          </Button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_360px] gap-5">
          <IngredientsCard
            ingredients={recipe.ingredients}
            baseServings={recipe.servings}
            servings={servings}
            onServingsChange={setServings}
            recipeId={databaseRecipe?.id}
            onAddIngredient={() => setAddIngredientOpen(true)}
          />
          <InstructionsCard
            steps={recipe.instructions}
            onOpenStepByStep={() => setStepMode(true)}
            onSaveSteps={handleSaveSteps}
            saving={savingSteps}
          />
          <NutritionCard
            nutrition={displayNutrition ?? recipe.nutrition}
            servings={servings}
            onCalculate={handleCalculateNutrition}
            calculating={calculating}
            onSave={handleSaveNutrition}
            saving={savingNutrition}
          />
        </div>

        {databaseRecipe && (
          <RecipeSourceCard
            recipeId={databaseRecipe.id}
            sourceUrl={databaseRecipe.source_url}
            sourceNotes={databaseRecipe.source_notes}
            imageUrl={databaseRecipe.image_url}
          />
        )}

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

      {databaseRecipe && (
        <EditRecipeDialog
          recipe={databaseRecipe}
          open={editOpen}
          onClose={() => setEditOpen(false)}
        />
      )}

      <ShareToGroupDialog
        open={sharing}
        onOpenChange={setSharing}
        payload={
          databaseRecipe
            ? { kind: "recipe", entries: [databaseRecipe] }
            : null
        }
        onShared={(mode) => {
          if (mode === "move") navigate("/recipes");
        }}
      />
    </div>
  );
};

export default RecipeDetail;
