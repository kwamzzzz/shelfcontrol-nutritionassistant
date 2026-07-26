import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Timer, Eye, Play, Pause, RotateCcw, ChefHat, Lightbulb } from "lucide-react";
import type { Ingredient } from "@/data/cookbookMockData";
import { formatQuantity } from "@/data/cookbookMockData";

interface WakeLockSentinelLike {
  release: () => Promise<void>;
}
interface NavigatorWithWakeLock extends Navigator {
  wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> };
}

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
    let sentinel: WakeLockSentinelLike | undefined;
    let cancelled = false;
    const nav = navigator as NavigatorWithWakeLock;
    if (awake && nav.wakeLock) {
      nav.wakeLock
        .request("screen")
        .then((s) => {
          if (cancelled) void s.release().catch(() => undefined);
          else sentinel = s;
        })
        .catch(() => undefined);
    }
    return () => {
      cancelled = true;
      void sentinel?.release().catch(() => undefined);
    };
  }, [awake]);

  const pct = ((step + 1) / steps.length) * 100;
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl gap-0 overflow-hidden p-0">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
          {/* Utility panel — deep emerald */}
          <aside className="relative flex flex-col gap-5 bg-[hsl(155_45%_10%)] p-6 text-emerald-50 lg:p-7">
            <div className="flex items-center gap-2 text-emerald-200/90">
              <ChefHat className="h-4 w-4" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em]">Cook mode</span>
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-200/70">Progress</p>
              <p className="mt-1 font-serif text-3xl font-semibold text-white">
                Step {step + 1}<span className="text-emerald-200/60"> / {steps.length}</span>
              </p>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-300 transition-all duration-300" style={{ width: `${pct}%` }} />
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {steps.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setStep(i)}
                  aria-label={`Go to step ${i + 1}`}
                  className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold tabular-nums transition ${
                    i === step
                      ? "bg-white text-emerald-900 shadow-lg"
                      : i < step
                      ? "bg-emerald-500/25 text-emerald-100"
                      : "bg-white/5 text-emerald-100/70 hover:bg-white/10"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center gap-2 text-emerald-100/80">
                <Timer className="h-4 w-4" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">Timer</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="font-serif text-3xl font-semibold tabular-nums text-white">{mm}:{ss}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setRunning((r) => !r)}
                    aria-label={running ? "Pause timer" : "Start timer"}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/15"
                  >
                    {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => { setSeconds(0); setRunning(false); }}
                    aria-label="Reset timer"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/15"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => setAwake((a) => !a)}
              className={`flex min-h-[44px] items-center justify-between rounded-2xl border px-4 text-sm transition ${
                awake
                  ? "border-emerald-300/50 bg-emerald-400/15 text-emerald-50"
                  : "border-white/10 bg-white/5 text-emerald-100/80 hover:bg-white/10"
              }`}
            >
              <span className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Keep screen awake
              </span>
              <span className={`h-2 w-2 rounded-full ${awake ? "bg-emerald-300" : "bg-white/30"}`} />
            </button>

            <button
              onClick={() => setDrawer((d) => !d)}
              className="flex min-h-[44px] items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-emerald-100/90 hover:bg-white/10"
            >
              <Eye className="h-4 w-4" />
              {drawer ? "Hide ingredients" : "Show ingredients"}
            </button>

            {drawer && (
              <div className="max-h-56 overflow-y-auto rounded-2xl border border-white/10 bg-white/5 p-3">
                <ul className="space-y-1.5 text-sm">
                  {ingredients.map((ing) => (
                    <li key={ing.id} className="flex justify-between gap-4">
                      <span className="text-white/95">{ing.name}</span>
                      <span className="tabular-nums text-emerald-100/70">
                        {formatQuantity(
                          ing.quantity != null ? ing.quantity * servingsScale : null,
                          ing.unit,
                          { toTaste: ing.toTaste, optional: ing.optional },
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>

          {/* Instruction panel — Garden Glow surface */}
          <section className="relative flex min-h-[520px] flex-col p-6 sm:p-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Step {step + 1} of {steps.length}
            </p>
            <p className="mt-6 flex-1 font-serif text-2xl leading-snug text-foreground sm:text-[28px]">
              {steps[step]}
            </p>

            <div className="mt-8 flex items-center justify-between gap-3">
              <Button
                variant="outline"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0}
                className="min-h-[44px] gap-2 rounded-full"
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
              <Button
                onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
                disabled={step === steps.length - 1}
                className="min-h-[44px] gap-2 rounded-full px-6"
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StepByStepMode;