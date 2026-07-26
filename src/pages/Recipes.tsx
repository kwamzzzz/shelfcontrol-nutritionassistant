import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useRecipes, type RecipeWithIngredients } from "@/hooks/useRecipes";
import { useGroupContext } from "@/contexts/GroupContext";
import { useGroups } from "@/hooks/useGroups";
import { useProfileNames } from "@/hooks/useProfileNames";
import AddRecipeDialog from "@/components/recipes/AddRecipeDialog";
import EditRecipeDialog from "@/components/recipes/EditRecipeDialog";
import RecipeCard from "@/components/recipes/RecipeCard";
import RecipeImportDialog from "@/components/recipes/RecipeImportDialog";
import ShareToGroupDialog from "@/components/groups/ShareToGroupDialog";
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
import { BookOpen, Search, Share2, Sparkles, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { MOCK_RECIPES } from "@/data/cookbookMockData";
import { DEFAULT_TAGS } from "@/components/recipes/RecipeTagEditor";

const SPECIAL_CATEGORIES = ["All Recipes", "Favourites"];

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
  const { activeGroupId, isPersonalMode } = useGroupContext();
  const { groups } = useGroups();
  const activeGroup = groups.find((group) => group.id === activeGroupId);
  const [editing, setEditing] = useState<RecipeWithIngredients | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [shareEntries, setShareEntries] = useState<RecipeWithIngredients[] | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All Recipes");
  const [sort, setSort] = useState<"recent" | "name" | "ingredients">("recent");
  const [favorites, setFavorites] = useState<Set<string>>(() => loadFavorites());

  useEffect(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
    setShareEntries(null);
    setEditing(null);
  }, [activeGroupId]);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem(FAV_KEY, JSON.stringify([...next]));
      return next;
    });
  };

  const knownTags = useMemo(() => {
    const set = new Set<string>(DEFAULT_TAGS);
    for (const r of recipes ?? []) {
      for (const t of r.tags ?? []) set.add(t);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [recipes]);

  const categories = useMemo(() => [...SPECIAL_CATEGORIES, ...knownTags], [knownTags]);

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
    } else if (category !== "All Recipes") {
      list = list.filter((r) => (r.tags ?? []).includes(category));
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
  const selectedEntries = useMemo(
    () => (recipes ?? []).filter((recipe) => selectedIds.has(recipe.id)),
    [recipes, selectedIds],
  );
  const userIds = useMemo(() => (recipes ?? []).map((recipe) => recipe.user_id), [recipes]);
  const { data: profileMap } = useProfileNames(userIds);

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const cancelSelection = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const startSelection = () => {
    setSelectionMode(true);
    setSelectedIds(new Set());
  };

  const selectVisible = () => {
    setSelectedIds(new Set(gridList.map((recipe) => recipe.id)));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-serif text-foreground">
              {isPersonalMode ? "My Cook Book" : "Group Cook Book"}
            </h1>
            {!isPersonalMode && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                <Users className="h-3.5 w-3.5" />
                Shared
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {totalCount} recipe{totalCount !== 1 ? "s" : ""} saved
            {favorites.size > 0 && ` · ${favorites.size} favourite${favorites.size !== 1 ? "s" : ""}`}
            {!isPersonalMode && ` · shared with ${activeGroup?.name ?? "your group"}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isPersonalMode && (
            <Button
              type="button"
              variant="outline"
              onClick={startSelection}
              disabled={totalCount === 0}
              className="rounded-full"
            >
              <Share2 className="mr-2 h-4 w-4" />
              Share recipes
            </Button>
          )}
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

      {selectionMode && isPersonalMode && (
        <div className="sticky top-2 z-20 flex flex-wrap items-center gap-2 rounded-2xl border border-primary/20 bg-card/95 p-3 shadow-lg backdrop-blur">
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-semibold text-foreground">
              {selectedIds.size} selected
            </p>
            <p className="text-xs text-muted-foreground">
              Choose recipes to add to one shared cookbook.
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" className="rounded-xl" onClick={selectVisible}>
            Select visible
          </Button>
          <Button
            type="button"
            size="sm"
            className="rounded-xl"
            disabled={selectedEntries.length === 0}
            onClick={() => setShareEntries(selectedEntries)}
          >
            <Share2 className="mr-1.5 h-4 w-4" />
            Share selected
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl"
            onClick={cancelSelection}
            aria-label="Cancel recipe selection"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

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
        {categories.map((c) => (
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
              knownTags={knownTags}
              onShare={isPersonalMode ? () => setShareEntries([recipe]) : undefined}
              selectionMode={selectionMode}
              selected={selectedIds.has(recipe.id)}
              onToggleSelected={() => toggleSelected(recipe.id)}
              addedBy={activeGroupId ? profileMap?.get(recipe.user_id) : undefined}
            />
          ))}
        </div>
      )}

      {editing && (
        <EditRecipeDialog recipe={editing} open={!!editing} onClose={() => setEditing(null)} />
      )}

      <ShareToGroupDialog
        open={!!shareEntries}
        onOpenChange={(open) => {
          if (!open) setShareEntries(null);
        }}
        payload={shareEntries ? { kind: "recipe", entries: shareEntries } : null}
        onShared={() => cancelSelection()}
      />
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
