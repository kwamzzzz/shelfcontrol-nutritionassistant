import { useMemo, type CSSProperties } from "react";
import { format, parseISO } from "date-fns";
import { usePurchases } from "@/hooks/usePurchases";
import { useAllInventory } from "@/hooks/usePantry";
import { formatCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Store as StoreIcon,
  Activity,
  Package,
  Receipt as ReceiptIcon,
  Sparkles,
  Mail,
} from "lucide-react";

type ToneStyle = CSSProperties & { "--tone": string };

interface MonthStat {
  month: string;
  label: string;
  trips: number;
  items: number;
  quantity: number;
  spent: number;
  byStore: { store: string; spent: number }[];
  topItems: { name: string; count: number }[];
  consumed: number;
  discarded: number;
  archived: number;
}

export interface PantryToolDialogProps {
  /** Omit to keep the dialog self-managed (desktop toolbar usage). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Hide the built-in trigger when opened from the phone Tools menu. */
  hideTrigger?: boolean;
}

const PantryStatsDialog = ({ open, onOpenChange, hideTrigger }: PantryToolDialogProps) => {
  const { data: purchases } = usePurchases();
  const { data: inventory } = useAllInventory();

  const months = useMemo<MonthStat[]>(() => {
    const acc = new Map<string, {
      trips: number; items: number; quantity: number; spent: number;
      store: Map<string, number>; item: Map<string, number>;
      consumed: number; discarded: number; archived: number;
    }>();
    const ensure = (m: string) => {
      if (!acc.has(m)) acc.set(m, { trips: 0, items: 0, quantity: 0, spent: 0, store: new Map(), item: new Map(), consumed: 0, discarded: 0, archived: 0 });
      return acc.get(m)!;
    };

    for (const p of purchases ?? []) {
      const m = (p.purchased_at ?? "").slice(0, 7);
      if (!m) continue;
      const a = ensure(m);
      a.trips++;
      a.spent += Number(p.total_cost ?? 0);
      const store = p.store_name || "Unknown";
      a.store.set(store, (a.store.get(store) ?? 0) + Number(p.total_cost ?? 0));
      for (const pi of p.purchase_items ?? []) {
        a.items++;
        a.quantity += Number(pi.quantity ?? 0);
        const name = pi.items?.name ?? "Unknown";
        a.item.set(name, (a.item.get(name) ?? 0) + 1);
      }
    }

    for (const inv of inventory ?? []) {
      if (inv.status === "active") continue;
      const when = inv.archived_at ?? inv.added_at;
      const m = (when ?? "").slice(0, 7);
      if (!m) continue;
      const a = ensure(m);
      if (inv.status === "consumed") a.consumed++;
      else if (inv.status === "discarded") a.discarded++;
      else a.archived++;
    }

    return [...acc.entries()]
      .sort((x, y) => y[0].localeCompare(x[0]))
      .map(([m, a]) => ({
        month: m,
        label: format(parseISO(`${m}-01`), "MMMM yyyy"),
        trips: a.trips,
        items: a.items,
        quantity: Math.round(a.quantity),
        spent: a.spent,
        byStore: [...a.store.entries()].sort((p, q) => q[1] - p[1]).map(([store, spent]) => ({ store, spent })),
        topItems: [...a.item.entries()].sort((p, q) => q[1] - p[1]).slice(0, 3).map(([name, count]) => ({ name, count })),
        consumed: a.consumed,
        discarded: a.discarded,
        archived: a.archived,
      }));
  }, [purchases, inventory]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <BarChart3 className="h-4 w-4" /> Stats
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-hidden flex flex-col p-0 sm:p-0">
        <div className="flex items-start gap-4 px-6 pt-6 sm:px-8 sm:pt-8">
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary shadow-[0_10px_24px_-14px_hsl(var(--primary)/0.7)]">
            <Activity className="h-6 w-6" strokeWidth={2.2} />
            <span className="absolute -inset-1 -z-10 rounded-3xl bg-primary/10 blur-lg" aria-hidden />
          </div>
          <DialogHeader className="garden-header flex-1 space-y-1 pr-12">
            <DialogTitle>Pantry Pulse</DialogTitle>
            <DialogDescription>
              Monthly purchases, spend, and what left your pantry — from your full history.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="mx-6 mt-5 flex items-start gap-3 rounded-2xl border border-dashed border-primary/25 bg-primary/[0.045] px-4 py-3 sm:mx-8">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Mail className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-foreground">Monthly Pantry Report</p>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                Coming soon
              </span>
            </div>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              A clear month-by-month spend summary, store breakdown and pantry highlights delivered to your email.
            </p>
          </div>
        </div>

        {(() => {
          const totalItems = months.reduce((a, m) => a + m.items, 0);
          const totalTrips = months.reduce((a, m) => a + m.trips, 0);
          const totalSpend = months.reduce((a, m) => a + m.spent, 0);
          const latest = months[0];
          const prev = months[1];
          const delta = latest && prev ? latest.spent - prev.spent : null;
          return (
            <div className="grid grid-cols-3 gap-3 px-6 pt-6 sm:px-8">
              <KPI icon={Package} label="Items" value={totalItems} tone="var(--bento-emerald)" />
              <KPI icon={ReceiptIcon} label="Trips" value={totalTrips} tone="var(--bento-cobalt)" />
              <KPI
                icon={BarChart3}
                label="Spend"
                value={formatCurrency(totalSpend)}
                tone="var(--bento-amber)"
                trend={
                  delta == null || delta === 0
                    ? undefined
                    : { positive: delta < 0, label: `${delta > 0 ? "+" : "−"}${formatCurrency(Math.abs(delta))}` }
                }
              />
            </div>
          );
        })()}

        {months.length > 0 && months[0] && (
          <div className="mx-6 mt-5 rounded-2xl border border-primary/20 bg-primary/[0.06] p-4 sm:mx-8">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Sparkles className="h-4 w-4" />
              </span>
              <div className="text-sm leading-relaxed">
                <p className="font-medium text-foreground">
                  {months[0].label}: {months[0].trips} trip{months[0].trips !== 1 ? "s" : ""} · {months[0].items} item
                  {months[0].items !== 1 ? "s" : ""} · {formatCurrency(months[0].spent)}
                </p>
                {months[0].topItems[0] && (
                  <p className="text-muted-foreground">
                    You bought <strong className="text-foreground">{months[0].topItems[0].name}</strong> the most.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mt-5 flex-1 space-y-3 overflow-y-auto px-6 pb-8 sm:px-8">
          {months.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/70 bg-card/50 py-14 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <ReceiptIcon className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-foreground">No purchases recorded yet</p>
              <p className="max-w-[26ch] text-xs text-muted-foreground">
                Log a shopping trip to start seeing your pantry pulse.
              </p>
            </div>
          ) : (
            months.map((s, i) => {
              const prev = months[i + 1];
              const delta = prev ? s.spent - prev.spent : null;
              return (
                <div key={s.month} className="rounded-2xl border border-border/70 bg-card p-4 space-y-3 shadow-[0_1px_0_hsl(0_0%_100%/0.4)_inset]">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-semibold text-foreground">{s.label}</h3>
                    {delta != null && delta !== 0 && (
                      <span className={`flex items-center gap-1 text-xs font-medium ${delta > 0 ? "text-destructive" : "text-success"}`}>
                        {delta > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                        {formatCurrency(Math.abs(delta))} vs {prev.label.split(" ")[0]}
                      </span>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-border/60 bg-background/60 p-3">
                      <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Spend</p>
                      <p className="mt-0.5 font-serif text-2xl font-semibold tabular-nums text-foreground">
                        {formatCurrency(s.spent)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {s.items} item{s.items !== 1 ? "s" : ""} · {s.trips} trip{s.trips !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/60 p-3">
                      <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Left the pantry</p>
                      <p className="mt-0.5 font-serif text-2xl font-semibold tabular-nums text-foreground">
                        {s.consumed + s.discarded + s.archived}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {s.consumed} used · {s.discarded} tossed · {s.archived} archived
                      </p>
                    </div>
                  </div>

                  {s.topItems.length > 0 && (
                    <div>
                      <p className="mb-1 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Most bought</p>
                      <div className="flex flex-wrap gap-1.5">
                        {s.topItems.map((t) => (
                          <span key={t.name} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">
                            {t.name} <span className="text-muted-foreground">×{t.count}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {s.byStore.length > 0 && (
                    <div>
                      <p className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                        <StoreIcon className="h-3 w-3" /> By store
                      </p>
                      <div className="space-y-0.5">
                        {s.byStore.slice(0, 3).map((b) => (
                          <div key={b.store} className="flex items-center justify-between text-sm">
                            <span className="truncate text-muted-foreground">{b.store}</span>
                            <span className="tabular-nums text-foreground">{formatCurrency(b.spent)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

function KPI({
  icon: Icon,
  label,
  value,
  tone,
  trend,
}: {
  icon: typeof BarChart3;
  label: string;
  value: number | string;
  tone: string;
  trend?: { positive: boolean; label: string };
}) {
  return (
    <div
      className="rounded-2xl border border-border/70 bg-card p-3 shadow-[0_1px_0_hsl(0_0%_100%/0.4)_inset]"
      style={{ "--tone": tone } as ToneStyle}
    >
      <div className="flex items-center gap-2">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-xl"
          style={{ background: "hsl(var(--tone) / 0.15)", color: "hsl(var(--tone))" }}
        >
          <Icon className="h-4 w-4" strokeWidth={2.2} />
        </span>
        <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{label}</span>
      </div>
      <p className="mt-2 font-serif text-2xl font-semibold tabular-nums text-foreground">{value}</p>
      {trend && (
        <p className={`mt-0.5 text-[11px] font-medium ${trend.positive ? "text-success" : "text-destructive"}`}>
          {trend.label}
        </p>
      )}
    </div>
  );
}

export default PantryStatsDialog;
