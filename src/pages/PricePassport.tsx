import { useEffect, useMemo, useState } from "react";
import { format, isToday, parseISO } from "date-fns";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BadgeCheck,
  BarChart3,
  ChevronRight,
  CircleDollarSign,
  Eye,
  History,
  Package,
  Plus,
  ReceiptText,
  ShieldCheck,
  ShoppingBasket,
  Sparkles,
  Store,
  Trophy,
  UsersRound,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useInventory, useItems } from "@/hooks/usePantry";
import { usePurchases } from "@/hooks/usePurchases";
import { usePriceObservations } from "@/hooks/usePricePassport";
import { useIsPhone } from "@/hooks/use-shell-mode";
import {
  basisForUnit,
  basisLabel,
  getStockAdvice,
  normalizePrice,
  summarizeStores,
  type NormalizedPriceRecord,
  type PriceBasis,
  type PriceRecord,
} from "@/lib/price-passport";
import AddPriceDialog from "@/components/price-passport/AddPriceDialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const CHART_COLORS = [
  "hsl(var(--primary))",
  "#6556D9",
  "#F59E0B",
  "#0EA5E9",
  "#E05691",
  "#64748B",
];

const sourceMeta = {
  receipt: { label: "Bought", icon: ReceiptText, className: "text-primary bg-primary/10" },
  observed: { label: "Observed", icon: Eye, className: "text-[#6556D9] bg-[#6556D9]/10" },
  community: { label: "Shopper price", icon: UsersRound, className: "text-[#0E7490] bg-[#0E7490]/10" },
} as const;

const rankStyle = [
  "border-[#E9B949]/40 bg-[#FFF6D8] text-[#8A6300] dark:bg-[#E9B949]/15 dark:text-[#F7D774]",
  "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-600 dark:bg-slate-700/40 dark:text-slate-200",
  "border-[#D99058]/35 bg-[#FFF0E6] text-[#9A4D1F] dark:bg-[#D99058]/15 dark:text-[#F1B184]",
];

type ChartRow = {
  date: string;
  timestamp: number;
  [storeName: string]: string | number;
};

function dedupeRecords(records: PriceRecord[]) {
  const seen = new Set<string>();
  return records.filter((record) => {
    const key = [
      record.storeName.trim().toLowerCase(),
      record.totalPrice.toFixed(3),
      record.quantity.toFixed(3),
      record.unit.toLowerCase(),
      record.observedAt.slice(0, 10),
    ].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildChartData(records: NormalizedPriceRecord[], stores: string[]): ChartRow[] {
  const selected = new Set(stores);
  const byDay = new Map<string, ChartRow>();

  records
    .filter((record) => selected.has(record.storeName))
    .sort((a, b) => new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime())
    .forEach((record) => {
      const day = record.observedAt.slice(0, 10);
      const existing = byDay.get(day) ?? {
        date: format(parseISO(day), "MMM d"),
        timestamp: new Date(day).getTime(),
      };
      existing[record.storeName] = Number(record.normalizedPrice.toFixed(2));
      byDay.set(day, existing);
    });

  return [...byDay.values()].sort((a, b) => a.timestamp - b.timestamp);
}

const PricePassport = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const isPhone = useIsPhone();
  const { data: inventory, isLoading: inventoryLoading } = useInventory();
  const { data: items, isLoading: itemsLoading } = useItems();
  const { data: purchases, isLoading: purchasesLoading } = usePurchases();
  const [addPriceOpen, setAddPriceOpen] = useState(false);
  const [basis, setBasis] = useState<PriceBasis>("kg");
  const [historyMode, setHistoryMode] = useState<"all" | "store">("all");
  const [historyStore, setHistoryStore] = useState("");

  const inventoryRows = useMemo(
    () => (inventory ?? []).filter((entry) => entry.item_id === itemId),
    [inventory, itemId],
  );
  const item =
    inventoryRows[0]?.items ??
    (items ?? []).find((candidate) => candidate.id === itemId) ??
    (purchases ?? [])
      .flatMap((purchase) => purchase.purchase_items ?? [])
      .find((line) => line.item_id === itemId)?.items;

  const {
    data: observationData,
    isLoading: observationsLoading,
    error: observationsError,
  } = usePriceObservations(itemId, item?.name, item?.brand);

  const priceRecords = useMemo(() => {
    if (!itemId) return [];

    const receipts: PriceRecord[] = (purchases ?? []).flatMap((purchase) =>
      (purchase.purchase_items ?? [])
        .filter((line) => line.item_id === itemId && line.unit_price != null && purchase.store_name)
        .map((line) => ({
          id: `receipt-${line.id}`,
          storeName: purchase.store_name!,
          totalPrice: Number(line.unit_price),
          currency: "AED",
          quantity: line.weight != null ? Number(line.weight) : Number(line.quantity),
          unit: line.weight_unit || line.unit,
          observedAt: purchase.purchased_at,
          source: "receipt" as const,
        })),
    );

    const observed: PriceRecord[] = (observationData?.scoped ?? []).map((observation) => ({
      id: `observed-${observation.id}`,
      storeName: observation.store_name,
      totalPrice: Number(observation.price),
      currency: observation.currency,
      quantity: Number(observation.package_quantity),
      unit: observation.package_unit,
      observedAt: observation.observed_at,
      source: "observed" as const,
    }));

    const scopedIds = new Set((observationData?.scoped ?? []).map((observation) => observation.id));
    const community: PriceRecord[] = (observationData?.community ?? [])
      .filter((observation) => !scopedIds.has(observation.id))
      .map((observation) => ({
        id: `community-${observation.id}`,
        storeName: observation.store_name,
        totalPrice: Number(observation.price),
        currency: observation.currency,
        quantity: Number(observation.package_quantity),
        unit: observation.package_unit,
        observedAt: observation.observed_at,
        source: "community" as const,
      }));

    return dedupeRecords([...receipts, ...observed, ...community]);
  }, [itemId, observationData, purchases]);

  const normalizedRecords = useMemo(
    () =>
      priceRecords
        .map(normalizePrice)
        .filter((record): record is NormalizedPriceRecord => Boolean(record)),
    [priceRecords],
  );

  const availableBases = useMemo(() => {
    const set = new Set(normalizedRecords.map((record) => record.basis));
    if (item?.default_unit) set.add(basisForUnit(item.default_unit));
    if (inventoryRows[0]?.unit) set.add(basisForUnit(inventoryRows[0].unit));
    return (["kg", "l", "piece", "pack"] as PriceBasis[]).filter((value) => set.has(value));
  }, [inventoryRows, item?.default_unit, normalizedRecords]);

  useEffect(() => {
    if (availableBases.length > 0 && !availableBases.includes(basis)) {
      setBasis(availableBases[0]);
    }
  }, [availableBases, basis]);

  const storeSummaries = useMemo(
    () => summarizeStores(normalizedRecords, basis),
    [basis, normalizedRecords],
  );
  const best = storeSummaries[0];
  const highest = storeSummaries.at(-1)?.normalizedPrice ?? best?.normalizedPrice ?? 0;
  const potentialSaving = Math.max(0, highest - (best?.normalizedPrice ?? 0));
  const stockAdvice = useMemo(
    () =>
      getStockAdvice(
        inventoryRows.map((entry) => ({ quantity: Number(entry.quantity), unit: entry.unit })),
        item?.serving_size,
      ),
    [inventoryRows, item?.serving_size],
  );

  const historyRecords = useMemo(
    () => normalizedRecords.filter((record) => record.basis === basis),
    [basis, normalizedRecords],
  );
  const historyStores = useMemo(
    () => [...new Set(historyRecords.map((record) => record.storeName))],
    [historyRecords],
  );

  useEffect(() => {
    if (!historyStore || !historyStores.includes(historyStore)) {
      setHistoryStore(historyStores[0] ?? "");
    }
  }, [historyStore, historyStores]);

  const visibleHistoryStores = useMemo(
    () =>
      historyMode === "store" && historyStore
        ? [historyStore]
        : historyStores.slice(0, 6),
    [historyMode, historyStore, historyStores],
  );
  const chartData = useMemo(
    () => buildChartData(historyRecords, visibleHistoryStores),
    [historyRecords, visibleHistoryStores],
  );
  const chartConfig = useMemo<ChartConfig>(
    () =>
      Object.fromEntries(
        visibleHistoryStores.map((storeName, index) => [
          storeName,
          { label: storeName, color: CHART_COLORS[index % CHART_COLORS.length] },
        ]),
      ),
    [visibleHistoryStores],
  );

  const isLoading =
    inventoryLoading || itemsLoading || purchasesLoading || (Boolean(item) && observationsLoading);

  if (isLoading && !item) {
    return (
      <div className="mx-auto max-w-6xl space-y-5">
        <Skeleton className="h-20 rounded-3xl" />
        <div className="grid gap-5 lg:grid-cols-[0.72fr_1.28fr]">
          <Skeleton className="h-72 rounded-3xl" />
          <Skeleton className="h-[32rem] rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <Package className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-xl font-bold">Item not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This Price Passport is no longer connected to an item in your pantry.
        </p>
        <Button className="mt-5" onClick={() => navigate("/pantry")}>Back to Pantry</Button>
      </div>
    );
  }

  const bestSource = best ? sourceMeta[best.source] : null;
  const communityCount = (observationData?.community ?? []).length;

  return (
    <div className={cn("mx-auto max-w-6xl", isPhone ? "pb-24" : "pb-6")}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate("/pantry")}
          className="inline-flex min-h-11 items-center gap-2 rounded-full px-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Pantry
        </button>
        {!isPhone && (
          <Button className="h-11 rounded-full px-5 shadow-sm" onClick={() => setAddPriceOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add observed price
          </Button>
        )}
      </div>

      <header className="surface-panel mb-5 overflow-hidden rounded-3xl p-4 sm:p-5">
        <div className="flex items-center gap-4">
          <div className="media-well flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[hsl(var(--surface-border))] sm:h-24 sm:w-24">
            {item.image_url ? (
              <img
                src={item.image_url}
                alt=""
                className="h-full w-full object-contain p-1.5 mix-blend-multiply"
              />
            ) : (
              <ShoppingBasket className="h-8 w-8 text-[hsl(155_10%_55%)]" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full border-0 bg-primary/10 text-primary hover:bg-primary/10">
                <BadgeCheck className="mr-1 h-3 w-3" />
                In Pantry
              </Badge>
              {item.brand && <span className="text-xs font-medium text-muted-foreground">{item.brand}</span>}
            </div>
            <h1 className="mt-1.5 truncate text-2xl font-bold tracking-tight sm:text-3xl">{item.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5" />
                {stockAdvice.portions !== null
                  ? `${stockAdvice.portions} portions left`
                  : stockAdvice.stockAmount + " left"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <History className="h-3.5 w-3.5" />
                {priceRecords.length} price record{priceRecords.length === 1 ? "" : "s"}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[0.72fr_1.28fr]">
        <aside className="space-y-5 lg:sticky lg:top-24">
          <section
            className={cn(
              "overflow-hidden rounded-3xl border p-5",
              stockAdvice.tone === "buy"
                ? "border-primary/25 bg-primary/[0.07]"
                : stockAdvice.tone === "plan"
                  ? "border-warning/25 bg-warning/[0.08]"
                  : "border-[hsl(var(--surface-border))] bg-[hsl(var(--surface-panel))]",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  Wait or buy?
                </p>
                <h2
                  className={cn(
                    "mt-2 text-2xl font-bold tracking-tight",
                    stockAdvice.tone === "buy"
                      ? "text-primary"
                      : stockAdvice.tone === "plan"
                        ? "text-warning"
                        : "text-foreground",
                  )}
                >
                  {stockAdvice.label}
                </h2>
              </div>
              <div
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
                  stockAdvice.tone === "buy"
                    ? "bg-primary text-primary-foreground"
                    : stockAdvice.tone === "plan"
                      ? "bg-warning text-warning-foreground"
                      : "bg-secondary text-secondary-foreground",
                )}
              >
                <ShoppingBasket className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{stockAdvice.detail}</p>
            <div className="mt-4 flex items-start gap-2 rounded-2xl bg-background/60 p-3 text-xs leading-relaxed text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              Recommendation uses only your pantry stock, never a store’s price movement.
            </div>
          </section>

          <section className="surface-panel rounded-3xl p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0E7490]/10 text-[#0E7490]">
                <UsersRound className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold">Prices from real shoppers</h2>
                <p className="text-sm text-muted-foreground">
                  {communityCount > 0
                    ? `${communityCount} shared observation${communityCount === 1 ? "" : "s"} for this item`
                    : "The community catalogue starts with shoppers like you"}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Identity and private notes are never shared.
            </div>
          </section>
        </aside>

        <main className="space-y-5">
          {availableBases.length > 0 && (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-muted-foreground">Compare by</p>
              <div className="flex rounded-full bg-secondary p-1" role="group" aria-label="Price comparison unit">
                {availableBases.map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={basis === value}
                    onClick={() => setBasis(value)}
                    className={cn(
                      "min-h-9 rounded-full px-4 text-sm font-semibold transition-all",
                      basis === value
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Per {basisLabel(value)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {best ? (
            <section className="relative isolate overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#063D2A_0%,#087443_55%,#10A35A_100%)] p-5 text-white shadow-[0_18px_50px_-28px_rgba(6,61,42,0.8)] sm:p-6">
              <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-[#A7F3D0]/10 blur-2xl" />
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-100">
                    <Trophy className="h-4 w-4 text-[#F6D365]" />
                    {isToday(parseISO(best.observedAt)) ? "Best today" : "Best available"}
                  </div>
                  <p className="mt-4 text-sm text-emerald-100/85">{best.storeName}</p>
                  <div className="mt-0.5 flex items-end gap-2">
                    <span className="text-4xl font-bold tracking-tight tabular-nums sm:text-5xl">
                      AED {best.normalizedPrice.toFixed(2)}
                    </span>
                    <span className="pb-1.5 text-sm text-emerald-100">/{basisLabel(basis)}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {potentialSaving > 0 && (
                      <span className="rounded-full bg-white/14 px-3 py-1.5 text-xs font-semibold backdrop-blur">
                        Save up to AED {potentialSaving.toFixed(2)} per {basisLabel(basis)}
                      </span>
                    )}
                    {bestSource && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-black/15 px-3 py-1.5 text-xs text-emerald-50">
                        <bestSource.icon className="h-3.5 w-3.5" />
                        {bestSource.label} · {format(parseISO(best.observedAt), "d MMM yyyy")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/12 shadow-inner backdrop-blur">
                  <CircleDollarSign className="h-7 w-7 text-[#F6D365]" />
                </div>
              </div>
            </section>
          ) : (
            <section className="surface-panel rounded-3xl p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <CircleDollarSign className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-xl font-bold">Start this Price Passport</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Add a price you spot in a store. Future receipts for {item.name} will join the comparison automatically.
              </p>
              <Button className="mt-5 h-11 rounded-full px-5" onClick={() => setAddPriceOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add first price
              </Button>
            </section>
          )}

          {storeSummaries.length > 0 && (
            <section className="surface-panel overflow-hidden rounded-3xl">
              <div className="flex items-center justify-between px-5 pb-3 pt-5 sm:px-6">
                <div>
                  <h2 className="text-lg font-bold">Store comparison</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">Latest comparable price from each store</p>
                </div>
                <Store className="h-5 w-5 text-muted-foreground" />
              </div>

              <div className="divide-y divide-border">
                {storeSummaries.map((store, index) => {
                  const source = sourceMeta[store.source];
                  return (
                    <div key={`${store.storeName}-${store.id}`} className="group flex items-center gap-3 px-4 py-4 transition-colors hover:bg-secondary/45 sm:px-6">
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-bold",
                          rankStyle[index] ?? "border-border bg-secondary text-muted-foreground",
                        )}
                      >
                        {store.rank}
                      </div>
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-lg font-bold text-secondary-foreground">
                        {store.storeName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-2">
                          <p className="truncate font-bold">{store.storeName}</p>
                          {store.rank === 1 && (
                            <Badge className="hidden shrink-0 border-0 bg-primary/10 text-[10px] text-primary hover:bg-primary/10 sm:inline-flex">
                              Best price
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium", source.className)}>
                            <source.icon className="h-3 w-3" />
                            {source.label}
                          </span>
                          <span>{format(parseISO(store.observedAt), "d MMM yyyy")}</span>
                          {store.rank > 1 && (
                            <span>+AED {store.differenceFromBest.toFixed(2)}</span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-lg font-bold tabular-nums">
                          <span className="mr-1 text-xs font-semibold text-muted-foreground">AED</span>
                          {store.normalizedPrice.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">/{basisLabel(basis)}</p>
                      </div>
                      <ChevronRight className="hidden h-4 w-4 shrink-0 text-muted-foreground/50 sm:block" />
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <Accordion type="single" collapsible className="surface-panel overflow-hidden rounded-3xl">
            <AccordionItem value="history" className="border-0">
              <AccordionTrigger className="px-5 py-5 hover:no-underline sm:px-6">
                <div className="flex items-center gap-3 text-left">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-bold">Price history</h2>
                    <p className="mt-0.5 text-xs font-normal text-muted-foreground">
                      {historyRecords.length > 0
                        ? `${historyRecords.length} records · hidden until you need the trend`
                        : "Your chart will grow as you add receipts and observations"}
                    </p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-5 sm:px-6">
                {historyRecords.length > 0 ? (
                  <>
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex rounded-full bg-secondary p-1">
                        <button
                          type="button"
                          onClick={() => setHistoryMode("all")}
                          className={cn(
                            "min-h-9 flex-1 rounded-full px-4 text-sm font-semibold transition-all sm:flex-none",
                            historyMode === "all" ? "bg-card shadow-sm" : "text-muted-foreground",
                          )}
                        >
                          All stores
                        </button>
                        <button
                          type="button"
                          onClick={() => setHistoryMode("store")}
                          className={cn(
                            "min-h-9 flex-1 rounded-full px-4 text-sm font-semibold transition-all sm:flex-none",
                            historyMode === "store" ? "bg-card shadow-sm" : "text-muted-foreground",
                          )}
                        >
                          By store
                        </button>
                      </div>
                      {historyMode === "store" && historyStores.length > 0 && (
                        <Select value={historyStore} onValueChange={setHistoryStore}>
                          <SelectTrigger className="h-10 w-full rounded-full sm:w-52">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {historyStores.map((storeName) => (
                              <SelectItem key={storeName} value={storeName}>{storeName}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    <ChartContainer config={chartConfig} className="h-[250px] w-full aspect-auto">
                      <LineChart data={chartData} margin={{ top: 12, right: 12, left: -12, bottom: 4 }}>
                        <CartesianGrid vertical={false} strokeDasharray="4 4" />
                        <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={26} />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          width={52}
                          tickFormatter={(value) => `AED ${value}`}
                        />
                        <RechartsTooltip
                          content={
                            <ChartTooltipContent
                              labelFormatter={(value) => String(value)}
                              formatter={(value, name) => (
                                <div className="flex w-full items-center justify-between gap-4">
                                  <span className="text-muted-foreground">{String(name)}</span>
                                  <span className="font-mono font-semibold tabular-nums">
                                    AED {Number(value).toFixed(2)}
                                  </span>
                                </div>
                              )}
                            />
                          }
                        />
                        {visibleHistoryStores.map((storeName, index) => (
                          <Line
                            key={storeName}
                            type="monotone"
                            dataKey={storeName}
                            stroke={CHART_COLORS[index % CHART_COLORS.length]}
                            strokeWidth={2.5}
                            dot={{ r: 3, strokeWidth: 2 }}
                            activeDot={{ r: 5 }}
                            connectNulls
                          />
                        ))}
                      </LineChart>
                    </ChartContainer>

                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                      {visibleHistoryStores.map((storeName, index) => (
                        <span key={storeName} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                          />
                          {storeName}
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="rounded-2xl bg-secondary/60 p-5 text-center">
                    <Sparkles className="mx-auto h-5 w-5 text-primary" />
                    <p className="mt-2 text-sm font-semibold">No trend yet</p>
                    <p className="mt-1 text-xs text-muted-foreground">Two or more prices will make changes easier to see.</p>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {observationsError && (
            <div className="rounded-2xl border border-warning/25 bg-warning/[0.07] p-4 text-sm text-muted-foreground">
              Your receipt history is available, but shopper observations could not be loaded. Try again shortly.
            </div>
          )}
        </main>
      </div>

      {isPhone && (
        <div className="fixed inset-x-0 bottom-[calc(var(--phone-nav-height)+var(--safe-bottom))] z-30 border-t border-[hsl(var(--surface-border))] bg-[hsl(var(--surface-panel)/0.94)] p-3 backdrop-blur-xl">
          <Button
            className="mx-auto h-12 w-full max-w-lg rounded-full text-base font-semibold shadow-lg shadow-primary/20"
            onClick={() => setAddPriceOpen(true)}
          >
            <Plus className="mr-2 h-5 w-5" />
            Add observed price
          </Button>
        </div>
      )}

      <AddPriceDialog item={item} open={addPriceOpen} onOpenChange={setAddPriceOpen} />
    </div>
  );
};

export default PricePassport;
