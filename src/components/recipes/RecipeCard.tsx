import { useState, MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { type RecipeWithIngredients, useDeleteRecipe, useCreateRecipe } from "@/hooks/useRecipes";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  MoreHorizontal,
  Heart,
  Users,
  Clock,
  UtensilsCrossed,
  Pencil,
  Trash2,
  Copy,
  CalendarPlus,
  ShoppingCart,
  ImageIcon,
  Check,
  Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useSignedImage } from "@/hooks/useSignedImage";
import RecipeTagEditor from "./RecipeTagEditor";

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Please try again.";

interface Props {
  recipe: RecipeWithIngredients;
  onEdit: () => void;
  favorite?: boolean;
  onToggleFavorite?: () => void;
  knownTags?: string[];
  onShare?: () => void;
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelected?: () => void;
  addedBy?: string;
}

const RecipeCard = ({
  recipe,
  onEdit,
  favorite,
  onToggleFavorite,
  knownTags,
  onShare,
  selectionMode = false,
  selected = false,
  onToggleSelected,
  addedBy,
}: Props) => {
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const deleteRecipe = useDeleteRecipe();
  const createRecipe = useCreateRecipe();
  const { toast } = useToast();
  const signedImage = useSignedImage(recipe.image_url);

  const ingCount = recipe.recipe_ingredients?.length ?? 0;
  const tags = recipe.tags ?? [];
  const stop = (e: MouseEvent) => e.stopPropagation();

  const handleDelete = async () => {
    try {
      await deleteRecipe.mutateAsync(recipe.id);
      toast({ title: "Recipe deleted" });
    } catch (error: unknown) {
      toast({ title: "Error", description: errorMessage(error), variant: "destructive" });
    }
  };

  const handleDuplicate = async () => {
    try {
      await createRecipe.mutateAsync({
        name: `${recipe.name} (Copy)`,
        servings: recipe.servings,
        instructions: recipe.instructions,
        image_url: recipe.image_url,
        ingredients: recipe.recipe_ingredients.map((ri) => ({
          item_id: ri.item_id,
          quantity: Number(ri.quantity),
          unit: ri.unit,
        })),
      });
      toast({ title: "Recipe duplicated" });
    } catch (error: unknown) {
      toast({ title: "Error", description: errorMessage(error), variant: "destructive" });
    }
  };

  const notImpl = (label: string) => () => toast({ title: `${label} — coming soon` });

  return (
    <>
      <div
        onClick={
          selectionMode
            ? onToggleSelected
            : () => navigate(`/recipes/${recipe.id}`)
        }
        className={cn(
          "group relative flex cursor-pointer flex-row overflow-hidden rounded-2xl border bg-card shadow-sm transition-all focus-within:ring-2 focus-within:ring-primary/40 sm:flex-col",
          selected
            ? "border-primary ring-2 ring-primary ring-offset-2 ring-offset-background"
            : "border-border/60 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
        )}
        role="button"
        tabIndex={0}
        aria-pressed={selectionMode ? selected : undefined}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (selectionMode) onToggleSelected?.();
            else navigate(`/recipes/${recipe.id}`);
          }
        }}
      >
        <div className="relative h-full w-2/5 sm:h-auto sm:w-full sm:aspect-[4/3] lg:aspect-square overflow-hidden bg-muted shrink-0">
          {signedImage ? (
            <img
              src={signedImage}
              alt={recipe.name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/5 to-primary/15 text-primary/40">
              <ImageIcon className="h-10 w-10" />
            </div>
          )}

          {selectionMode ? (
            <span
              aria-hidden
              className={cn(
                "absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border-2 shadow-sm backdrop-blur",
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-white/90 bg-background/85 text-transparent",
              )}
            >
              <Check className="h-4 w-4" strokeWidth={3} />
            </span>
          ) : (
            <button
              onClick={(e) => {
                stop(e);
                onToggleFavorite?.();
              }}
              aria-label={favorite ? "Unfavorite" : "Favorite"}
              className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-background/85 shadow-sm backdrop-blur transition-colors hover:bg-background"
            >
              <Heart
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-colors",
                  favorite && "fill-rose-500 text-rose-500",
                )}
              />
            </button>
          )}

          {!selectionMode && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={stop}>
                <button
                  aria-label="Recipe actions"
                  className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-background/85 shadow-sm backdrop-blur transition-colors hover:bg-background"
                >
                  <MoreHorizontal className="h-4 w-4 text-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={stop} className="w-52">
                <DropdownMenuItem onClick={notImpl("Add to Meal Plan")}>
                  <CalendarPlus className="mr-2 h-4 w-4" /> Add to Meal Plan
                </DropdownMenuItem>
                <DropdownMenuItem onClick={notImpl("Add to Shopping List")}>
                  <ShoppingCart className="mr-2 h-4 w-4" /> Add to Shopping List
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onToggleFavorite?.()}>
                  <Heart className={cn("mr-2 h-4 w-4", favorite && "fill-rose-500 text-rose-500")} />
                  {favorite ? "Remove Favorite" : "Mark as Favorite"}
                </DropdownMenuItem>
                {onShare && (
                  <DropdownMenuItem onClick={onShare}>
                    <Share2 className="mr-2 h-4 w-4" /> Share to Group
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit Recipe
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDuplicate} disabled={createRecipe.isPending}>
                  <Copy className="mr-2 h-4 w-4" /> Duplicate Recipe
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Recipe
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <div className="absolute bottom-3 left-3">
            <Badge className="bg-background/85 text-foreground backdrop-blur hover:bg-background/85 border-0 font-normal">
              <UtensilsCrossed className="mr-1 h-3 w-3" />
              {ingCount} ingredient{ingCount !== 1 ? "s" : ""}
            </Badge>
          </div>
        </div>

        <div className="flex flex-1 flex-col p-4">
          <h3 className="font-serif text-lg leading-snug text-foreground line-clamp-2 group-hover:text-primary transition-colors">
            {recipe.name}
          </h3>
          {recipe.instructions && (
            <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">
              {recipe.instructions.split("\n")[0]}
            </p>
          )}

          {addedBy && (
            <p className="mt-2 truncate text-xs font-medium text-primary/80">
              Shared by {addedBy}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-1.5" onClick={selectionMode ? undefined : stop}>
            {tags.slice(0, 3).map((t) => (
              <span
                key={t}
                className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-medium"
              >
                {t}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="text-[11px] text-muted-foreground">+{tags.length - 3}</span>
            )}
            {!selectionMode && (
              <RecipeTagEditor recipeId={recipe.id} tags={tags} knownTags={knownTags} compact />
            )}
          </div>

          <div className="mt-auto flex items-center gap-4 pt-4 text-xs text-muted-foreground">
            {recipe.servings ? (
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {recipe.servings} serving{recipe.servings !== 1 ? "s" : ""}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {new Date(recipe.created_at).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        </div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {recipe.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the recipe and its ingredients. This action can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default RecipeCard;
