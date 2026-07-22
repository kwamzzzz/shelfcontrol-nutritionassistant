import { ExternalLink, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import type { MockRecipe } from "@/data/cookbookMockData";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  nutrition: MockRecipe["nutrition"];
  servings: number;
  onFull: () => void;
}

const NutritionCard = ({ nutrition, servings, onFull }: Props) => {
  const [mode, setMode] = useState<"per-serving" | "total">("per-serving");
  const hasData =
    nutrition.calories > 0 ||
    nutrition.carbs > 0 ||
    nutrition.protein > 0 ||
    nutrition.fat > 0;
  const factor = mode === "total" ? servings : 1;
  const values = useMemo(
    () => ({
      calories: Math.round(nutrition.calories * factor),
      carbs: Math.round(nutrition.carbs * factor),
      protein: Math.round(nutrition.protein * factor),
      fat: Math.round(nutrition.fat * factor),
      fiber: Math.round(nutrition.fiber * factor),
      sugar: Math.round(nutrition.sugar * factor),
      sodium: Math.round(nutrition.sodium * factor),
    }),
    [nutrition, factor],
  );

  const goal = 2000 * factor;
  const pct = Math.min(100, Math.round((values.calories / goal) * 100));
  const circumference = 2 * Math.PI * 44;
  const dash = (pct / 100) * circumference;

  const rows: [string, string][] = [
    ["Calories", `${values.calories} kcal`],
    ["Carbs", `${values.carbs} g`],
    ["Protein", `${values.protein} g`],
    ["Fat", `${values.fat} g`],
    ["Fiber", `${values.fiber} g`],
    ["Sugar", `${values.sugar} g`],
    ["Sodium", `${values.sodium} mg`],
  ];

  if (!hasData) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur p-5 shadow-sm">
        <h3 className="font-medium text-foreground">Nutrition</h3>
        <div className="mt-6 flex flex-col items-center justify-center text-center py-8">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <Sparkles className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">Nutrition not calculated</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
            Estimate macros and calories for this recipe.
          </p>
          <button
            onClick={onFull}
            className="mt-4 rounded-full bg-primary text-primary-foreground text-sm px-4 py-2 hover:bg-primary/90 transition-colors"
          >
            Calculate Nutrition
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-medium text-foreground">Nutrition</h3>
        <Select value={mode} onValueChange={(v) => setMode(v as "per-serving" | "total")}>
          <SelectTrigger className="h-7 w-[130px] text-xs rounded-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="per-serving">Per serving</SelectItem>
            <SelectItem value="total">Total ({servings})</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-5 flex items-center justify-center">
        <div className="relative h-32 w-32">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle cx="50" cy="50" r="44" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circumference}`}
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-semibold text-foreground tabular-nums">{values.calories}</span>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">kcal</span>
          </div>
        </div>
      </div>

      <div className="mt-5 divide-y divide-border/40">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between py-1.5 text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium text-foreground tabular-nums">{value}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onFull}
        className="mt-4 w-full rounded-xl border border-border/60 py-2 text-sm text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-2"
      >
        View Full Nutrition <ExternalLink className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

export default NutritionCard;