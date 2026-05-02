import { useMemo, useState } from "react";
import { useNutritionData } from "@/hooks/useNutrition";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame, AlertTriangle, EyeOff } from "lucide-react";

interface ActivityCost {
  label: string;
  caloriesPerHour: number;
}

const ACTIVITIES: ActivityCost[] = [
  { label: "brisk walking", caloriesPerHour: 280 },
  { label: "cycling (moderate)", caloriesPerHour: 480 },
  { label: "running (8 km/h)", caloriesPerHour: 600 },
  { label: "strength training", caloriesPerHour: 360 },
  { label: "swimming", caloriesPerHour: 500 },
  { label: "HIIT", caloriesPerHour: 720 },
];

const formatHours = (hours: number) => {
  if (!Number.isFinite(hours) || hours <= 0) return "—";
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
};

const HardTruths = () => {
  const [revealed, setRevealed] = useState(false);
  const { totals, weeklyTotals } = useNutritionData();

  const weekTotal = useMemo(
    () => weeklyTotals.reduce((sum, d) => sum + (d.calories ?? 0), 0),
    [weeklyTotals],
  );

  if (!revealed) {
    return (
      <Card className="rounded-2xl border-none shadow-sm">
        <CardContent className="p-8 text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-foreground">Hard Truths</p>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              An honest, slightly uncomfortable look at what your eating costs in effort. Reveal only when you're ready.
            </p>
          </div>
          <Button onClick={() => setRevealed(true)} variant="outline" className="rounded-xl gap-2">
            <Flame className="h-4 w-4" />
            Show me the truth
          </Button>
        </CardContent>
      </Card>
    );
  }

  const today = totals.calories;
  const empty = today === 0 && weekTotal === 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-amber-600" />
          <p className="text-sm text-muted-foreground">What it would cost to burn what you ate</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setRevealed(false)} className="text-xs gap-1.5">
          <EyeOff className="h-3.5 w-3.5" />
          Hide
        </Button>
      </div>

      {empty ? (
        <Card className="rounded-2xl border-none shadow-sm">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Nothing logged yet — log some meals first and the truth will follow.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="rounded-2xl border-none shadow-sm border-l-4 border-l-amber-500">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">Today</p>
              <p className="text-2xl font-bold tabular-nums text-foreground mt-0.5">
                {Math.round(today)} <span className="text-sm font-normal text-muted-foreground">cal</span>
              </p>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ACTIVITIES.map((a) => (
                  <div key={a.label} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
                    <span className="text-muted-foreground capitalize">{a.label}</span>
                    <span className="font-medium text-foreground tabular-nums">{formatHours(today / a.caloriesPerHour)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-none shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">Last 7 days</p>
              <p className="text-2xl font-bold tabular-nums text-foreground mt-0.5">
                {Math.round(weekTotal)} <span className="text-sm font-normal text-muted-foreground">cal</span>
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                That's roughly {formatHours(weekTotal / 600)} of running, or {formatHours(weekTotal / 280)} of brisk walking.
              </p>
            </CardContent>
          </Card>

          <p className="text-[11px] text-muted-foreground/80 px-1">
            Estimates based on average MET values for a 70 kg adult. Actual burn varies with weight, intensity and conditioning.
          </p>
        </>
      )}
    </div>
  );
};

export default HardTruths;
