import { useMemo, useState } from "react";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { useSearchParams } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  CheckCircle2,
  ChefHat,
  CircleDollarSign,
  ListChecks,
  Package,
  Search,
  ShoppingCart,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import AddShoppingItemDialog from "@/components/shopping/AddShoppingItemDialog";
import EditShoppingItemDialog from "@/components/shopping/EditShoppingItemDialog";
import ShoppingItemRow from "@/components/shopping/ShoppingItemRow";
import { Input } from "@/components/ui/input";
import { useGroupContext } from "@/contexts/GroupContext";
import { useGroups } from "@/hooks/useGroups";
import { useProfileNames } from "@/hooks/useProfileNames";
import { useIsPhone } from "@/hooks/use-shell-mode";
import { useShoppingList, type ShoppingItem } from "@/hooks/useShoppingList";
import { useRecipes } from "@/hooks/useRecipes";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";

type FilterTab = "all" | "open" | "completed";

interface DateGroup {
  key: string;
  label: string;
  items: ShoppingItem[];
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
      map.set(key, { key, label: dateLabel(item.created_at), items: [] });
    }
    map.get(key)!.items.push(item);
  }

  return [...map.values()].sort((a, b) => (a.key < b.key ? 1 : -1));
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
  const [searchParams] = useSearchParams();
  const { activeGroupId, isPersonalMode } = useGroupContext();
  const { groups } = useGroups();
  const isPhone = useIsPhone();

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
    const estimate = items
      .filter((item) => !item.is_purchased)
      .reduce(
        (sum, item) =>
          sum + Number(item.estimated_cost ?? 0) * Number(item.quantity ?? 1),
        0
      );

    return {
      all: items.length,
      open,
      purchased,
      estimate,
      progress: items.length ? Math.round((purchased / items.length) * 100) : 0,
    };
  }, [list]);

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return (list ?? []).filter((item) => {
      const matchesSearch =
        !normalizedSearch ||
        item.name.toLowerCase().includes(normalizedSearch) ||
        item.category?.toLowerCase().includes(normalizedSearch);

      if (!matchesSearch) return false;
      if (filterTab === "open") return !item.is_purchased;
      if (filterTab === "completed") return item.is_purchased;
      return true;
    });
  }, [filterTab, list, search]);

  const { regularGroups, recipeGroups, regularCount, recipeCount } = useMemo(() => {
    const regular = filtered.filter((item) => !item.recipe_id);
    const fromRecipes = filtered.filter((item) => Boolean(item.recipe_id));

    return {
      regularGroups: groupByDate(regular),
      recipeGroups: groupByDate(fromRecipes),
      regularCount: regular.length,
      recipeCount: fromRecipes.length,
    };
  }, [filtered]);

  const recipeNames = useMemo(() => {
    const map = new Map<string, string>();
    (recipes ?? []).forEach((recipe) => map.set(recipe.id, recipe.name));
    return map;
  }, [recipes]);

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
    <div className="mx-auto max-w-[1440px] space-y-4 md:space-y-6">
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

          <div className="relative min-w-0 flex-1 lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              inputMode="search"
              placeholder="Search name or category"
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
        <div className="space-y-6 md:space-y-8">
          {regularCount > 0 && (
            <ShoppingSection
              title="Regular shopping"
              description="Everyday items you added yourself"
              count={regularCount}
              icon={ShoppingCart}
              tone="text-primary"
              groups={regularGroups}
              onEdit={setEditing}
              activeGroupId={activeGroupId}
              profileMap={profileMap}
            />
          )}

          {recipeCount > 0 && (
            <ShoppingSection
              title="From My Cook Book"
              description="Ingredients pulled from your recipes"
              count={recipeCount}
              icon={ChefHat}
              tone="text-success"
              groups={recipeGroups}
              onEdit={setEditing}
              activeGroupId={activeGroupId}
              profileMap={profileMap}
              recipeNames={recipeNames}
            />
          )}
        </div>
      )}

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

interface ShoppingSectionProps {
  title: string;
  description: string;
  count: number;
  icon: LucideIcon;
  tone: string;
  groups: DateGroup[];
  onEdit: (item: ShoppingItem) => void;
  activeGroupId: string | null;
  profileMap?: Map<string, string>;
  recipeNames?: Map<string, string>;
}

const ShoppingSection = ({
  title,
  description,
  count,
  icon: Icon,
  tone,
  groups,
  onEdit,
  activeGroupId,
  profileMap,
  recipeNames,
}: ShoppingSectionProps) => (
  <section className="surface-panel min-w-0 rounded-[2rem] p-4 sm:p-5">
    <header className="mb-4 flex items-center justify-between gap-4 px-1">
      <div className="flex min-w-0 items-center gap-3">
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-current/10", tone)}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold text-foreground">{title}</h2>
          <p className="truncate text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <span className="rounded-full bg-[hsl(var(--surface-subtle))] px-2.5 py-1 text-xs font-semibold tabular-nums text-muted-foreground">
        {count}
      </span>
    </header>

    <div className="space-y-7">
      {groups.map((group) => (
        <div key={group.key} className="space-y-2">
          <div className="flex items-center gap-3 px-1">
            <span className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {group.label}
            </span>
            <span className="h-px flex-1 bg-border/50" />
            <span className="text-[0.7rem] font-semibold tabular-nums text-muted-foreground">
              {group.items.length}
            </span>
          </div>

          {group.items.map((item) => (
            <div key={item.id} className="space-y-1">
              {recipeNames && item.recipe_id && recipeNames.get(item.recipe_id) && (
                <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[0.65rem] font-semibold text-success">
                  <ChefHat className="h-3 w-3" />
                  {recipeNames.get(item.recipe_id)}
                </span>
              )}
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
          ))}
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
