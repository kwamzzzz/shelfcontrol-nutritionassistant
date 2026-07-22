import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import RecipeBreadcrumb from "@/components/cookbook/RecipeBreadcrumb";
import RecipeSectionNav, { type SectionKey } from "@/components/cookbook/RecipeSectionNav";
import QuickActions from "@/components/cookbook/QuickActions";
import RecipeHero from "@/components/cookbook/RecipeHero";
import IngredientsCard from "@/components/cookbook/IngredientsCard";
import InstructionsCard from "@/components/cookbook/InstructionsCard";
import NutritionCard from "@/components/cookbook/NutritionCard";
import RelatedRecipes from "@/components/cookbook/RelatedRecipes";
import StepByStepMode from "@/components/cookbook/StepByStepMode";
import { MOCK_RECIPES, type MockRecipe } from "@/data/cookbookMockData";
import { useRecipes, type RecipeWithIngredients } from "@/hooks/useRecipes";

const TOTAL_RECIPES = 42;
const CURRENT_INDEX = 1;

function adaptRecipe(r: RecipeWithIngredients): MockRecipe {
  const rawInstr = (r.instructions ?? "").trim();
  const steps = rawInstr
    ? rawInstr
        .split(/\n+/)
        .map((s) => s.replace(/^\s*\d+[\.\)]\s*/, "").trim())
        .filter(Boolean)
    : ["No instructions yet."];
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
    caloriesPerServing: 0,
    tags: [],
    ingredients: (r.recipe_ingredients ?? []).map((ing, i) => ({
      id: ing.id ?? `ing-${i}`,
      name: ing.items?.name ?? "Ingredient",
      quantity: ing.quantity ?? null,
      unit: ing.unit ?? "",
    })),
    instructions: steps,
    nutrition: { calories: 0, carbs: 0, protein: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 },
  };
}

const RecipeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: recipes, isLoading } = useRecipes();
  const recipe = useMemo<MockRecipe | null>(() => {
    const dbMatch = recipes?.find((r) => r.id === id);
    if (dbMatch) return adaptRecipe(dbMatch);
    const mock = MOCK_RECIPES.find((r) => r.id === id);
    return mock ?? null;
  }, [recipes, id]);

  const [active, setActive] = useState<SectionKey>("overview");
  const [servings, setServings] = useState(recipe?.servings ?? 1);
  const [favorite, setFavorite] = useState(false);
  const [stepMode, setStepMode] = useState(false);

  const scrollTo = (k: SectionKey) => {
    setActive(k);
    const el = document.getElementById(`section-${k}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const notImpl = (label: string) => () => toast.info(`${label} — coming soon`);

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
      />

      <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] gap-5">
        <aside className="space-y-4 lg:sticky lg:top-24 self-start">
          <RecipeSectionNav
            active={active}
            onChange={scrollTo}
            currentIndex={CURRENT_INDEX}
            total={TOTAL_RECIPES}
            onPrev={notImpl("Previous recipe")}
            onNext={notImpl("Next recipe")}
          />
          <QuickActions
            favorite={favorite}
            onToggleFavorite={() => setFavorite((f) => !f)}
            onAddMealPlan={notImpl("Add to Meal Plan")}
            onAddShopping={notImpl("Add to Shopping List")}
            onDuplicate={notImpl("Duplicate recipe")}
          />
        </aside>

        <div className="space-y-5 min-w-0">
          <div id="section-overview">
            <RecipeHero
              recipe={recipe}
              servings={servings}
              favorite={favorite}
              onToggleFavorite={() => setFavorite((f) => !f)}
              onEditImage={notImpl("Edit image")}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_320px] gap-5">
            <div id="section-ingredients">
              <IngredientsCard
                ingredients={recipe.ingredients}
                baseServings={recipe.servings}
                servings={servings}
                onServingsChange={setServings}
                onAddToShopping={notImpl("Add ingredient")}
              />
            </div>
            <div id="section-instructions">
              <InstructionsCard steps={recipe.instructions} onOpenStepByStep={() => setStepMode(true)} />
            </div>
            <div id="section-nutrition">
              <NutritionCard
                nutrition={recipe.nutrition}
                servings={servings}
                onFull={notImpl("View full nutrition")}
              />
            </div>
          </div>

          {recipe.tips && recipe.tips.length > 0 && (
            <div id="section-tips" className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur p-5 shadow-sm">
              <h3 className="font-medium text-foreground">Tips & Notes</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground list-disc list-inside">
                {recipe.tips.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          )}

          <div id="section-related">
            <RelatedRecipes />
          </div>
        </div>
      </div>

      <StepByStepMode
        open={stepMode}
        onOpenChange={setStepMode}
        steps={recipe.instructions}
        ingredients={recipe.ingredients}
        servingsScale={servings / recipe.servings}
      />
    </div>
  );
};

export default RecipeDetail;