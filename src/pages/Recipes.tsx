import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useRecipes, type RecipeWithIngredients } from "@/hooks/useRecipes";
import AddRecipeDialog from "@/components/recipes/AddRecipeDialog";
import EditRecipeDialog from "@/components/recipes/EditRecipeDialog";
import RecipeCard from "@/components/recipes/RecipeCard";
import RecipeImportDialog from "@/components/recipes/RecipeImportDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BookOpen,
  Search,
  Sparkles,
  ArrowRight,
  ImageIcon,
  Users,
  UtensilsCrossed,
  Heart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MOCK_RECIPES } from "@/data/cookbookMockData";

const CATEGORIES = [
  "All Recipes",
  "Favourites",
  "Breakfast",
  "Lunch",
  "Dinner",
  "Soups",
  "Salads",
  "Sides",
  "Desserts",
  "Quick & Easy",
];

const FAV_KEY = "cookbook.favorites.v1";

const loadFavorites = (): Set<string> => {
  try {
    return new Set(JSON.parse(localStorage.getItem(FAV_KEY) || "[]"));
  } catch {
    return new Set();
  }
};

const Recipes = () => {
  const { data: recipes, isLoading, isError, refetch } = useRecipes();
  const [editing, setEditing] = useState<RecipeWithIngredients | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All Recipes");
  const [sort, setSort] = useState<"recent" | "name" | "ingredients">("recent");
  const [favorites, setFavorites] = useState<Set<string>>(() => loadFavorites());

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      localStorage.setItem(FAV_KEY, JSON.stringify([...next]));
      return next;
    });
  };

  const filtered = useMemo(() => {
    let list = recipes ?? [];
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.instructions ?? "").toLowerCase().includes(q),
      );
    }
    if (category === "Favourites") {
      list = list.filter((r) => favorites.has(r.id));
    }
    const sorted = [...list];
    if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "ingredients")
      sorted.sort(
        (a, b) => (b.recipe_ingredients?.length ?? 0) - (a.recipe_ingredients?.length ?? 0),
      );
    else sorted.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    return sorted;
  }, [recipes, query, category, sort, favorites]);

  const gridList = filtered;
  const totalCount = recipes?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-serif text-foreground">My Cook Book</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {totalCount} recipe{totalCount !== 1 ? "s" : ""} saved
            {favorites.size > 0 && ` · ${favorites.size} favourite${favorites.size !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/recipes/${MOCK_RECIPES[0].id}`}
            className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-2 text-sm text-primary hover:bg-primary/10 transition-colors"
          >
            <Sparkles className="h-4 w-4" /> Sample cookbook page
          </Link>
          <RecipeImportDialog />
          <AddRecipeDialog />
        </div>
      </div>

      {/* Search + sort */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search recipes…"
            className="pl-9"
          />
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Most recent</SelectItem>
            <SelectItem value="name">Name (A–Z)</SelectItem>
            <SelectItem value="ingredients">Most ingredients</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Category chips */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={cn(
              "whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm transition-colors",
              category === c
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border/70 bg-card text-muted-foreground hover:text-foreground hover:border-border",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-border/60 bg-card">
              <Skeleton className="aspect-[4/3] w-full rounded-none" />
              <div className="space-y-2 p-4">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-border/60 bg-card p-10 text-center">
          <p className="text-foreground">We couldn't load your cookbook.</p>
          <Button variant="outline" className="mt-4" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : !totalCount ? (
        <EmptyState />
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/70 bg-card/60 p-10 text-center">
          <Search className="mx-auto h-8 w-8 text-muted-foreground/60" />
          <p className="mt-3 font-medium text-foreground">No recipes match your search</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try a different keyword or clear your filters.
          </p>
          <Button
            variant="ghost"
            className="mt-4"
            onClick={() => {
              setQuery("");
              setCategory("All Recipes");
            }}
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {gridList.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              favorite={favorites.has(recipe.id)}
              onToggleFavorite={() => toggleFavorite(recipe.id)}
              onEdit={() => setEditing(recipe)}
            />
          ))}
        </div>
      )}

      {editing && (
        <EditRecipeDialog recipe={editing} open={!!editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
};

const FeaturedCard = ({
  recipe,
  favorite,
  onToggleFavorite,
}: {
  recipe: RecipeWithIngredients;
  favorite: boolean;
  onToggleFavorite: () => void;
}) => {
  const ingCount = recipe.recipe_ingredients?.length ?? 0;
  return (
    <div className="grid grid-cols-1 gap-0 overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm md:grid-cols-[1.15fr_1fr]">
      <div className="relative aspect-[16/10] md:aspect-auto md:min-h-[280px]">
        {recipe.image_url ? (
          <img
            src={recipe.image_url}
            alt={recipe.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/25 text-primary/50">
            <ImageIcon className="h-14 w-14" />
          </div>
        )}
        <div className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-background/85 px-3 py-1 text-xs font-medium text-primary backdrop-blur">
          <Sparkles className="h-3.5 w-3.5" /> Featured
        </div>
        <button
          onClick={onToggleFavorite}
          aria-label={favorite ? "Unfavorite" : "Favorite"}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-background/85 backdrop-blur shadow-sm hover:bg-background transition-colors"
        >
          <Heart className={cn("h-4 w-4", favorite ? "fill-rose-500 text-rose-500" : "text-muted-foreground")} />
        </button>
      </div>

      <div className="flex flex-col justify-between gap-6 p-6 md:p-8">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">From your cookbook</p>
          <h2 className="mt-2 font-serif text-2xl md:text-3xl leading-tight text-foreground">
            {recipe.name}
          </h2>
          {recipe.instructions && (
            <p className="mt-3 text-sm text-muted-foreground line-clamp-3">
              {recipe.instructions.split("\n")[0]}
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            {recipe.servings ? (
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-4 w-4" /> {recipe.servings} serving{recipe.servings !== 1 ? "s" : ""}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1.5">
              <UtensilsCrossed className="h-4 w-4" /> {ingCount} ingredient{ingCount !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div>
          <Link to={`/recipes/${recipe.id}`}>
            <Button className="group">
              View recipe
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

const EmptyState = () => (
  <div className="rounded-3xl border border-dashed border-border/70 bg-card/60 p-12 text-center">
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
      <BookOpen className="h-7 w-7 text-primary" />
    </div>
    <h2 className="mt-4 font-serif text-2xl text-foreground">Your cookbook is empty</h2>
    <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
      Save recipes from anywhere to start cooking from your pantry. Import from a link,
      create your own, or browse a sample page to see the experience.
    </p>
    <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
      <AddRecipeDialog />
      <RecipeImportDialog />
      <Link
        to={`/recipes/${MOCK_RECIPES[0].id}`}
        className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-2 text-sm text-primary hover:bg-primary/10 transition-colors"
      >
        <Sparkles className="h-4 w-4" /> Sample cookbook page
      </Link>
    </div>
  </div>
);

export default Recipes;