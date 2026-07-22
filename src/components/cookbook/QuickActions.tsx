import { CalendarPlus, ShoppingCart, Copy, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  favorite: boolean;
  onToggleFavorite: () => void;
  onAddMealPlan: () => void;
  onAddShopping: () => void;
  onDuplicate: () => void;
}

const QuickActions = ({ favorite, onToggleFavorite, onAddMealPlan, onAddShopping, onDuplicate }: Props) => {
  const items = [
    { label: "Add to Meal Plan", icon: CalendarPlus, onClick: onAddMealPlan },
    { label: "Add to Shopping List", icon: ShoppingCart, onClick: onAddShopping },
    { label: "Duplicate Recipe", icon: Copy, onClick: onDuplicate },
    {
      label: favorite ? "Favorited" : "Mark as Favorite",
      icon: Heart,
      onClick: onToggleFavorite,
      active: favorite,
    },
  ];
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur p-3 shadow-sm">
      <h3 className="text-sm font-medium text-foreground px-2 py-1.5">Quick Actions</h3>
      <div className="flex flex-col gap-1 mt-1">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <button
              key={it.label}
              onClick={it.onClick}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Icon
                className={cn(
                  "h-4 w-4",
                  it.active && "text-rose-500 fill-rose-500",
                )}
              />
              <span className={cn(it.active && "text-foreground")}>{it.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default QuickActions;