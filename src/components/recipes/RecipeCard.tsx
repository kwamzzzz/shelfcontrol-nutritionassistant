import { useState } from "react";
import { type RecipeWithIngredients, useDeleteRecipe, useCookRecipe } from "@/hooks/useRecipes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ChevronDown, ChevronRight, Trash2, Pencil, UtensilsCrossed } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  recipe: RecipeWithIngredients;
  onEdit: () => void;
}

const RecipeCard = ({ recipe, onEdit }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const deleteRecipe = useDeleteRecipe();
  const cookRecipe = useCookRecipe();
  const { toast } = useToast();

  const handleDelete = async () => {
    try {
      await deleteRecipe.mutateAsync(recipe.id);
      toast({ title: "Deleted", description: "Recipe removed." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleCook = async () => {
    try {
      const result = await cookRecipe.mutateAsync(recipe);
      if (result.shortages.length > 0) {
        const shortList = result.shortages
          .map((s) => `${s.name}: needed ${s.needed}, had ${s.available}`)
          .join("; ");
        toast({
          title: "Cooked with shortages",
          description: `Some ingredients were insufficient: ${shortList}. Consumption was still logged.`,
        });
      } else {
        toast({ title: "Cooked!", description: `${recipe.name} — ingredients deducted from pantry.` });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const ingCount = recipe.recipe_ingredients?.length ?? 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-xl border bg-card overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center gap-3 p-4 text-left hover:bg-accent/30 transition-colors">
            <div className="shrink-0">
              {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium text-foreground truncate">{recipe.name}</p>
                <Badge variant="secondary" className="text-xs font-normal shrink-0">
                  {ingCount} ingredient{ingCount !== 1 ? "s" : ""}
                </Badge>
                {recipe.servings && (
                  <span className="text-xs text-muted-foreground shrink-0">{recipe.servings} serving{recipe.servings !== 1 ? "s" : ""}</span>
                )}
              </div>
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t px-4 pb-3 pt-2 space-y-3">
            {/* Instructions */}
            {recipe.instructions && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Instructions</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{recipe.instructions}</p>
              </div>
            )}

            {/* Ingredients table */}
            {ingCount > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground">
                    <th className="text-left py-1.5 font-medium">Ingredient</th>
                    <th className="text-right py-1.5 font-medium">Qty</th>
                    <th className="text-right py-1.5 font-medium">Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {recipe.recipe_ingredients.map((ri) => (
                    <tr key={ri.id} className="border-t border-border/50">
                      <td className="py-1.5 text-foreground">{ri.items?.name ?? "Unknown"}</td>
                      <td className="py-1.5 text-right text-muted-foreground tabular-nums">{ri.quantity}</td>
                      <td className="py-1.5 text-right text-muted-foreground">{ri.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="py-2 text-sm text-muted-foreground">No ingredients listed.</p>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-1">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={cookRecipe.isPending}>
                    <UtensilsCrossed className="mr-1.5 h-3.5 w-3.5" />
                    {cookRecipe.isPending ? "Cooking..." : "Cook"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cook {recipe.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will log consumption for each ingredient and deduct quantities from your pantry inventory (oldest stock first).
                      {ingCount === 0 && " This recipe has no ingredients — only a consumption event will be logged."}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCook}>Cook Now</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={onEdit}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete {recipe.name}?</AlertDialogTitle>
                      <AlertDialogDescription>This will permanently remove the recipe and its ingredients.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

export default RecipeCard;
