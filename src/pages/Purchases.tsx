import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { usePurchases } from "@/hooks/usePurchases";
import { formatCurrencyAlways } from "@/lib/currency";
import AddPurchaseDialog from "@/components/purchases/AddPurchaseDialog";
import TripCard from "@/components/purchases/TripCard";
import ReceiptDetail from "@/components/purchases/ReceiptDetail";
import { Receipt, DollarSign, Store, TrendingUp, Star, ChevronLeft } from "lucide-react";
import { useGroupContext } from "@/contexts/GroupContext";
import { useProfileNames } from "@/hooks/useProfileNames";
import { useShellMode } from "@/hooks/use-shell-mode";
import { isThisWeek, parseISO } from "date-fns";

const Purchases = () => {
  const { data: purchases, isLoading } = usePurchases();
  const { activeGroupId } = useGroupContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const mode = useShellMode();
  const isPhone = mode === "phone";
  const tripParam = searchParams.get("trip");

  // Deep-link filters from Intelligence
  const storeFilter = searchParams.get("store");
  const periodFilter = searchParams.get("period");
  const searchFilter = searchParams.get("search");

  const userIds = useMemo(() => (purchases ?? []).map((p) => p.user_id), [purchases]);
  const { data: profileMap } = useProfileNames(userIds);

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

  const selectTrip = (id: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("trip", id);
    setSearchParams(next);
  };
  const clearTrip = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("trip");
    setSearchParams(next);
  };

  // ?trip drives selection. Phone shows the list until a trip is chosen; desktop
  // falls back to the first trip so the split view always has a receipt.
  const selectedFromParam = useMemo(
    () => filteredPurchases?.find((p) => p.id === tripParam) ?? null,
    [filteredPurchases, tripParam],
  );
  const selectedPurchase = selectedFromParam ?? (isPhone ? null : filteredPurchases?.[0] ?? null);

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
    { label: "Total Spend", value: formatCurrencyAlways(stats.totalSpend), icon: DollarSign },
    { label: "Stores", value: String(stats.storeCount), icon: Store },
    { label: "Avg / Trip", value: formatCurrencyAlways(stats.avgPerTrip), icon: TrendingUp },
    { label: "Most Bought", value: stats.bestValue ?? "—", icon: Star },
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
            className="rounded-2xl bg-card p-4 shadow-[0_2px_16px_-4px_hsl(var(--foreground)/0.06)] border border-border"
          >
            <div className="flex items-center gap-1.5">
              <card.icon className="h-3.5 w-3.5 text-muted-foreground" />
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
        ) : isPhone ? (
          selectedPurchase ? (
            /* Phone: one receipt at a time, Back returns to the list */
            <div className="space-y-3">
              <button
                type="button"
                onClick={clearTrip}
                className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" /> All trips
              </button>
              <ReceiptDetail purchase={selectedPurchase} />
            </div>
          ) : (
            /* Phone: trips list */
            <div className="space-y-2">
              <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {storeFilter || periodFilter || searchFilter ? "Filtered Trips" : "Recent Trips"}
              </h2>
              {filteredPurchases.map((p) => (
                <TripCard
                  key={p.id}
                  purchase={p}
                  isActive={false}
                  onClick={() => selectTrip(p.id)}
                  loggedBy={activeGroupId ? profileMap?.get(p.user_id) : undefined}
                />
              ))}
            </div>
          )
        ) : (
          /* Tablet / desktop: master-detail split */
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left: Trips list */}
            <div className="lg:col-span-5 space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
                {storeFilter || periodFilter || searchFilter ? "Filtered Trips" : "Recent Trips"}
              </h2>
              <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
                {filteredPurchases.map((p) => (
                  <TripCard
                    key={p.id}
                    purchase={p}
                    isActive={selectedPurchase?.id === p.id}
                    onClick={() => selectTrip(p.id)}
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
