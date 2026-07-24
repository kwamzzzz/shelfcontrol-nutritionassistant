import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Check, ChevronDown, X } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { rangeLabelFor, type StoryRange } from "@/lib/kitchen-story";

const RANGES: { value: StoryRange; hint: string }[] = [
  { value: "month", hint: "Everything logged since the 1st" },
  { value: "year", hint: "Your year so far" },
  { value: "all", hint: "The whole journey" },
];

interface StoryHeroProps {
  firstName: string | null;
  memberSince: string | null;
  scopeLabel: string;
  range: StoryRange;
  onRangeChange: (range: StoryRange) => void;
  onClose: () => void;
}

export function StoryHero({
  firstName,
  memberSince,
  scopeLabel,
  range,
  onRangeChange,
  onClose,
}: StoryHeroProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const since = (() => {
    if (!memberSince) return null;
    const parsed = parseISO(memberSince);
    return Number.isNaN(parsed.getTime()) ? null : format(parsed, "MMMM yyyy");
  })();

  return (
    <header className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_-10%,hsl(var(--primary)/0.30),transparent_58%),radial-gradient(circle_at_88%_22%,hsl(var(--warning)/0.14),transparent_52%)]"
      />

      <div className="px-4 pt-safe">
        <div className="flex items-center justify-between gap-3 pt-3">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close your kitchen story"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card/70 text-foreground backdrop-blur transition-colors hover:bg-accent active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>

          <span className="rounded-full border border-border bg-card/70 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
            {scopeLabel}
          </span>
        </div>

        <div className="mx-auto max-w-md pb-7 pt-9 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            {firstName ? `Hey ${firstName}` : "Welcome back"}
          </p>
          <h1 className="mt-1.5 font-[Outfit,sans-serif] text-[2.125rem] font-semibold leading-[1.08] tracking-tight text-foreground">
            Your Kitchen Story
          </h1>
          <p className="mx-auto mt-2.5 max-w-[19rem] text-sm leading-relaxed text-muted-foreground">
            Small choices. Smarter shelves. Less waste.
          </p>

          {since && (
            <p className="mt-4 text-xs font-medium uppercase tracking-[0.16em] text-primary">
              In your kitchen since {since}
            </p>
          )}

          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-full border border-border bg-card/70 px-5 text-sm font-medium text-foreground backdrop-blur transition-colors hover:bg-accent active:scale-95"
          >
            {rangeLabelFor(range)}
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <Drawer open={pickerOpen} onOpenChange={setPickerOpen}>
        <DrawerContent>
          <DrawerHeader className="text-center">
            <DrawerTitle>Show me</DrawerTitle>
            <DrawerDescription>
              Pantry figures always describe right now. Everything else follows this range.
            </DrawerDescription>
          </DrawerHeader>
          <div className="grid gap-2 px-4 pb-4">
            {RANGES.map((option) => {
              const active = option.value === range;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onRangeChange(option.value);
                    setPickerOpen(false);
                  }}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "flex min-h-[56px] items-center gap-4 rounded-2xl border p-4 text-left transition-colors",
                    active
                      ? "border-primary/40 bg-primary/10"
                      : "border-border bg-card/60 hover:bg-accent active:bg-accent",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium leading-tight text-foreground">
                      {rangeLabelFor(option.value)}
                    </span>
                    <span className="mt-0.5 block text-xs leading-tight text-muted-foreground">
                      {option.hint}
                    </span>
                  </span>
                  {active && <Check className="h-5 w-5 shrink-0 text-primary" />}
                </button>
              );
            })}
          </div>
        </DrawerContent>
      </Drawer>
    </header>
  );
}
