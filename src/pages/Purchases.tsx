import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  ChevronLeft,
  CircleDollarSign,
  Receipt,
  Search,
  Sparkles,
  Star,
  Store,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { isThisWeek, parseISO } from "date-fns";
import AddPurchaseDialog from "@/components/purchases/AddPurchaseDialog";
import ReceiptDetail from "@/components/purchases/ReceiptDetail";
import TripCard from "@/components/purchases/TripCard";
import { Input } from "@/components/ui/input";
import { useGroupContext } from "@/contexts/GroupContext";
import { useProfileNames } from "@/hooks/useProfileNames";
import { usePurchases, type PurchaseWithItems } from "@/hooks/usePurchases";
import { useShellMode } from "@/hooks/use-shell-mode";
import { formatCurrencyAlways } from "@/lib/currency";
import { cn } from "@/lib/utils";

type PeriodFilter = "all" | "week";

const Purchases = () => {
  const { data: purchases, isLoading } = usePurchases();
  const { activeGroupId, isPersonalMode } = useGroupContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const isPhone = useShellMode() === "phone";

  const tripParam = searchParams.get("trip");
  const storeFilter = searchParams.get("store");
  const periodFilter: PeriodFilter = searchParams.get("period") === "week" ? "week" : "all";
  const searchFilter = searchParams.get("search") ?? "";
  const hasFilters = Boolean(storeFilter || periodFilter === "week" || searchFilter.trim());

  const userIds = useMemo(
    () => (purchases ?? []).map((purchase) => purchase.user_id),
    [purchases]
  );
  const { data: profileMap } = useProfileNames(userIds);

  const filteredPurchases = useMemo(() => {
    const normalizedSearch = searchFilter.trim().toLowerCase();
    const normalizedStore = storeFilter?.trim().toLowerCase();

    return (purchases ?? []).filter((purchase) => {
      if (
        normalizedStore &&
        purchase.store_name?.trim().toLowerCase() !== normalizedStore
      ) {
        return false;
      }
      if (
        periodFilter === "week" &&
        !isThisWeek(parseISO(purchase.purchased_at), { weekStartsOn: 1 })
      ) {
        return false;
      }
      if (normalizedSearch) {
        const matchesStore = purchase.store_name?.toLowerCase().includes(normalizedSearch);
        const matchesItem = purchase.purchase_items?.some((line) =>
          line.items?.name?.toLowerCase().includes(normalizedSearch)
        );
        if (!matchesStore && !matchesItem) return false;
      }
      return true;
    });
  }, [periodFilter, purchases, searchFilter, storeFilter]);

  const stats = useMemo(() => {
    const totalSpend = filteredPurchases.reduce(
      (sum, purchase) => sum + Number(purchase.total_cost ?? 0),
      0
    );
    const storeNames = new Set(
      filteredPurchases
        .map((purchase) => purchase.store_name?.trim().toLowerCase())
        .filter((name): name is string => Boolean(name))
    );

    const tripsPerItem = new Map<string, { name: string; count: number }>();
    filteredPurchases.forEach((purchase) => {
      const seenOnTrip = new Set<string>();
      purchase.purchase_items?.forEach((line) => {
        if (seenOnTrip.has(line.item_id)) return;
        seenOnTrip.add(line.item_id);
        const current = tripsPerItem.get(line.item_id) ?? {
          name: line.items?.name ?? "Unknown item",
          count: 0,
        };
        current.count += 1;
        tripsPerItem.set(line.item_id, current);
      });
    });

    let favorite: string | null = null;
    let favoriteTrips = 0;
    tripsPerItem.forEach((item) => {
      if (item.count > favoriteTrips) {
        favorite = item.name;
        favoriteTrips = item.count;
      }
    });

    return {
      totalSpend,
      storeCount: storeNames.size,
      average: filteredPurchases.length ? totalSpend / filteredPurchases.length : 0,
      favorite,
    };
  }, [filteredPurchases]);

  const selectedFromParam = useMemo(
    () => filteredPurchases.find((purchase) => purchase.id === tripParam) ?? null,
    [filteredPurchases, tripParam]
  );
  const selectedPurchase =
    selectedFromParam ?? (isPhone ? null : filteredPurchases[0] ?? null);

  const updateParams = (updater: (next: URLSearchParams) => void) => {
    const next = new URLSearchParams(searchParams);
    updater(next);
    setSearchParams(next, { replace: true });
  };

  const selectTrip = (id: string) => {
    updateParams((next) => next.set("trip", id));
  };

  const clearTrip = () => {
    updateParams((next) => next.delete("trip"));
  };

  const updateSearch = (value: string) => {
    updateParams((next) => {
      if (value) next.set("search", value);
      else next.delete("search");
      next.delete("trip");
    });
  };

  const updatePeriod = (period: PeriodFilter) => {
    updateParams((next) => {
      if (period === "week") next.set("period", "week");
      else next.delete("period");
      next.delete("trip");
    });
  };

  const clearFilters = () => {
    updateParams((next) => {
      next.delete("store");
      next.delete("period");
      next.delete("search");
      next.delete("trip");
    });
  };

  if (isPhone && selectedPurchase) {
    return (
      <div className="mx-auto max-w-xl space-y-3">
        <button
          type="button"
          onClick={clearTrip}
          className="inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          All purchases
        </button>
        <ReceiptDetail purchase={selectedPurchase} />
      </div>
    );
  }

  const summaryCards: MetricBubbleProps[] = [
    {
      label: "Total spend",
      value: filteredPurchases.length ? formatCurrencyAlways(stats.totalSpend) : "—",
      icon: CircleDollarSign,
      tone: "text-primary",
    },
    {
      label: "Stores",
      value: String(stats.storeCount),
      icon: Store,
      tone: "text-sky-700 dark:text-sky-300",
    },
    {
      label: "Avg / trip",
      value: filteredPurchases.length ? formatCurrencyAlways(stats.average) : "—",
      icon: TrendingUp,
      tone: "text-violet-700 dark:text-violet-300",
    },
    {
      label: "Trip favorite",
      value: stats.favorite ?? "—",
      icon: Star,
      tone: "text-amber-700 dark:text-amber-300",
    },
  ];

  const trailTitle =
    filteredPurchases.length === 0
      ? hasFilters
        ? "No trips match this view"
        : "Start your purchase trail"
      : `${filteredPurchases.length} shopping trip${filteredPurchases.length === 1 ? "" : "s"}, neatly remembered`;

  const trailCopy =
    filteredPurchases.length === 0
      ? hasFilters
        ? "Adjust the filters to bring more receipts back into view."
        : "Log a shop to begin building a useful, searchable purchase history."
      : `${stats.storeCount} store${stats.storeCount === 1 ? "" : "s"} represented in this view`;

  return (
    <div className="mx-auto max-w-[1440px] space-y-4 md:space-y-6">
      {!isPhone && (
        <header className="flex items-end justify-between gap-6">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Purchase ledger
            </div>
            <h1 className="font-display text-4xl font-bold tracking-tight text-foreground">
              Purchases
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              A clear history of every shopping trip, receipt, and pantry restock.
            </p>
          </div>
          <AddPurchaseDialog />
        </header>
      )}

      <section className="relative overflow-hidden rounded-[2rem] border border-primary/15 bg-[linear-gradient(135deg,hsl(var(--surface-panel))_0%,hsl(var(--accent))_62%,hsl(var(--surface-panel))_100%)] p-5 shadow-[0_24px_70px_-50px_hsl(var(--primary)/0.65)] sm:p-7">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-primary/12 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 left-1/4 h-52 w-52 rounded-full bg-sky-500/10 blur-3xl"
        />

        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(560px,1.1fr)] lg:items-end">
          <div>
            <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-primary/15 bg-[hsl(var(--surface-panel)/0.78)] px-3 text-xs font-semibold text-foreground shadow-sm backdrop-blur">
              {isPersonalMode ? (
                <Receipt className="h-3.5 w-3.5 text-primary" />
              ) : (
                <Users className="h-3.5 w-3.5 text-primary" />
              )}
              {isPersonalMode ? "Personal history" : "Shared household history"}
            </span>
            <h2 className="mt-5 max-w-xl font-display text-3xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-4xl">
              {trailTitle}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">{trailCopy}</p>

            {isPhone && (
              <AddPurchaseDialog
                triggerLabel="Log a purchase"
                triggerClassName="mt-5 w-full shadow-md"
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3 lg:grid-cols-2">
            {summaryCards.map((card) => (
              <MetricBubble key={card.label} {...card} />
            ))}
          </div>
        </div>
      </section>

      <section className="surface-panel rounded-[1.75rem] p-3 sm:p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              inputMode="search"
              value={searchFilter}
              onChange={(event) => updateSearch(event.target.value)}
              placeholder={isPhone ? "Search trips or items" : "Search stores or purchased items"}
              aria-label="Search purchases"
              className="min-h-11 rounded-2xl border-border/70 bg-[hsl(var(--surface-subtle))] pl-10 pr-11 shadow-none"
            />
            {searchFilter && (
              <button
                type="button"
                onClick={() => updateSearch("")}
                aria-label="Clear purchase search"
                className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div
            className="grid grid-cols-2 gap-1 rounded-2xl bg-[hsl(var(--surface-subtle))] p-1"
            role="group"
            aria-label="Purchase period"
          >
            {([
              ["all", "All time"],
              ["week", "This week"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => updatePeriod(value)}
                aria-pressed={periodFilter === value}
                className={cn(
                  "min-h-10 rounded-xl px-4 text-xs font-semibold transition sm:text-sm",
                  periodFilter === value
                    ? "bg-[hsl(var(--surface-panel))] text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {storeFilter && (
            <span className="inline-flex min-h-10 items-center justify-between gap-2 rounded-full bg-primary/10 px-3 text-xs font-semibold text-primary">
              Store: {storeFilter}
              <button
                type="button"
                onClick={() =>
                  updateParams((next) => {
                    next.delete("store");
                    next.delete("trip");
                  })
                }
                aria-label={`Remove ${storeFilter} store filter`}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-primary/10"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          )}

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="min-h-10 shrink-0 rounded-full px-3 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              Clear filters
            </button>
          )}
        </div>
      </section>

      {isLoading ? (
        <PurchasesSkeleton />
      ) : !purchases?.length ? (
        <EmptyState
          title="No purchases yet"
          copy="Log your first shopping trip to begin building a useful receipt history."
        />
      ) : filteredPurchases.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matching trips"
          copy="Try another store, item, or time period."
        />
      ) : isPhone ? (
        <TripsPanel
          purchases={filteredPurchases}
          selectedPurchase={null}
          onSelect={selectTrip}
          activeGroupId={activeGroupId}
          profileMap={profileMap}
          filtered={hasFilters}
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(360px,0.72fr)_minmax(0,1.28fr)]">
          <TripsPanel
            purchases={filteredPurchases}
            selectedPurchase={selectedPurchase}
            onSelect={selectTrip}
            activeGroupId={activeGroupId}
            profileMap={profileMap}
            filtered={hasFilters}
            scrollable
          />

          <section className="surface-subtle min-w-0 rounded-[2rem] p-4 sm:p-5">
            <header className="mb-4 flex items-center justify-between gap-4 px-1">
              <div>
                <h2 className="font-display text-lg font-bold text-foreground">Receipt</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Full trip details and pantry-linked line items
                </p>
              </div>
              <Receipt className="h-5 w-5 text-primary" />
            </header>
            <div className="sticky top-4">
              <ReceiptDetail purchase={selectedPurchase} />
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

interface MetricBubbleProps {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: string;
}

const MetricBubble = ({ label, value, icon: Icon, tone }: MetricBubbleProps) => (
  <div className="min-w-0 rounded-2xl border border-border/55 bg-[hsl(var(--surface-panel)/0.80)] p-3 shadow-sm backdrop-blur sm:p-4">
    <div className="flex items-center gap-1.5">
      <Icon className={cn("h-4 w-4", tone)} />
      <span className="truncate text-[0.68rem] font-semibold text-muted-foreground sm:text-xs">
        {label}
      </span>
    </div>
    <p className={cn("mt-3 truncate font-display text-lg font-bold tabular-nums sm:text-xl", tone)}>
      {value}
    </p>
  </div>
);

interface TripsPanelProps {
  purchases: PurchaseWithItems[];
  selectedPurchase: PurchaseWithItems | null;
  onSelect: (id: string) => void;
  activeGroupId: string | null;
  profileMap?: Map<string, string>;
  filtered: boolean;
  scrollable?: boolean;
}

const TripsPanel = ({
  purchases,
  selectedPurchase,
  onSelect,
  activeGroupId,
  profileMap,
  filtered,
  scrollable = false,
}: TripsPanelProps) => (
  <section className="surface-panel min-w-0 rounded-[2rem] p-4 sm:p-5">
    <header className="mb-4 flex items-center justify-between gap-4 px-1">
      <div>
        <h2 className="font-display text-lg font-bold text-foreground">
          {filtered ? "Matching trips" : "Recent trips"}
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Select a trip to open its receipt
        </p>
      </div>
      <span className="rounded-full bg-[hsl(var(--surface-subtle))] px-2.5 py-1 text-xs font-semibold tabular-nums text-muted-foreground">
        {purchases.length}
      </span>
    </header>

    <div className={cn("space-y-2", scrollable && "max-h-[68vh] overflow-y-auto pr-1")}>
      {purchases.map((purchase) => (
        <TripCard
          key={purchase.id}
          purchase={purchase}
          isActive={selectedPurchase?.id === purchase.id}
          onClick={() => onSelect(purchase.id)}
          loggedBy={activeGroupId ? profileMap?.get(purchase.user_id) : undefined}
        />
      ))}
    </div>
  </section>
);

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  copy: string;
}

const EmptyState = ({ icon: Icon = Receipt, title, copy }: EmptyStateProps) => (
  <section className="surface-panel rounded-[2rem] px-6 py-12 text-center">
    <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
      <Icon className="h-6 w-6" />
    </span>
    <h2 className="mt-4 font-display text-xl font-bold text-foreground">{title}</h2>
    <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{copy}</p>
  </section>
);

const PurchasesSkeleton = () => (
  <div className="grid animate-pulse gap-4 xl:grid-cols-[minmax(360px,0.72fr)_minmax(0,1.28fr)]">
    {[0, 1].map((section) => (
      <div key={section} className="surface-panel rounded-[2rem] p-5">
        <div className="mb-5 h-10 w-40 rounded-2xl bg-muted" />
        <div className="space-y-2">
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="h-24 rounded-2xl bg-muted/70" />
          ))}
        </div>
      </div>
    ))}
  </div>
);

export default Purchases;
