import { LayoutGrid, ListChecks, ChefHat, Activity, StickyNote, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type SectionKey = "overview" | "ingredients" | "instructions" | "nutrition" | "tips" | "related";

const ITEMS: { key: SectionKey; label: string; icon: any }[] = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "ingredients", label: "Ingredients", icon: ListChecks },
  { key: "instructions", label: "Instructions", icon: ChefHat },
  { key: "nutrition", label: "Nutrition", icon: Activity },
  { key: "tips", label: "Tips & Notes", icon: StickyNote },
  { key: "related", label: "Related Recipes", icon: Sparkles },
];

interface Props {
  active: SectionKey;
  onChange: (k: SectionKey) => void;
  currentIndex: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}

const RecipeSectionNav = ({ active, onChange, currentIndex, total, onPrev, onNext }: Props) => (
  <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur p-2 shadow-sm">
    <div className="flex flex-col gap-1">
      {ITEMS.map((it) => {
        const Icon = it.icon;
        const isActive = active === it.key;
        return (
          <button
            key={it.key}
            onClick={() => onChange(it.key)}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-left transition-colors",
              isActive
                ? "bg-primary/15 text-primary font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {it.label}
          </button>
        );
      })}
    </div>
    <div className="mt-2 flex items-center justify-between border-t border-border/50 pt-2 px-1">
      <span className="text-xs text-muted-foreground">
        {currentIndex + 1} of {total} recipes
      </span>
      <div className="flex gap-1">
        <button
          onClick={onPrev}
          className="h-7 w-7 rounded-full border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Previous recipe"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onNext}
          className="h-7 w-7 rounded-full border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Next recipe"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  </div>
);

export default RecipeSectionNav;