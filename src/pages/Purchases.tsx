import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { usePurchases } from "@/hooks/usePurchases";
import { formatCurrency, formatCurrencyAlways } from "@/lib/currency";
import AddPurchaseDialog from "@/components/purchases/AddPurchaseDialog";
import TripCard from "@/components/purchases/TripCard";
import ReceiptDetail from "@/components/purchases/ReceiptDetail";
import { Receipt, DollarSign, Store, TrendingUp, Star } from "lucide-react";
import { useGroupContext } from "@/contexts/GroupContext";
import { useProfileNames } from "@/hooks/useProfileNames";
import { isThisWeek, parseISO } from "date-fns";

const Purchases = () => {
  const { data: purchases, isLoading } = usePurchases();
  const { activeGroupId } = useGroupContext();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();

  // Deep-link filters from Intelligence
  const storeFilter = searchParams.get("store");
  const periodFilter = searchParams.get("period");
  const searchFilter = searchParams.get("search");

  const userIds = useMemo(() => (purchases ?? []).map((p) => p.user_id), [purchases]);
  const { data: profileMap } = useProfileNames(userIds);

  // Auto-select first purchase
  useEffect(() => {
    if (!selectedId && filteredPurchases?.length) {
      setSelectedId(filteredPurchases[0].id);
    }
  }, [filteredPurchases, selectedId]);

  const filteredPurchases = useMemo(() => {
    if (!purchases) return [];
    return purchases.filter((p) => {
      if (storeFilter && p.store_name !== storeFilter) return false;
      if (periodFilter === "week" && !isThisWeek(parseISO(p.purchased_at), { weekStartsOn: 1 })) return false;
      if (searchFilter) {
        const q = searchFilter.toLowerCase();
        const matchesStore = p.store_name?.toLowerCase().includes(q);
        const matchesItem = p.purchase_items?.some((pi) => pi.items?.name?.toLowerCase().includes(q));
        if (!matchesStore && !matchesItem) return false;
      }
      return true;
    });
  }, [purchases, storeFilter, periodFilter, searchFilter]);

  const selectedPurchase = useMemo(
    () => filteredPurchases?.find((p) => p.id === selectedId) ?? null,
    [filteredPurchases, selectedId]
  );

  // Summary computations
  const stats = useMemo(() => {
    if (!purchases?.length) return { totalSpend: 0, storeCount: 0, avgPerTrip: 0, bestValue: null as string | null };
    const totalSpend = purchases.reduce((s, p) => s + Number(p.total_cost ?? 0), 0);
    const storeNames = new Set(purchases.map((p) => p.store_name).filter(Boolean));
    const avgPerTrip = purchases.length > 0 ? totalSpend / purchases.length : 0;

    // Best value: item appearing most frequently
    const itemFreq = new Map<string, { name: string; count: number }>();
    purchases.forEach((p) =>
      p.purchase_items?.forEach((pi) => {
        const name = pi.items?.name ?? "Unknown";
        const entry = itemFreq.get(pi.item_id) ?? { name, count: 0 };
        entry.count++;
        itemFreq.set(pi.item_id, entry);
      })
    );
    let bestValue: string | null = null;
    let maxCount = 0;
    itemFreq.forEach((v) => {
      if (v.count > maxCount) { maxCount = v.count; bestValue = v.name; }
    });

    return { totalSpend, storeCount: storeNames.size, avgPerTrip, bestValue };
  }, [purchases]);

  const summaryCards = [
    { label: "Total Spend", value: formatCurrencyAlways(stats.totalSpend), icon: DollarSign, accent: "text-primary" },
    { label: "Stores", value: String(stats.storeCount), icon: Store, accent: "text-accent" },
    { label: "Avg / Trip", value: formatCurrencyAlways(stats.avgPerTrip), icon: TrendingUp, accent: "text-primary" },
    { label: "Most Bought", value: stats.bestValue ?? "—", icon: Star, accent: "text-accent" },
  ];

  return (
    <div className="font-[Outfit]">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Purchases</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track your household shopping history
          </p>
        </div>
        <AddPurchaseDialog />
      </div>

      {/* Summary Cards */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl bg-card p-4 shadow-[0_2px_16px_-4px_hsl(var(--foreground)/0.06)] border border-border/50"
          >
            <div className="flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-secondary ${card.accent}`}>
                <card.icon className="h-4 w-4" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">{card.label}</span>
            </div>
            <p className="mt-2 text-xl font-bold tabular-nums text-foreground truncate">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="mt-6">
        {isLoading ? (
          <div className="rounded-2xl border bg-card p-12 text-center text-muted-foreground">Loading...</div>
        ) : !purchases?.length ? (
          <div className="rounded-2xl border bg-card p-12 text-center">
            <Receipt className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <p className="mt-4 text-lg font-medium text-muted-foreground">No purchases yet</p>
            <p className="mt-1 text-sm text-muted-foreground/70">
              Log your first grocery trip to get started.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left: Trips list */}
            <div className="lg:col-span-5 space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
                Recent Trips
              </h2>
              <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
                {purchases.map((p) => (
                  <TripCard
                    key={p.id}
                    purchase={p}
                    isActive={selectedId === p.id}
                    onClick={() => setSelectedId(p.id)}
                    loggedBy={activeGroupId ? profileMap?.get(p.user_id) : undefined}
                  />
                ))}
              </div>
            </div>

            {/* Right: Receipt detail */}
            <div className="lg:col-span-7">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-3">
                Receipt
              </h2>
              <div className="sticky top-4">
                <ReceiptDetail purchase={selectedPurchase} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Purchases;
