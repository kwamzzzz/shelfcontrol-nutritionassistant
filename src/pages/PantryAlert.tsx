import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Clock, PackageCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInventory, type InventoryRow } from "@/hooks/usePantry";
import { getExpiryStatus } from "@/lib/pantry-utils";
import InventoryCard from "@/components/pantry/InventoryCard";
import InventoryDetailsOverlay from "@/components/pantry/InventoryDetailsOverlay";
import PantryExitDialog, { type PantryExitMode } from "@/components/pantry/PantryExitDialog";
import { cn } from "@/lib/utils";

type AlertKind = "use-soon" | "expired";

const ALERT_COPY: Record<AlertKind, {
  title: string;
  eyebrow: string;
  description: string;
  empty: string;
  icon: typeof Clock;
  shell: string;
  iconShell: string;
}> = {
  "use-soon": {
    title: "Use Soon",
    eyebrow: "Plan these next",
    description: "These foods are closest to their use-by date. Open an item to use it, dispose of it, or update its details.",
    empty: "Nothing needs using soon right now.",
    icon: Clock,
    shell: "border-amber-300/40 bg-[radial-gradient(circle_at_top_right,hsl(38_92%_62%/0.22),transparent_38%),linear-gradient(135deg,hsl(var(--card)),hsl(42_80%_96%))] dark:bg-[radial-gradient(circle_at_top_right,hsl(38_92%_62%/0.18),transparent_38%),linear-gradient(135deg,hsl(var(--card)),hsl(38_30%_13%))]",
    iconShell: "bg-warning text-warning-foreground shadow-warning/20",
  },
  expired: {
    title: "Expired",
    eyebrow: "Review for safety",
    description: "These foods are past their recorded date. Check each item at a glance, then dispose of it or correct the date if needed.",
    empty: "No expired items. Your pantry is up to date.",
    icon: AlertTriangle,
    shell: "border-destructive/25 bg-[radial-gradient(circle_at_top_right,hsl(var(--destructive)/0.18),transparent_38%),linear-gradient(135deg,hsl(var(--card)),hsl(8_70%_97%))] dark:bg-[radial-gradient(circle_at_top_right,hsl(var(--destructive)/0.16),transparent_38%),linear-gradient(135deg,hsl(var(--card)),hsl(8_30%_13%))]",
    iconShell: "bg-destructive text-destructive-foreground shadow-destructive/20",
  },
};

const PantryAlert = () => {
  const { kind } = useParams();
  const navigate = useNavigate();
  const { data: inventory, isLoading } = useInventory();
  const alertKind: AlertKind = kind === "expired" ? "expired" : "use-soon";
  const copy = ALERT_COPY[alertKind];
  const Icon = copy.icon;
  const [viewing, setViewing] = useState<InventoryRow | null>(null);
  const [exitRequest, setExitRequest] = useState<{ entry: InventoryRow; mode: PantryExitMode } | null>(null);

  const items = useMemo(() => {
    const desired = alertKind === "expired" ? "expired" : "expiring";
    return (inventory ?? [])
      .filter((entry) => getExpiryStatus(entry.expiry_date) === desired)
      .sort((a, b) => (a.expiry_date ?? "").localeCompare(b.expiry_date ?? ""));
  }, [alertKind, inventory]);

  return (
    <div className="space-y-5 sm:space-y-6">
      <Button
        type="button"
        variant="ghost"
        className="-ml-2 min-h-11 rounded-xl"
        onClick={() => navigate("/pantry")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to pantry
      </Button>

      <section className={cn("relative overflow-hidden rounded-[2rem] border px-5 py-6 shadow-sm sm:px-8 sm:py-8", copy.shell)}>
        <div className="relative flex items-start gap-4">
          <span className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-lg", copy.iconShell)}>
            <Icon className="h-7 w-7" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{copy.eyebrow}</p>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3">
              <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{copy.title}</h1>
              <span className="font-serif text-3xl font-semibold tabular-nums text-foreground/55">{items.length}</span>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">{copy.description}</p>
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">Loading…</div>
      ) : items.length === 0 ? (
        <div className="rounded-[2rem] border border-primary/15 bg-card px-6 py-12 text-center shadow-sm">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-success/10 text-success">
            <PackageCheck className="h-7 w-7" />
          </span>
          <p className="mt-4 font-serif text-2xl font-semibold text-foreground">{copy.empty}</p>
          <p className="mt-1 text-sm text-muted-foreground">Shelf Control will keep watching your recorded dates.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            Tap an item for the full picture
          </div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            {items.map((entry) => (
              <InventoryCard key={entry.id} entry={entry} onClick={() => setViewing(entry)} />
            ))}
          </div>
        </>
      )}

      {viewing && (
        <InventoryDetailsOverlay
          entry={viewing}
          open
          onClose={() => setViewing(null)}
          onExit={(mode) => {
            setExitRequest({ entry: viewing, mode });
            setViewing(null);
          }}
        />
      )}

      {exitRequest && (
        <PantryExitDialog
          entry={exitRequest.entry}
          mode={exitRequest.mode}
          open
          onClose={() => setExitRequest(null)}
          onCompleted={() => setExitRequest(null)}
        />
      )}
    </div>
  );
};

export default PantryAlert;
