import { Heart, Pencil, Timer, Flame, Users, Zap, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MockRecipe } from "@/data/cookbookMockData";

interface Props {
  recipe: MockRecipe;
  servings: number;
  favorite: boolean;
  onToggleFavorite: () => void;
  onEditImage: () => void;
  uploadingImage?: boolean;
}

const RecipeHero = ({ recipe, servings, favorite, onToggleFavorite, onEditImage, uploadingImage }: Props) => {
  const stats = [
    { label: "Prep Time", value: `${recipe.prepMins} mins`, icon: Timer },
    { label: "Cook Time", value: `${recipe.cookMins} mins`, icon: Flame },
    { label: "Servings", value: `${servings}`, icon: Users },
    { label: "Calories", value: `~${recipe.caloriesPerServing} kcal`, icon: Zap },
  ];

  return (
    <div className="rounded-3xl border border-border/60 bg-card/60 backdrop-blur overflow-hidden shadow-sm">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-0">
        <div className="relative aspect-[4/3] lg:aspect-auto lg:min-h-[360px]">
          <img
            src={recipe.image}
            alt={recipe.title}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <button
            onClick={onEditImage}
            disabled={uploadingImage}
            className="absolute top-3 right-3 h-9 w-9 rounded-full bg-background/80 backdrop-blur border border-border/60 flex items-center justify-center text-foreground hover:bg-background transition-colors disabled:opacity-70"
            aria-label="Edit image"
          >
            {uploadingImage ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Pencil className="h-4 w-4" />
            )}
          </button>
        </div>

        <div className="p-6 lg:p-8 flex flex-col">
          <div className="flex items-start justify-between gap-4">
            <h1 className="font-serif text-3xl lg:text-4xl leading-tight tracking-tight text-foreground">
              {recipe.title}
            </h1>
            <button
              onClick={onToggleFavorite}
              className="shrink-0 h-10 w-10 rounded-full border border-border/60 flex items-center justify-center hover:bg-muted transition-colors"
              aria-label="Favorite"
            >
              <Heart
                className={cn(
                  "h-5 w-5 transition-colors",
                  favorite ? "text-rose-500 fill-rose-500" : "text-muted-foreground",
                )}
              />
            </button>
          </div>

          <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-prose">
            {recipe.description}
          </p>

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.label}
                  className="rounded-2xl border border-border/60 bg-background/50 p-3 flex items-center gap-3"
                >
                  <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {s.label}
                    </div>
                    <div className="text-sm font-medium text-foreground truncate">{s.value}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {recipe.tags.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {recipe.tags.map((t) => (
                <span
                  key={t}
                  className="px-3 py-1 rounded-full text-xs border border-border/60 text-foreground/80 bg-background/40"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecipeHero;