import { differenceInCalendarDays, parseISO, startOfMonth, startOfYear } from "date-fns";

/**
 * Kitchen Story — the maths behind the recap screen.
 *
 * Every figure here is derived from data a real user action writes. Where the
 * schema cannot support a statistic honestly, the field is `null` rather than
 * estimated: there is no cost on `waste_logs` and no cook log, so "money saved",
 * "waste avoided" and "recipes cooked" are deliberately absent.
 *
 * Inputs are structural (not Supabase row types) so this module stays pure and
 * unit-testable, and `now` is injected so results are deterministic in tests.
 */

export type StoryRange = "month" | "year" | "all";

/** Below this many list entries, follow-through is too noisy to report. */
export const LIST_FOLLOW_THROUGH_MIN_ITEMS = 5;

/** Categories the app assigns automatically — never a user's "favourite". */
export const AUTO_CATEGORIES = ["Imported", "AI estimate"];

/** A personality needs at least this much history behind it. */
export const PERSONALITY_MIN_FOODS = 10;

/* ── inputs ─────────────────────────────────────────── */

export interface StoryItemRef {
  name: string;
  category: string | null;
}

export interface StoryInventoryRow {
  item_id: string;
  expiry_date: string | null;
  storage_location: string | null;
  items?: StoryItemRef | null;
}

export interface StoryPurchaseLine {
  item_id: string;
  quantity: number;
  items?: StoryItemRef | null;
}

export interface StoryPurchaseRow {
  purchased_at: string;
  total_cost: number | null;
  store_name: string | null;
  purchase_items: StoryPurchaseLine[];
}

export interface StoryConsumptionRow {
  consumed_at: string;
}

export interface StoryWasteRow {
  item_id: string;
  discarded_at: string;
}

export interface StoryShoppingRow {
  created_at: string;
  is_purchased: boolean;
  completed_at: string | null;
}

export interface StoryRecipeRow {
  created_at: string;
  tags: string[] | null;
  ingredientItemIds: string[];
}

export interface StoryInput {
  now: Date;
  memberSince: string | null;
  /** Active pantry rows. Always "right now" — never filtered by range. */
  inventory: StoryInventoryRow[];
  purchases: StoryPurchaseRow[];
  consumption: StoryConsumptionRow[];
  waste: StoryWasteRow[];
  shopping: StoryShoppingRow[];
  recipes: StoryRecipeRow[];
}

/* ── output ─────────────────────────────────────────── */

export interface Tally {
  label: string;
  count: number;
}

export interface KitchenStory {
  range: StoryRange;
  rangeLabel: string;
  hasData: boolean;
  memberSince: string | null;
  firstActivity: string | null;

  pantry: {
    total: number;
    fresh: number;
    useSoon: number;
    expired: number;
    noDate: number;
    /** Share of the pantry that is not expired, 0–100. */
    goodShare: number | null;
  };

  foodsManaged: number;
  topStorage: Tally | null;
  topCategory: Tally | null;

  rescue: {
    foodsBought: number;
    foodsNeverWasted: number;
    neverWastedShare: number | null;
    longestNoWasteRun: number | null;
    daysSinceLastDiscard: number | null;
    discardCount: number;
  };

  shopping: {
    trips: number;
    spent: number;
    avgPerTrip: number | null;
    mostBought: Tally | null;
    topStore: Tally | null;
    listItems: number;
    /** Share of list entries ticked off, 0–100. Null below the minimum. */
    listFollowThrough: number | null;
    /** Mean days between adding a list entry and ticking it. */
    avgDaysOnList: number | null;
  };

  cookbook: {
    recipes: number;
    ingredients: number;
    topTag: Tally | null;
  };

  habits: {
    logs: number;
    daysLogged: number;
    longestLoggingRun: number;
  };

  personality: {
    key: string;
    title: string;
    blurb: string;
  } | null;
}

/* ── helpers ────────────────────────────────────────── */

const safeDate = (iso: string | null | undefined): Date | null => {
  if (!iso) return null;
  const d = parseISO(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Local-time day bucket, so "days you logged" matches the user's calendar. */
const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const rangeStart = (range: StoryRange, now: Date): Date | null => {
  if (range === "month") return startOfMonth(now);
  if (range === "year") return startOfYear(now);
  return null;
};

export const rangeLabelFor = (range: StoryRange): string =>
  range === "month" ? "This month" : range === "year" ? "This year" : "All time";

const withinRange = (iso: string | null | undefined, start: Date | null): boolean => {
  const d = safeDate(iso);
  if (!d) return false;
  return start === null || d.getTime() >= start.getTime();
};

/** Highest count wins; ties break alphabetically so output is deterministic. */
const topOf = (counts: Map<string, number>): Tally | null => {
  let best: Tally | null = null;
  for (const [label, count] of counts) {
    if (!best || count > best.count || (count === best.count && label < best.label)) {
      best = { label, count };
    }
  }
  return best;
};

const bump = (counts: Map<string, number>, key: string, by = 1) => {
  counts.set(key, (counts.get(key) ?? 0) + by);
};

/** Longest run of consecutive calendar days present in the set. */
export const longestConsecutiveRun = (dayKeys: Set<string>): number => {
  if (dayKeys.size === 0) return 0;
  const days = [...dayKeys].sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < days.length; i += 1) {
    const gap = differenceInCalendarDays(parseISO(days[i]), parseISO(days[i - 1]));
    run = gap === 1 ? run + 1 : 1;
    if (run > best) best = run;
  }
  return best;
};

/* ── the build ──────────────────────────────────────── */

export function buildKitchenStory(input: StoryInput, range: StoryRange): KitchenStory {
  const { now } = input;
  const start = rangeStart(range, now);

  const purchases = input.purchases.filter((p) => withinRange(p.purchased_at, start));
  const consumption = input.consumption.filter((c) => withinRange(c.consumed_at, start));
  const waste = input.waste.filter((w) => withinRange(w.discarded_at, start));
  const shopping = input.shopping.filter((s) => withinRange(s.created_at, start));
  const recipes = input.recipes.filter((r) => withinRange(r.created_at, start));
  const lines = purchases.flatMap((p) => p.purchase_items ?? []);

  /* pantry — a snapshot, always current */
  let fresh = 0;
  let useSoon = 0;
  let expired = 0;
  let noDate = 0;
  for (const row of input.inventory) {
    const due = safeDate(row.expiry_date);
    if (!due) {
      noDate += 1;
      continue;
    }
    const days = differenceInCalendarDays(due, now);
    if (days < 0) expired += 1;
    else if (days <= 3) useSoon += 1;
    else fresh += 1;
  }
  const pantryTotal = input.inventory.length;

  /* foods managed — distinct across the pantry and the range's purchases */
  const managedIds = new Set<string>();
  input.inventory.forEach((r) => managedIds.add(r.item_id));
  lines.forEach((l) => managedIds.add(l.item_id));

  /* storage + category */
  const storageCounts = new Map<string, number>();
  for (const row of input.inventory) {
    const where = row.storage_location?.trim();
    if (where) bump(storageCounts, where);
  }

  const categoryCounts = new Map<string, number>();
  for (const line of lines) {
    const category = line.items?.category?.trim();
    if (!category || AUTO_CATEGORIES.includes(category)) continue;
    bump(categoryCounts, category, line.quantity || 0);
  }

  /* rescue */
  const boughtIds = new Set(lines.map((l) => l.item_id));
  const wastedIds = new Set(waste.map((w) => w.item_id));
  let neverWasted = 0;
  boughtIds.forEach((id) => {
    if (!wastedIds.has(id)) neverWasted += 1;
  });

  const firstActivityDate = [
    ...input.purchases.map((p) => safeDate(p.purchased_at)),
    ...input.consumption.map((c) => safeDate(c.consumed_at)),
    safeDate(input.memberSince),
  ]
    .filter((d): d is Date => d !== null)
    .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;

  const spanStart = start ?? firstActivityDate;
  const discardDates = waste
    .map((w) => safeDate(w.discarded_at))
    .filter((d): d is Date => d !== null)
    .sort((a, b) => a.getTime() - b.getTime());

  let longestNoWasteRun: number | null = null;
  if (spanStart && spanStart.getTime() <= now.getTime()) {
    let cursor = spanStart;
    let best = 0;
    for (const d of discardDates) {
      best = Math.max(best, differenceInCalendarDays(d, cursor));
      cursor = d;
    }
    longestNoWasteRun = Math.max(best, differenceInCalendarDays(now, cursor));
  }

  const lastDiscard = discardDates[discardDates.length - 1] ?? null;

  /* shopping */
  const spent = purchases.reduce((sum, p) => sum + (p.total_cost ?? 0), 0);

  // Counted by how many trips an item shows up on, never by summed quantity:
  // quantities mix units, so 1600 g of rice would outrank a dozen eggs.
  const tripsPerItem = new Map<string, number>();
  for (const p of purchases) {
    const namesOnTrip = new Set<string>();
    for (const l of p.purchase_items ?? []) {
      const name = l.items?.name?.trim();
      if (name) namesOnTrip.add(name);
    }
    namesOnTrip.forEach((name) => bump(tripsPerItem, name));
  }

  const storeCounts = new Map<string, number>();
  const storeDisplay = new Map<string, string>();
  for (const p of purchases) {
    const raw = p.store_name?.trim();
    if (!raw) continue;
    const key = raw.toLowerCase();
    bump(storeCounts, key);
    if (!storeDisplay.has(key)) storeDisplay.set(key, raw);
  }
  const topStoreKey = topOf(storeCounts);
  const topStore = topStoreKey
    ? { label: storeDisplay.get(topStoreKey.label) ?? topStoreKey.label, count: topStoreKey.count }
    : null;

  const ticked = shopping.filter((s) => s.is_purchased).length;
  const listFollowThrough =
    shopping.length >= LIST_FOLLOW_THROUGH_MIN_ITEMS
      ? Math.round((ticked / shopping.length) * 100)
      : null;

  const waits = shopping
    .map((s) => {
      const from = safeDate(s.created_at);
      const to = safeDate(s.completed_at);
      return from && to ? (to.getTime() - from.getTime()) / 86_400_000 : null;
    })
    .filter((d): d is number => d !== null && d >= 0);
  const avgDaysOnList = waits.length
    ? Math.round((waits.reduce((a, b) => a + b, 0) / waits.length) * 10) / 10
    : null;

  /* cookbook */
  const tagCounts = new Map<string, number>();
  const ingredientIds = new Set<string>();
  for (const r of recipes) {
    (r.tags ?? []).forEach((tag) => {
      const clean = tag.trim();
      if (clean) bump(tagCounts, clean);
    });
    r.ingredientItemIds.forEach((id) => ingredientIds.add(id));
  }

  /* habits */
  const loggedDays = new Set<string>();
  for (const log of consumption) {
    const d = safeDate(log.consumed_at);
    if (d) loggedDays.add(dayKey(d));
  }

  const hasData =
    pantryTotal > 0 ||
    purchases.length > 0 ||
    consumption.length > 0 ||
    waste.length > 0 ||
    recipes.length > 0 ||
    shopping.length > 0;

  const story: KitchenStory = {
    range,
    rangeLabel: rangeLabelFor(range),
    hasData,
    memberSince: input.memberSince,
    firstActivity: firstActivityDate ? firstActivityDate.toISOString() : null,

    pantry: {
      total: pantryTotal,
      fresh,
      useSoon,
      expired,
      noDate,
      goodShare: pantryTotal > 0 ? Math.round(((pantryTotal - expired) / pantryTotal) * 100) : null,
    },

    foodsManaged: managedIds.size,
    topStorage: topOf(storageCounts),
    topCategory: topOf(categoryCounts),

    rescue: {
      foodsBought: boughtIds.size,
      foodsNeverWasted: neverWasted,
      neverWastedShare: boughtIds.size > 0 ? Math.round((neverWasted / boughtIds.size) * 100) : null,
      longestNoWasteRun,
      daysSinceLastDiscard: lastDiscard ? differenceInCalendarDays(now, lastDiscard) : null,
      discardCount: waste.length,
    },

    shopping: {
      trips: purchases.length,
      spent,
      avgPerTrip: purchases.length > 0 && spent > 0 ? spent / purchases.length : null,
      mostBought: topOf(tripsPerItem),
      topStore,
      listItems: shopping.length,
      listFollowThrough,
      avgDaysOnList,
    },

    cookbook: {
      recipes: recipes.length,
      ingredients: ingredientIds.size,
      topTag: topOf(tagCounts),
    },

    habits: {
      logs: consumption.length,
      daysLogged: loggedDays.size,
      longestLoggingRun: longestConsecutiveRun(loggedDays),
    },

    personality: null,
  };

  story.personality = derivePersonality(story);
  return story;
}

/**
 * A short, shareable summary.
 *
 * Deliberately excludes everything that is nobody else's business: no names, no
 * spend, no store, no nutrition, no household detail. Only counts the user has
 * a reason to be pleased about, and only ones that are actually populated.
 */
export function buildShareText(story: KitchenStory): string {
  const parts: string[] = [];
  const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

  if (story.rescue.foodsNeverWasted > 0 && story.rescue.foodsBought > 0) {
    parts.push(
      `${story.rescue.foodsNeverWasted} of ${story.rescue.foodsBought} foods never thrown away`,
    );
  }
  if (story.rescue.longestNoWasteRun && story.rescue.longestNoWasteRun > 1) {
    parts.push(`${story.rescue.longestNoWasteRun} days without wasting a thing`);
  }
  if (story.cookbook.recipes > 0) {
    parts.push(`${count(story.cookbook.recipes, "recipe", "recipes")} saved`);
  }
  if (story.habits.daysLogged > 0) {
    parts.push(`${count(story.habits.daysLogged, "day", "days")} tracked`);
  }
  if (story.shopping.trips > 0) {
    parts.push(`${count(story.shopping.trips, "shopping trip", "shopping trips")} logged`);
  }

  const highlights = parts.slice(0, 3);
  const opener = `My kitchen story (${story.rangeLabel.toLowerCase()})`;

  if (highlights.length === 0) {
    return `${opener}: just getting started. — Shelf Control`;
  }

  const tail = story.personality ? ` — ${story.personality.title}, via Shelf Control` : " — Shelf Control";
  return `${opener}: ${highlights.join(", ")}.${tail}`;
}

/**
 * Ordered rules — the first match wins, so the most distinctive trait leads.
 * Thresholds are surfaced verbatim in the "How these are worked out" sheet.
 */
export function derivePersonality(story: KitchenStory): KitchenStory["personality"] {
  if (!story.hasData) return null;

  if (story.rescue.discardCount === 0 && story.rescue.foodsBought >= PERSONALITY_MIN_FOODS) {
    return {
      key: "zero-waster",
      title: "The Zero-Waster",
      blurb: "Nothing has been thrown away on your watch. That is rare, and it is hard.",
    };
  }
  if (story.shopping.listFollowThrough !== null && story.shopping.listFollowThrough >= 70) {
    return {
      key: "planner",
      title: "The Planner",
      blurb: "You write it down and you come back for it. Most lists never get that far.",
    };
  }
  if (story.cookbook.recipes >= 8) {
    return {
      key: "collector",
      title: "The Recipe Collector",
      blurb: "Your cookbook keeps growing. Future you is going to be well fed.",
    };
  }
  if (story.shopping.trips >= 8) {
    return {
      key: "regular",
      title: "The Regular",
      blurb: "A steady rhythm of trips. Your shelves rarely catch you out.",
    };
  }
  if (story.pantry.total >= 60) {
    return {
      key: "well-stocked",
      title: "The Well-Stocked",
      blurb: "A deep pantry, and you know what is in it. Ready for anything.",
    };
  }
  if (story.habits.daysLogged >= 15) {
    return {
      key: "tracker",
      title: "The Tracker",
      blurb: "You keep the record honest, day after day. That is the whole game.",
    };
  }
  return {
    key: "steady",
    title: "The Steady Hand",
    blurb: "Quietly keeping the kitchen in order, one small decision at a time.",
  };
}
