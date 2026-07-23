import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Timer, Eye, X, Play, Pause, RotateCcw } from "lucide-react";
import type { Ingredient } from "@/data/cookbookMockData";
import { formatQuantity } from "@/data/cookbookMockData";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  steps: string[];
  ingredients: Ingredient[];
  servingsScale: number;
}

const StepByStepMode = ({ open, onOpenChange, steps, ingredients, servingsScale }: Props) => {
  const [step, setStep] = useState(0);
  const [drawer, setDrawer] = useState(false);
  const [awake, setAwake] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  useEffect(() => {
    let sentinel: any;
    if (awake && "wakeLock" in navigator) {
      // @ts-ignore
      navigator.wakeLock.request("screen").then((s: any) => (sentinel = s)).catch(() => {});
    }
    return () => { try { sentinel?.release?.(); } catch {} };
  }, [awake]);

  const pct = ((step + 1) / steps.length) * 100;
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl gap-0 p-0">
        <div className="p-6 sm:p-10">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              Step {step + 1} of {steps.length}
            </span>
            <button onClick={() => onOpenChange(false)} className="h-8 w-8 rounded-full hover:bg-muted flex items-center justify-center">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>

          <p className="mt-8 font-serif text-2xl sm:text-3xl leading-snug text-foreground min-h-[6rem]">
            {steps[step]}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-border/60 px-3 py-1.5">
              <Timer className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium tabular-nums">{mm}:{ss}</span>
              <button onClick={() => setRunning((r) => !r)} className="h-6 w-6 rounded-full hover:bg-muted flex items-center justify-center">
                {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              </button>
              <button onClick={() => { setSeconds(0); setRunning(false); }} className="h-6 w-6 rounded-full hover:bg-muted flex items-center justify-center">
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>

            <button
              onClick={() => setAwake((a) => !a)}
              className={`text-xs rounded-full px-3 py-1.5 border ${awake ? "border-primary text-primary bg-primary/10" : "border-border/60 text-muted-foreground"}`}
            >
              {awake ? "Screen on" : "Keep screen awake"}
            </button>

            <button onClick={() => setDrawer((d) => !d)} className="ml-auto text-xs rounded-full px-3 py-1.5 border border-border/60 text-muted-foreground hover:text-foreground flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5" /> Ingredients
            </button>
          </div>

          {drawer && (
            <div className="mt-4 rounded-2xl border border-border/60 bg-muted/30 p-4 max-h-56 overflow-y-auto">
              <ul className="space-y-1.5 text-sm">
                {ingredients.map((ing) => (
                  <li key={ing.id} className="flex justify-between gap-4">
                    <span className="text-foreground">{ing.name}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {formatQuantity(ing.quantity != null ? ing.quantity * servingsScale : null, ing.unit, { toTaste: ing.toTaste, optional: ing.optional })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-8 flex justify-between">
            <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="rounded-full gap-2">
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            <Button onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))} disabled={step === steps.length - 1} className="rounded-full gap-2">
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StepByStepMode;