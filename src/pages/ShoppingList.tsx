import { useEffect, useMemo, useState } from "react";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { useSearchParams } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  CheckCircle2,
  ChefHat,
  CircleDollarSign,
  ListChecks,
  Package,
  Pencil,
  Search,
  ShoppingBasket,
  ShoppingCart,
  Share2,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import AddShoppingItemDialog from "@/components/shopping/AddShoppingItemDialog";
import EditShoppingItemDialog from "@/components/shopping/EditShoppingItemDialog";
import BasketAssignDialog from "@/components/shopping/BasketAssignDialog";
import BasketEditDialog from "@/components/shopping/BasketEditDialog";
import ShareShoppingDialog from "@/components/shopping/ShareShoppingDialog";
import ShoppingCartSheet from "@/components/shopping/ShoppingCartSheet";
import ShoppingItemRow from "@/components/shopping/ShoppingItemRow";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useGroupContext } from "@/contexts/GroupContext";
import { useGroups } from "@/hooks/useGroups";
import { useProfileNames } from "@/hooks/useProfileNames";
import { useIsPhone } from "@/hooks/use-shell-mode";
import { useSetCartMembership, useShoppingList, type ShoppingItem } from "@/hooks/useShoppingList";
import { useToast } from "@/hooks/use-toast";
import { useRecipes } from "@/hooks/useRecipes";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";

type FilterTab = "all" | "open" | "completed";

const UNSORTED = "__unsorted__";

const lineTotal = (item: ShoppingItem) => Number(item.estimated_cost ?? 0);
const sumTotal = (items: ShoppingItem[]) => items.reduce((sum, item) => sum + lineTotal(item), 0);

interface DateGroup {
  key: string;
  label: string;
  items: ShoppingItem[];
  total: number;
}

interface SubSection {
  id: "regular" | "recipe";
  title: string;
  icon: LucideIcon;
  tone: string;
  groups: DateGroup[];
  count: number;
  total: number;
}

interface BasketGroup {
  key: string;
  label: string;
  isUnsorted: boolean;
  count: number;
  total: number;
  openTotal: number;
  sections: SubSection[];
}

const dateLabel = (iso: string) => {
  const date = parseISO(iso);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEE d MMM yyyy");
};

const groupByDate = (items: ShoppingItem[]): DateGroup[] => {
  const map = new Map<string, DateGroup>();

  for (const item of items) {
    const key = item.created_at.slice(0, 10);
    if (!map.has(key)) {
      map.set(key, { key, label: dateLabel(item.created_at), items: [], total: 0 });
    }
    const group = map.get(key)!;
    group.items.push(item);
    group.total += lineTotal(item);
  }

  return [...map.values()].sort((a, b) => (a.key < b.key ? 1 : -1));
};

const buildSections = (items: ShoppingItem[]): SubSection[] => {
  const regular = items.filter((item) => !item.recipe_id);
  const fromRecipes = items.filter((item) => Boolean(item.recipe_id));

  const sections: SubSection[] = [];
  if (regular.length) {
    sections.push({
      id: "regular",
      title: "Regular shopping",
      icon: ShoppingCart,
      tone: "text-primary",
      groups: groupByDate(regular),
      count: regular.length,
      total: sumTotal(regular),
    });
  }
  if (fromRecipes.length) {
    sections.push({
      id: "recipe",
      title: "From My Cook Book",
      icon: ChefHat,
      tone: "text-success",
      groups: groupByDate(fromRecipes),
      count: fromRecipes.length,
      total: sumTotal(fromRecipes),
    });
  }
  return sections;
};

const buildBaskets = (items: ShoppingItem[]): BasketGroup[] => {
  const map = new Map<string, ShoppingItem[]>();

  for (const item of items) {
    const key = item.basket?.trim() ? item.basket.trim() : UNSORTED;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }

  const baskets = [...map.entries()].map(([key, basketItems]) => ({
    key,
    label: key === UNSORTED ? "Unsorted list" : key,
    isUnsorted: key === UNSORTED,
    count: basketItems.length,
    total: sumTotal(basketItems),
    openTotal: sumTotal(basketItems.filter((item) => !item.is_purchased)),
    sections: buildSections(basketItems),
  }));

  return baskets.sort((a, b) => {
    if (a.isUnsorted !== b.isUnsorted) return a.isUnsorted ? 1 : -1;
    return a.label.localeCompare(b.label);
  });
};

const filterTabs: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "open", label: "To buy" },
  { key: "completed", label: "Packed" },
];

const ShoppingList = () => {
  const { data: list, isLoading } = useShoppingList();
  const { data: recipes } = useRecipes();
  const [editing, setEditing] = useState<ShoppingItem | null>(null);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [basketDialogOpen, setBasketDialogOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [managingBasket, setManagingBasket] = useState<{ name: string | null } | null>(null);
  const [shareState, setShareState] = useState<{ items: ShoppingItem[]; title?: string } | null>(
    null
  );
  const [searchParams] = useSearchParams();
  const { activeGroupId, isPersonalMode } = useGroupContext();
  const { groups } = useGroups();
  const isPhone = useIsPhone();
  const setCart = useSetCartMembership();
  const { toast } = useToast();

  const cartItems = useMemo(() => (list ?? []).filter((item) => item.in_cart), [list]);

  const addToCart = async (items: ShoppingItem[], label: string) => {
    const ids = items.filter((item) => !item.in_cart).map((item) => item.id);
    if (ids.length === 0) {
      toast({ title: "Already in cart", description: label });
      setCartOpen(true);
      return;
    }
    await setCart.mutateAsync({ ids, inCart: true });
    toast({
      title: `Added to cart`,
      description: `${ids.length} item${ids.length === 1 ? "" : "s"} from ${label}.`,
    });
    setCartOpen(true);
  };

  const activeGroup = groups.find((group) => group.id === activeGroupId);
  const contextLabel = isPersonalMode ? "Personal list" : activeGroup?.name ?? "Shared list";
  const prefill = searchParams.get("prefill");

  const userIds = useMemo(() => {
    if (!list) return [];

    return list.flatMap((item) =>
      item.completed_by ? [item.user_id, item.completed_by] : [item.user_id]
    );
  }, [list]);
  const { data: profileMap } = useProfileNames(userIds);

  const totals = useMemo(() => {
    const items = list ?? [];
    const purchased = items.filter((item) => item.is_purchased).length;
    const open = items.length - purchased;
    const estimate = sumTotal(items.filter((item) => !item.is_purchased));

    return {
      all: items.length,
      open,
      purchased,
      estimate,
      grandTotal: sumTotal(items),
      progress: items.length ? Math.round((purchased / items.length) * 100) : 0,
    };
  }, [list]);

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return (list ?? []).filter((item) => {
      const matchesSearch =
        !normalizedSearch ||
        item.name.toLowerCase().includes(normalizedSearch) ||
        item.category?.toLowerCase().includes(normalizedSearch) ||
        item.basket?.toLowerCase().includes(normalizedSearch);

      if (!matchesSearch) return false;
      if (filterTab === "open") return !item.is_purchased;
      if (filterTab === "completed") return item.is_purchased;
      return true;
    });
  }, [filterTab, list, search]);

  const baskets = useMemo(() => buildBaskets(filtered), [filtered]);

  const existingBaskets = useMemo(() => {
    const names = new Set<string>();
    (list ?? []).forEach((item) => {
      if (item.basket?.trim()) names.add(item.basket.trim());
    });
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [list]);

  const recipeNames = useMemo(() => {
    const map = new Map<string, string>();
    (recipes ?? []).forEach((recipe) => map.set(recipe.id, recipe.name));
    return map;
  }, [recipes]);

  const visibleIds = useMemo(() => filtered.map((item) => item.id), [filtered]);

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => visibleIds.includes(id)));
  }, [visibleIds]);

  const toggleSelected = (id: string) =>
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    );

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds([]);
  };

  const selectedItems = useMemo(
    () => (list ?? []).filter((item) => selectedIds.includes(item.id)),
    [list, selectedIds]
  );

  const filterCount = (key: FilterTab) => {
    if (key === "open") return totals.open;
    if (key === "completed") return totals.purchased;
    return totals.all;
  };

  const pulseTitle =
    totals.all === 0
      ? "Build your next shop"
      : totals.open === 0
        ? "Everything is in the basket"
        : `${totals.open} item${totals.open === 1 ? "" : "s"} left to pick up`;

  const pulseCopy =
    totals.all === 0
      ? "Add the essentials now and keep every trip focused."
      : totals.open === 0
        ? "Nice work — this list is completely checked off."
        : `${totals.purchased} of ${totals.all} checked off`;

  return (
    <div className="mx-auto max-w-[1440px] space-y-4 pb-24 md:space-y-6 md:pb-6">
      {!isPhone && (
        <header className="flex items-end justify-between gap-6">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Smart shopping
            </div>
            <h1 className="font-display text-4xl font-bold tracking-tight text-foreground">
              Shopping List
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Plan the basket, share the work, and check things off as you shop.
            </p>
          </div>
          <AddShoppingItemDialog />
        </header>
      )}

      <section className="relative overflow-hidden rounded-[2rem] border border-primary/15 bg-[linear-gradient(135deg,hsl(var(--surface-panel))_0%,hsl(var(--accent))_62%,hsl(var(--surface-panel))_100%)] p-5 shadow-[0_24px_70px_-50px_hsl(var(--primary)/0.65)] sm:p-7">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-primary/12 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 left-1/3 h-52 w-52 rounded-full bg-success/10 blur-3xl"
        />

        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(430px,0.8fr)] lg:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-primary/15 bg-[hsl(var(--surface-panel)/0.75)] px-3 text-xs font-semibold text-foreground shadow-sm backdrop-blur">
                {isPersonalMode ? (
                  <Package className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <Users className="h-3.5 w-3.5 text-primary" />
                )}
                {contextLabel}
              </span>
              {prefill && (
                <span className="inline-flex min-h-8 items-center rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-sm">
                  Suggested: {prefill}
                </span>
              )}
            </div>

            <h2 className="mt-5 max-w-2xl font-display text-3xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-4xl">
              {pulseTitle}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">{pulseCopy}</p>

            <div className="mt-5 max-w-xl">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold">
                <span className="text-muted-foreground">Shopping progress</span>
                <span className="tabular-nums text-foreground">{totals.progress}%</span>
              </div>
              <div
                className="h-2.5 overflow-hidden rounded-full bg-[hsl(var(--surface-inset))]"
                role="progressbar"
                aria-label="Shopping progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={totals.progress}
              >
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,hsl(var(--primary)),hsl(var(--success)))] transition-[width] duration-500"
                  style={{ width: `${totals.progress}%` }}
                />
              </div>
            </div>

            {isPhone && (
              <AddShoppingItemDialog
                triggerLabel="Add to list"
                triggerClassName="mt-5 w-full shadow-md"
              />
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <PulseMetric
              icon={ListChecks}
              value={totals.all}
              label="On list"
              tone="text-foreground"
            />
            <PulseMetric
              icon={CheckCircle2}
              value={totals.purchased}
              label="Packed"
              tone="text-success"
            />
            <PulseMetric
              icon={CircleDollarSign}
              value={totals.estimate > 0 ? formatCurrency(totals.estimate) : "—"}
              phoneValue={
                totals.estimate > 0
                  ? totals.estimate.toLocaleString(undefined, { maximumFractionDigits: 2 })
                  : "—"
              }
              label="Open est."
              phoneLabel="AED est."
              tone="text-primary"
            />
          </div>
        </div>
      </section>

      <section className="surface-panel rounded-[1.75rem] p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div
            className="grid grid-cols-3 gap-1 rounded-2xl bg-[hsl(var(--surface-subtle))] p-1"
            role="group"
            aria-label="Filter shopping list"
          >
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilterTab(tab.key)}
                aria-pressed={filterTab === tab.key}
                className={cn(
                  "flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition sm:text-sm",
                  filterTab === tab.key
                    ? "bg-[hsl(var(--surface-panel))] text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[0.65rem] tabular-nums",
                    filterTab === tab.key ? "bg-primary/10 text-primary" : "bg-muted/70"
                  )}
                >
                  {filterCount(tab.key)}
                </span>
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3">
            <div className="relative min-w-0 flex-1 lg:max-w-sm">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                inputMode="search"
                placeholder="Search items or baskets"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="min-h-11 rounded-2xl border-border/70 bg-[hsl(var(--surface-subtle))] pl-10 pr-11 shadow-none"
                aria-label="Search shopping list"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:gap-3">
              <Button
                type="button"
                variant={selectMode ? "default" : "outline"}
                className="min-h-11 min-w-0 shrink-0 rounded-2xl px-2 text-xs sm:px-4 sm:text-sm"
                onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
              >
                <ShoppingBasket className="mr-1.5 h-4 w-4 shrink-0" />
                <span className="truncate">{selectMode ? "Done" : "Select"}</span>
                <span className="hidden sm:ml-1 sm:inline">{selectMode ? "selecting" : "items"}</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                className="min-h-11 min-w-0 shrink-0 rounded-2xl px-2 text-xs sm:px-4 sm:text-sm"
                disabled={!filtered.length}
                onClick={() => setShareState({ items: filtered, title: contextLabel })}
              >
                <Share2 className="mr-1.5 h-4 w-4 shrink-0" />
                <span className="truncate">Share</span>
                <span className="hidden sm:ml-1 sm:inline">list</span>
              </Button>

              <Button
                type="button"
                className="min-h-11 min-w-0 shrink-0 rounded-2xl px-2 text-xs sm:px-4 sm:text-sm"
                onClick={() => setCartOpen(true)}
              >
                <ShoppingCart className="mr-1.5 h-4 w-4 shrink-0" />
                <span className="truncate">Cart</span>
                <span className="ml-1.5 rounded-full bg-primary-foreground/20 px-1.5 py-0.5 text-[0.65rem] tabular-nums">
                  {cartItems.length}
                </span>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {isLoading ? (
        <ShoppingListSkeleton />
      ) : totals.all === 0 ? (
        <EmptyState
          title="Your list is ready for a fresh start"
          copy={
            isPersonalMode
              ? "Add your first item and turn the next shop into a simple checklist."
              : `Add the first item for ${activeGroup?.name ?? "your group"} so everyone can help.`
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matching items"
          copy="Try another search or switch the list filter."
        />
      ) : (
        <div className="space-y-4 md:space-y-6">
          {baskets.map((basket) => (
            <BasketCard
              key={basket.key}
              basket={basket}
              onEdit={setEditing}
              activeGroupId={activeGroupId}
              profileMap={profileMap}
              recipeNames={recipeNames}
              selectMode={selectMode}
              selectedIds={selectedIds}
              onToggleSelected={toggleSelected}
              onShare={(items, title) => setShareState({ items, title })}
              onAddToCart={(items, label) => addToCart(items, label)}
              onManage={() => setManagingBasket({ name: basket.isUnsorted ? null : basket.key })}
            />
          ))}

          <section className="surface-panel flex flex-wrap items-center justify-between gap-3 rounded-[1.75rem] p-4 sm:p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Whole list total
              </p>
              <p className="mt-1 font-display text-2xl font-bold tabular-nums text-foreground">
                {formatCurrency(totals.grandTotal)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Still to buy
              </p>
              <p className="mt-1 font-display text-2xl font-bold tabular-nums text-primary">
                {formatCurrency(totals.estimate)}
              </p>
            </div>
          </section>
        </div>
      )}

      {selectMode && selectedIds.length > 0 && (
        <div className="fixed inset-x-3 bottom-4 z-40 mx-auto flex max-w-lg items-center justify-between gap-3 rounded-2xl border border-primary/25 bg-[hsl(var(--surface-panel)/0.96)] p-3 shadow-[0_24px_60px_-30px_hsl(var(--primary)/0.6)] backdrop-blur">
          <span className="pl-1 text-sm font-semibold text-foreground">
            {selectedIds.length} selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              className="min-h-10 rounded-xl"
              onClick={() => setSelectedIds([])}
            >
              Clear
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-10 rounded-xl"
              onClick={() => setShareState({ items: selectedItems, title: contextLabel })}
            >
              <Share2 className="mr-1.5 h-4 w-4" />
              Share
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-10 rounded-xl"
              onClick={() => setBasketDialogOpen(true)}
            >
              <ShoppingBasket className="mr-1.5 h-4 w-4" />
              To basket
            </Button>
            <Button
              type="button"
              className="min-h-10 rounded-xl"
              disabled={setCart.isPending}
              onClick={async () => {
                await addToCart(selectedItems, "your selection");
                exitSelectMode();
              }}
            >
              <ShoppingCart className="mr-1.5 h-4 w-4" />
              Add to cart
            </Button>
          </div>
        </div>
      )}

      <BasketAssignDialog
        open={basketDialogOpen}
        onClose={() => setBasketDialogOpen(false)}
        itemIds={selectedIds}
        existingBaskets={existingBaskets}
        onDone={exitSelectMode}
      />

      <BasketEditDialog
        open={Boolean(managingBasket)}
        onClose={() => setManagingBasket(null)}
        basketName={managingBasket?.name ?? null}
      />

      <ShareShoppingDialog
        open={Boolean(shareState)}
        onClose={() => setShareState(null)}
        items={shareState?.items ?? []}
        title={shareState?.title}
        canShareToGroup={isPersonalMode}
        onShared={exitSelectMode}
      />

      <ShoppingCartSheet
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cartItems}
        onEditItem={(item) => {
          setCartOpen(false);
          setEditing(item);
        }}
      />

      {editing && (
        <EditShoppingItemDialog
          item={editing}
          open
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
};

interface PulseMetricProps {
  icon: LucideIcon;
  value: number | string;
  phoneValue?: number | string;
  label: string;
  phoneLabel?: string;
  tone: string;
}

const PulseMetric = ({
  icon: Icon,
  value,
  phoneValue,
  label,
  phoneLabel,
  tone,
}: PulseMetricProps) => (
  <div className="min-w-0 rounded-2xl border border-border/55 bg-[hsl(var(--surface-panel)/0.78)] p-3 shadow-sm backdrop-blur sm:p-4">
    <Icon className={cn("mb-3 h-4 w-4", tone)} />
    <p className={cn("font-display text-xl font-bold tabular-nums sm:text-2xl", tone)}>
      {phoneValue !== undefined ? (
        <>
          <span className="sm:hidden">{phoneValue}</span>
          <span className="hidden sm:inline">{value}</span>
        </>
      ) : (
        value
      )}
    </p>
    <p className="mt-0.5 truncate text-[0.68rem] font-medium text-muted-foreground sm:text-xs">
      {phoneLabel ? (
        <>
          <span className="sm:hidden">{phoneLabel}</span>
          <span className="hidden sm:inline">{label}</span>
        </>
      ) : (
        label
      )}
    </p>
  </div>
);

interface BasketCardProps {
  basket: BasketGroup;
  onEdit: (item: ShoppingItem) => void;
  activeGroupId: string | null;
  profileMap?: Map<string, string>;
  recipeNames: Map<string, string>;
  selectMode: boolean;
  selectedIds: string[];
  onToggleSelected: (id: string) => void;
  onShare: (items: ShoppingItem[], title: string) => void;
  onAddToCart: (items: ShoppingItem[], label: string) => void;
  onManage: () => void;
}

const BasketCard = ({
  basket,
  onEdit,
  activeGroupId,
  profileMap,
  recipeNames,
  selectMode,
  selectedIds,
  onToggleSelected,
  onShare,
  onAddToCart,
  onManage,
}: BasketCardProps) => (
  <section className="surface-panel min-w-0 overflow-hidden rounded-[2rem] p-4 sm:p-5">
    <header className="mb-4 flex flex-col gap-3 px-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
            basket.isUnsorted ? "bg-muted text-muted-foreground" : "bg-primary/12 text-primary"
          )}
        >
          <ShoppingBasket className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h2 className="truncate font-display text-lg font-bold text-foreground">{basket.label}</h2>
          <p className="text-xs text-muted-foreground">
            {basket.count} item{basket.count === 1 ? "" : "s"}
            {basket.isUnsorted ? " • not in a basket yet" : ""}
          </p>
        </div>
        <div className="ml-auto shrink-0 text-right sm:hidden">
          <p className="font-display text-base font-bold tabular-nums text-foreground">
            {formatCurrency(basket.total)}
          </p>
          <p className="text-[0.62rem] font-medium text-muted-foreground">
            {formatCurrency(basket.openTotal)} to buy
          </p>
        </div>
      </div>
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <div className="hidden text-right sm:block">
          <p className="font-display text-xl font-bold tabular-nums text-foreground">
            {formatCurrency(basket.total)}
          </p>
          <p className="text-[0.68rem] font-medium text-muted-foreground">
            {formatCurrency(basket.openTotal)} still to buy
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0 rounded-xl"
          aria-label={`Edit ${basket.label}`}
          onClick={onManage}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <AddShoppingItemDialog
          defaultBasket={basket.isUnsorted ? null : basket.key}
          triggerLabel="Add item"
          triggerClassName="min-h-10 min-w-0 flex-1 shrink rounded-xl px-3 text-xs sm:flex-none sm:px-3.5 sm:text-sm"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0 rounded-xl"
          aria-label={`Share ${basket.label}`}
          onClick={() =>
            onShare(
              basket.sections.flatMap((section) =>
                section.groups.flatMap((group) => group.items)
              ),
              basket.label
            )
          }
        >
          <Share2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          className="min-h-10 min-w-0 flex-1 shrink rounded-xl px-3 text-xs sm:flex-none sm:px-3.5 sm:text-sm"
          aria-label={`Add ${basket.label} to cart`}
          onClick={() =>
            onAddToCart(
              basket.sections.flatMap((section) =>
                section.groups.flatMap((group) => group.items)
              ),
              basket.label
            )
          }
        >
          <ShoppingCart className="mr-1.5 h-4 w-4 shrink-0" />
          <span className="truncate">
            <span className="sm:hidden">To cart</span>
            <span className="hidden sm:inline">Add to cart</span>
          </span>
        </Button>
      </div>
    </header>

    <div className="space-y-6">
      {basket.sections.map((section) => (
        <div key={section.id} className="space-y-3">
          <div className="flex items-center justify-between gap-3 px-1">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
              <section.icon className={cn("h-4 w-4", section.tone)} />
              {section.title}
              <span className="rounded-full bg-[hsl(var(--surface-subtle))] px-2 py-0.5 text-[0.65rem] tabular-nums text-muted-foreground">
                {section.count}
              </span>
            </span>
            <span className="text-sm font-semibold tabular-nums text-muted-foreground">
              {formatCurrency(section.total)}
            </span>
          </div>

          <div className="space-y-6">
            {section.groups.map((group) => (
              <div key={group.key} className="space-y-2">
                <div className="flex items-center gap-3 px-1">
                  <span className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {group.label}
                  </span>
                  <span className="h-px flex-1 bg-border/50" />
                  <span className="text-[0.7rem] font-semibold tabular-nums text-muted-foreground">
                    {group.items.length} • {formatCurrency(group.total)}
                  </span>
                </div>

                {group.items.map((item) => (
                  <div key={item.id} className="space-y-1">
                    {item.recipe_id && recipeNames.get(item.recipe_id) && (
                      <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[0.65rem] font-semibold text-success">
                        <ChefHat className="h-3 w-3" />
                        {recipeNames.get(item.recipe_id)}
                      </span>
                    )}
                    <div className="flex min-w-0 items-center gap-2">
                      {selectMode && (
                        <Checkbox
                          checked={selectedIds.includes(item.id)}
                          onCheckedChange={() => onToggleSelected(item.id)}
                          aria-label={`Select ${item.name}`}
                          className="ml-1 h-5 w-5 shrink-0"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <ShoppingItemRow
                          item={item}
                          onClick={() => onEdit(item)}
                          addedBy={activeGroupId ? profileMap?.get(item.user_id) : undefined}
                          completedBy={
                            activeGroupId && item.completed_by
                              ? profileMap?.get(item.completed_by)
                              : undefined
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </section>
);

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  copy: string;
}

const EmptyState = ({ icon: Icon = ShoppingCart, title, copy }: EmptyStateProps) => (
  <section className="surface-panel rounded-[2rem] px-6 py-12 text-center">
    <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
      <Icon className="h-6 w-6" />
    </span>
    <h2 className="mt-4 font-display text-xl font-bold text-foreground">{title}</h2>
    <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{copy}</p>
  </section>
);

const ShoppingListSkeleton = () => (
  <div className="grid animate-pulse gap-4 xl:grid-cols-2" aria-label="Loading shopping list">
    {[0, 1].map((section) => (
      <div key={section} className="surface-panel rounded-[2rem] p-5">
        <div className="mb-5 h-10 w-40 rounded-2xl bg-muted" />
        <div className="space-y-2">
          {[0, 1, 2].map((row) => (
            <div key={row} className="h-[76px] rounded-2xl bg-muted/70" />
          ))}
        </div>
      </div>
    ))}
  </div>
);

export default ShoppingList;
