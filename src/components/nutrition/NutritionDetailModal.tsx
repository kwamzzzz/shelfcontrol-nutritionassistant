import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Flame, Beef, Wheat, Droplets } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: {
    name: string;
    category?: string | null;
    serving_size?: string | null;
    calories_per_unit?: number | null;
    protein_g?: number | null;
    carbs_g?: number | null;
    fat_g?: number | null;
    fiber_g?: number | null;
    sugar_g?: number | null;
    sodium_mg?: number | null;
    nutrition_basis?: string | null;
  } | null;
}

const MACRO_CARDS = [
  { key: "calories_per_unit", label: "Calories", unit: "kcal", icon: Flame, color: "text-primary", bg: "bg-primary/10" },
  { key: "protein_g", label: "Protein", unit: "g", icon: Beef, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { key: "carbs_g", label: "Carbs", unit: "g", icon: Wheat, color: "text-amber-500", bg: "bg-amber-500/10" },
  { key: "fat_g", label: "Fats", unit: "g", icon: Droplets, color: "text-rose-500", bg: "bg-rose-500/10" },
];

const MICROS = [
  { key: "sodium_mg", label: "Sodium", unit: "mg" },
  { key: "fiber_g", label: "Fiber", unit: "g" },
  { key: "sugar_g", label: "Sugar", unit: "g" },
];

const NutritionDetailModal = ({ open, onOpenChange, item }: Props) => {
  if (!item) return null;

  const basisLabel = item.nutrition_basis === "per_100g" ? "per 100g" : item.nutrition_basis === "per_serving" ? "per serving" : "per unit";

  // Simple "Good" / "Needs data" check
  const hasMicros = (item.sodium_mg ?? 0) > 0 || (item.fiber_g ?? 0) > 0 || (item.sugar_g ?? 0) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">{item.name}</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2 mt-1">
          {item.serving_size && (
            <Badge variant="secondary" className="text-[10px] rounded-full">🍽 {item.serving_size}</Badge>
          )}
          {item.category && (
            <Badge variant="secondary" className="text-[10px] rounded-full">🏷 {item.category}</Badge>
          )}
          <Badge variant="secondary" className="text-[10px] rounded-full">{basisLabel}</Badge>
        </div>

        {/* Macro Grid */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          {MACRO_CARDS.map(({ key, label, unit, icon: Icon, color, bg }) => (
            <div key={key} className={cn("rounded-2xl p-4", bg)}>
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className={cn("h-4 w-4", color)} />
                <span className={cn("text-xs font-medium", color)}>{label}</span>
              </div>
              <p className="text-xl font-bold tabular-nums text-foreground">
                {Number((item as any)[key] ?? 0).toFixed(0)}
                <span className="text-xs font-normal text-muted-foreground ml-1">{unit}</span>
              </p>
            </div>
          ))}
        </div>

        {/* Micronutrients */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-foreground">Micronutrients</span>
            <Badge variant="secondary" className={cn("text-[10px] rounded-full", hasMicros ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground")}>
              {hasMicros ? "Good" : "Needs data"}
            </Badge>
          </div>
          <div className="space-y-2.5">
            {MICROS.map(({ key, label, unit }) => {
              const val = Number((item as any)[key] ?? 0);
              return (
                <div key={key} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <span className="text-sm text-foreground">{label}</span>
                  <span className="text-sm font-medium tabular-nums text-foreground">{val} {unit}</span>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NutritionDetailModal;
