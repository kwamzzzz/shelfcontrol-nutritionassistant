import { Check, Loader2, Pencil, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { MockRecipe } from "@/data/cookbookMockData";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface Props {
  nutrition: MockRecipe["nutrition"];
  servings: number;
  onCalculate: () => void;
  calculating?: boolean;
  onSave?: (n: MockRecipe["nutrition"]) => Promise<void> | void;
  saving?: boolean;
}

const NutritionCard = ({ nutrition, servings, onCalculate, calculating = false, onSave, saving = false }: Props) => {
  const [mode, setMode] = useState<"per-serving" | "total">("per-serving");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(nutrition);
  useEffect(() => {
    setDraft(nutrition);
  }, [nutrition]);
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

  const handleSave = async () => {
    if (!onSave) return;
    await onSave({
      calories: Number(draft.calories) || 0,
      carbs: Number(draft.carbs) || 0,
      protein: Number(draft.protein) || 0,
      fat: Number(draft.fat) || 0,
      fiber: Number(draft.fiber) || 0,
      sugar: Number(draft.sugar) || 0,
      sodium: Number(draft.sodium) || 0,
    });
    setEditing(false);
  };

  const fields: { key: keyof MockRecipe["nutrition"]; label: string; unit: string }[] = [
    { key: "calories", label: "Calories", unit: "kcal" },
    { key: "carbs", label: "Carbs", unit: "g" },
    { key: "protein", label: "Protein", unit: "g" },
    { key: "fat", label: "Fat", unit: "g" },
    { key: "fiber", label: "Fiber", unit: "g" },
    { key: "sugar", label: "Sugar", unit: "g" },
    { key: "sodium", label: "Sodium", unit: "mg" },
  ];

  if (editing) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-foreground">Edit Nutrition</h3>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Per serving</span>
        </div>
        <div className="mt-4 space-y-2">
          {fields.map((f) => (
            <div key={f.key} className="flex items-center justify-between gap-2 text-sm">
              <label className="text-muted-foreground">{f.label}</label>
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min={0}
                  step="0.1"
                  value={String(draft[f.key] ?? 0)}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, [f.key]: e.target.value === "" ? 0 : Number(e.target.value) }))
                  }
                  className="h-8 w-24 text-right tabular-nums"
                />
                <span className="w-8 text-xs text-muted-foreground">{f.unit}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground text-sm py-2 hover:bg-primary/90 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Save
          </button>
          <button
            onClick={() => {
              setDraft(nutrition);
              setEditing(false);
            }}
            disabled={saving}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-border/60 text-sm py-2 hover:bg-muted disabled:opacity-60"
          >
            <X className="h-3.5 w-3.5" /> Cancel
          </button>
        </div>
      </div>
    );
  }

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
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button
              onClick={onCalculate}
              disabled={calculating}
              className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground text-sm px-4 py-2 hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {calculating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {calculating ? "Calculating…" : "Calculate Nutrition"}
            </button>
            {onSave && (
              <button
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-2 rounded-full border border-border/60 text-sm px-4 py-2 hover:bg-muted transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" /> Enter Manually
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-medium text-foreground">Nutrition</h3>
        <div className="flex items-center gap-1.5">
          <Select value={mode} onValueChange={(v) => setMode(v as "per-serving" | "total")}>
            <SelectTrigger className="h-7 w-[130px] text-xs rounded-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="per-serving">Per serving</SelectItem>
              <SelectItem value="total">Total ({servings})</SelectItem>
            </SelectContent>
          </Select>
          {onSave && (
            <button
              onClick={() => setEditing(true)}
              title="Edit nutrition"
              className="h-7 w-7 inline-flex items-center justify-center rounded-full border border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
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
        onClick={onCalculate}
        disabled={calculating}
        className="mt-4 w-full rounded-xl border border-border/60 py-2 text-sm text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {calculating ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Recalculating…
          </>
        ) : (
          <>
            <Sparkles className="h-3.5 w-3.5" /> Recalculate Nutrition
          </>
        )}
      </button>
    </div>
  );
};

export default NutritionCard;