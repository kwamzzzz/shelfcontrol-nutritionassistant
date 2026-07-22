import { useState } from "react";
import { useRecipes, type RecipeWithIngredients } from "@/hooks/useRecipes";
import AddRecipeDialog from "@/components/recipes/AddRecipeDialog";
import EditRecipeDialog from "@/components/recipes/EditRecipeDialog";
import RecipeCard from "@/components/recipes/RecipeCard";
import RecipeImportDialog from "@/components/recipes/RecipeImportDialog";
import { BookOpen, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { MOCK_RECIPES } from "@/data/cookbookMockData";

const Recipes = () => {
  const { data: recipes, isLoading } = useRecipes();
  const [editing, setEditing] = useState<RecipeWithIngredients | null>(null);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">My Cook Book</h1>
          <p className="mt-1 text-muted-foreground">
            {recipes?.length ?? 0} recipe{(recipes?.length ?? 0) !== 1 ? "s" : ""} saved
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/recipes/${MOCK_RECIPES[0].id}`}
            className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-sm text-primary hover:bg-primary/15 transition-colors"
          >
            <Sparkles className="h-4 w-4" /> View sample cookbook page
          </Link>
          <RecipeImportDialog />
          <AddRecipeDialog />
        </div>
      </div>

      <div className="mt-6 space-y-2">
        {isLoading ? (
          <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">Loading...</div>
        ) : !recipes?.length ? (
          <div className="rounded-xl border bg-card p-8 text-center">
            <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-muted-foreground">
              No recipes yet. Create your first recipe to start cooking from your pantry.
            </p>
          </div>
        ) : (
          recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} onEdit={() => setEditing(recipe)} />
          ))
        )}
      </div>

      {editing && (
        <EditRecipeDialog recipe={editing} open={!!editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
};

export default Recipes;
