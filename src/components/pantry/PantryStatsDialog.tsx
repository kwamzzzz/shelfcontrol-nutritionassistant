import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { usePurchases } from "@/hooks/usePurchases";
import { useAllInventory } from "@/hooks/usePantry";
import { formatCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { BarChart3, TrendingUp, TrendingDown, Store as StoreIcon } from "lucide-react";

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

const PantryStatsDialog = () => {
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
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <BarChart3 className="h-4 w-4" /> Stats
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[88vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" /> Pantry & Purchase Statistics
          </DialogTitle>
          <DialogDescription>Monthly purchases, spend, and what left your pantry — from your full history.</DialogDescription>
        </DialogHeader>

        <div className="-mx-1 flex-1 space-y-3 overflow-y-auto px-1 py-1">
          {months.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No purchases recorded yet.</p>
          ) : (
            months.map((s, i) => {
              const prev = months[i + 1];
              const delta = prev ? s.spent - prev.spent : null;
              return (
                <div key={s.month} className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-semibold text-foreground">{s.label}</h3>
                    {delta != null && delta !== 0 && (
                      <span className={`flex items-center gap-1 text-xs font-medium ${delta > 0 ? "text-destructive" : "text-success"}`}>
                        {delta > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                        {formatCurrency(Math.abs(delta))} vs {prev.label.split(" ")[0]}
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground">
                    <strong className="text-foreground">{s.items}</strong> item{s.items !== 1 ? "s" : ""} purchased across{" "}
                    <strong className="text-foreground">{s.trips}</strong> trip{s.trips !== 1 ? "s" : ""}, with{" "}
                    <strong className="text-foreground">{formatCurrency(s.spent)}</strong> spent.
                  </p>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Total quantity</p>
                      <p className="font-semibold tabular-nums text-foreground">{s.quantity}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Consumed / Discarded / Archived</p>
                      <p className="font-semibold tabular-nums text-foreground">{s.consumed} · {s.discarded} · {s.archived}</p>
                    </div>
                  </div>

                  {s.topItems.length > 0 && (
                    <div>
                      <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Most bought</p>
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
                      <p className="mb-1 flex items-center gap-1 text-xs uppercase tracking-wide text-muted-foreground">
                        <StoreIcon className="h-3 w-3" /> By store
                      </p>
                      <div className="space-y-0.5">
                        {s.byStore.map((b) => (
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

export default PantryStatsDialog;
