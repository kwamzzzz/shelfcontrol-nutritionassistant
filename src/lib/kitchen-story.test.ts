import { describe, expect, it } from "vitest";
import {
  buildKitchenStory,
  buildShareText,
  longestConsecutiveRun,
  rangeLabelFor,
  type StoryInput,
  type StoryRange,
} from "./kitchen-story";

/** Local noon, so calendar-day maths is stable regardless of the runner's zone. */
const at = (y: number, m: number, d: number, h = 12) =>
  new Date(y, m - 1, d, h, 0, 0).toISOString();

/** A `date` column value (no time component), as Postgres returns it. */
const on = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

const NOW = new Date(2026, 6, 25, 12, 0, 0); // 25 Jul 2026, local noon

const input = (overrides: Partial<StoryInput> = {}): StoryInput => ({
  now: NOW,
  memberSince: null,
  inventory: [],
  purchases: [],
  consumption: [],
  waste: [],
  shopping: [],
  recipes: [],
  ...overrides,
});

const line = (item_id: string, quantity: number, name?: string, category?: string | null) => ({
  item_id,
  quantity,
  items: name ? { name, category: category ?? null } : null,
});

const trip = (
  purchased_at: string,
  opts: {
    total_cost?: number | null;
    store_name?: string | null;
    purchase_items?: ReturnType<typeof line>[];
  } = {},
) => ({
  purchased_at,
  total_cost: opts.total_cost ?? 0,
  store_name: opts.store_name ?? null,
  purchase_items: opts.purchase_items ?? [],
});

const build = (overrides: Partial<StoryInput> = {}, range: StoryRange = "all") =>
  buildKitchenStory(input(overrides), range);

describe("range filtering", () => {
  const purchases = [
    trip(at(2026, 7, 20)), // this month
    trip(at(2026, 3, 2)), //  this year
    trip(at(2025, 11, 4)), // last year
  ];

  it("counts only the current month for 'month'", () => {
    expect(build({ purchases }, "month").shopping.trips).toBe(1);
  });

  it("counts only the current year for 'year'", () => {
    expect(build({ purchases }, "year").shopping.trips).toBe(2);
  });

  it("counts everything for 'all'", () => {
    expect(build({ purchases }, "all").shopping.trips).toBe(3);
  });

  it("includes an entry made at the very start of the month", () => {
    const first = trip(new Date(2026, 6, 1, 0, 0, 0).toISOString());
    expect(build({ purchases: [first] }, "month").shopping.trips).toBe(1);
  });

  it("labels each range", () => {
    expect(rangeLabelFor("month")).toBe("This month");
    expect(rangeLabelFor("year")).toBe("This year");
    expect(rangeLabelFor("all")).toBe("All time");
  });
});

describe("pantry snapshot", () => {
  const inventory = [
    { item_id: "a", expiry_date: on(2026, 7, 24), storage_location: "Fridge", items: null }, // -1 expired
    { item_id: "b", expiry_date: on(2026, 7, 25), storage_location: "Fridge", items: null }, //  0 use soon
    { item_id: "c", expiry_date: on(2026, 7, 28), storage_location: "Pantry", items: null }, //  3 use soon
    { item_id: "d", expiry_date: on(2026, 7, 29), storage_location: "Pantry", items: null }, //  4 fresh
    { item_id: "e", expiry_date: null, storage_location: null, items: null }, //                  no date
  ];

  it("buckets on the same thresholds the pantry uses", () => {
    const { pantry } = build({ inventory });
    expect(pantry).toMatchObject({ total: 5, expired: 1, useSoon: 2, fresh: 1, noDate: 1 });
  });

  it("reports the share that is not expired", () => {
    expect(build({ inventory }).pantry.goodShare).toBe(80);
  });

  it("ignores the range — the pantry is always current", () => {
    expect(build({ inventory }, "month").pantry.total).toBe(5);
  });

  it("returns a null share for an empty pantry", () => {
    expect(build().pantry.goodShare).toBeNull();
  });

  it("picks the most-used storage location", () => {
    expect(build({ inventory }).topStorage).toEqual({ label: "Fridge", count: 2 });
  });
});

describe("foods managed", () => {
  it("counts distinct items across the pantry and the range's purchases", () => {
    const story = build({
      inventory: [{ item_id: "a", expiry_date: null, storage_location: null, items: null }],
      purchases: [trip(at(2026, 7, 1), { purchase_items: [line("a", 1), line("b", 1)] })],
    });
    expect(story.foodsManaged).toBe(2);
  });
});

describe("favourite category", () => {
  it("ranks by quantity and skips auto-assigned categories", () => {
    const story = build({
      purchases: [
        trip(at(2026, 7, 1), {
          purchase_items: [
            line("a", 2, "Rice", "Grains & Bread"),
            line("b", 9, "Mystery", "Imported"),
            line("c", 8, "Robot food", "AI estimate"),
            line("d", 3, "Milk", "Dairy"),
            line("e", 1, "Cheese", "Dairy"),
          ],
        }),
      ],
    });
    expect(story.topCategory).toEqual({ label: "Dairy", count: 4 });
  });

  it("is null when nothing has a usable category", () => {
    const story = build({
      purchases: [trip(at(2026, 7, 1), { purchase_items: [line("a", 1, "Rice", null)] })],
    });
    expect(story.topCategory).toBeNull();
  });
});

describe("food rescue", () => {
  it("counts bought foods that were never discarded", () => {
    const story = build({
      purchases: [
        trip(at(2026, 5, 1), {
          purchase_items: [line("a", 1), line("b", 1), line("c", 1)],
        }),
      ],
      waste: [{ item_id: "b", discarded_at: at(2026, 6, 1) }],
    });
    expect(story.rescue).toMatchObject({
      foodsBought: 3,
      foodsNeverWasted: 2,
      neverWastedShare: 67,
      discardCount: 1,
    });
  });

  it("spans the whole history when nothing was ever discarded", () => {
    const story = build({ memberSince: at(2026, 1, 1) });
    expect(story.rescue.longestNoWasteRun).toBe(205);
    expect(story.rescue.daysSinceLastDiscard).toBeNull();
  });

  it("measures the gap after the last discard when that is longest", () => {
    const story = build({
      memberSince: at(2026, 1, 1),
      waste: [{ item_id: "a", discarded_at: at(2026, 3, 1) }],
    });
    expect(story.rescue.longestNoWasteRun).toBe(146);
    expect(story.rescue.daysSinceLastDiscard).toBe(146);
  });

  it("measures a gap between two discards", () => {
    const story = build({
      memberSince: at(2026, 1, 1),
      waste: [
        { item_id: "a", discarded_at: at(2026, 3, 1) },
        { item_id: "b", discarded_at: at(2026, 7, 20) },
      ],
    });
    // Jan 1 → Mar 1 is 59, Mar 1 → Jul 20 is 141, Jul 20 → now is 5.
    expect(story.rescue.longestNoWasteRun).toBe(141);
    expect(story.rescue.daysSinceLastDiscard).toBe(5);
  });

  it("starts the run at the range boundary, not at signup", () => {
    const story = build({ memberSince: at(2020, 1, 1) }, "month");
    expect(story.rescue.longestNoWasteRun).toBe(24); // 1 Jul → 25 Jul
  });

  it("has no run to report with no history at all", () => {
    expect(build().rescue.longestNoWasteRun).toBeNull();
    expect(build().rescue.neverWastedShare).toBeNull();
  });

  it("splits eaten vs thrown out by event count", () => {
    const story = build({
      consumption: [
        { consumed_at: at(2026, 7, 1) },
        { consumed_at: at(2026, 7, 2) },
        { consumed_at: at(2026, 7, 3) },
      ],
      waste: [{ item_id: "a", discarded_at: at(2026, 7, 4) }],
    });
    expect(story.rescue.eatenCount).toBe(3);
    expect(story.rescue.thrownOutCount).toBe(1);
    expect(story.rescue.eatenShare).toBe(75);
  });

  it("has no eaten share when nothing has left the kitchen", () => {
    expect(build().rescue.eatenShare).toBeNull();
  });

  it("respects the range when splitting eaten vs thrown out", () => {
    const story = build(
      {
        consumption: [{ consumed_at: at(2026, 7, 10) }, { consumed_at: at(2026, 3, 1) }],
        waste: [{ item_id: "a", discarded_at: at(2026, 7, 12) }],
      },
      "month",
    );
    expect(story.rescue.eatenCount).toBe(1);
    expect(story.rescue.thrownOutCount).toBe(1);
    expect(story.rescue.eatenShare).toBe(50);
  });
});

describe("shopping", () => {
  it("sums spend and averages per trip", () => {
    const story = build({
      purchases: [
        trip(at(2026, 7, 1), { total_cost: 120 }),
        trip(at(2026, 7, 8), { total_cost: 80 }),
      ],
    });
    expect(story.shopping.spent).toBe(200);
    expect(story.shopping.avgPerTrip).toBe(100);
  });

  it("reports no average when no prices were entered", () => {
    const story = build({ purchases: [trip(at(2026, 7, 1), { total_cost: 0 })] });
    expect(story.shopping.spent).toBe(0);
    expect(story.shopping.avgPerTrip).toBeNull();
  });

  it("ranks the most-bought item by trips, so mixed units cannot skew it", () => {
    const story = build({
      purchases: [
        // 1600 g of rice must not outrank eggs bought on three separate trips.
        trip(at(2026, 7, 1), {
          purchase_items: [line("a", 1600, "Rice"), line("b", 2, "Eggs")],
        }),
        trip(at(2026, 7, 8), { purchase_items: [line("b", 2, "Eggs")] }),
        trip(at(2026, 7, 9), { purchase_items: [line("b", 2, "Eggs")] }),
      ],
    });
    expect(story.shopping.mostBought).toEqual({ label: "Eggs", count: 3 });
  });

  it("counts an item once per trip even when it spans several receipt lines", () => {
    const story = build({
      purchases: [
        trip(at(2026, 7, 1), {
          purchase_items: [line("a", 1, "Milk"), line("a", 1, "Milk"), line("a", 1, "Milk")],
        }),
      ],
    });
    expect(story.shopping.mostBought).toEqual({ label: "Milk", count: 1 });
  });

  it("groups a store case-insensitively but shows it as first written", () => {
    const story = build({
      purchases: [
        trip(at(2026, 7, 1), { store_name: "Carrefour" }),
        trip(at(2026, 7, 8), { store_name: "carrefour" }),
        trip(at(2026, 7, 9), { store_name: "  CARREFOUR " }),
        trip(at(2026, 7, 10), { store_name: "Spinneys" }),
      ],
    });
    expect(story.shopping.topStore).toEqual({ label: "Carrefour", count: 3 });
  });

  it("ignores blank store names", () => {
    const story = build({
      purchases: [trip(at(2026, 7, 1), { store_name: "   " }), trip(at(2026, 7, 2))],
    });
    expect(story.shopping.topStore).toBeNull();
  });

  it("reports list follow-through once there are enough entries", () => {
    const shopping = Array.from({ length: 5 }, (_, i) => ({
      created_at: at(2026, 7, 1),
      is_purchased: i < 4,
      completed_at: i < 4 ? at(2026, 7, 3) : null,
    }));
    const story = build({ shopping });
    expect(story.shopping.listFollowThrough).toBe(80);
    expect(story.shopping.avgDaysOnList).toBe(2);
  });

  it("withholds follow-through below the minimum sample", () => {
    const shopping = Array.from({ length: 4 }, () => ({
      created_at: at(2026, 7, 1),
      is_purchased: true,
      completed_at: at(2026, 7, 2),
    }));
    expect(build({ shopping }).shopping.listFollowThrough).toBeNull();
  });

  it("ignores entries that were never ticked when averaging the wait", () => {
    const story = build({
      shopping: [
        { created_at: at(2026, 7, 1), is_purchased: true, completed_at: at(2026, 7, 2) },
        { created_at: at(2026, 7, 1), is_purchased: false, completed_at: null },
      ],
    });
    expect(story.shopping.avgDaysOnList).toBe(1);
  });
});

describe("cookbook", () => {
  it("counts recipes, distinct ingredients and the leading tag", () => {
    const story = build({
      recipes: [
        { created_at: at(2026, 5, 1), tags: ["Quick", "Vegan"], ingredientItemIds: ["a", "b"] },
        { created_at: at(2026, 6, 1), tags: ["Quick"], ingredientItemIds: ["b", "c"] },
      ],
    });
    expect(story.cookbook).toEqual({
      recipes: 2,
      ingredients: 3,
      topTag: { label: "Quick", count: 2 },
    });
  });

  it("has no leading tag when nothing is tagged", () => {
    const story = build({
      recipes: [{ created_at: at(2026, 5, 1), tags: null, ingredientItemIds: [] }],
    });
    expect(story.cookbook.topTag).toBeNull();
  });
});

describe("habits", () => {
  it("counts distinct days, not individual logs", () => {
    const story = build({
      consumption: [
        { consumed_at: at(2026, 7, 1, 8) },
        { consumed_at: at(2026, 7, 1, 13) },
        { consumed_at: at(2026, 7, 2, 9) },
      ],
    });
    expect(story.habits).toEqual({ logs: 3, daysLogged: 2, longestLoggingRun: 2 });
  });

  it("finds the longest consecutive run", () => {
    expect(longestConsecutiveRun(new Set(["2026-07-01", "2026-07-02", "2026-07-03"]))).toBe(3);
    expect(longestConsecutiveRun(new Set(["2026-07-01", "2026-07-03", "2026-07-04"]))).toBe(2);
    expect(longestConsecutiveRun(new Set(["2026-07-01"]))).toBe(1);
    expect(longestConsecutiveRun(new Set())).toBe(0);
  });

  it("spans a month boundary", () => {
    expect(longestConsecutiveRun(new Set(["2026-06-30", "2026-07-01"]))).toBe(2);
  });
});

describe("personality", () => {
  const bought = (n: number) =>
    [trip(at(2026, 4, 1), { purchase_items: Array.from({ length: n }, (_, i) => line(`i${i}`, 1)) })];

  it("leads with zero waste when nothing was discarded", () => {
    const story = build({ purchases: bought(10) });
    expect(story.personality?.key).toBe("zero-waster");
  });

  it("needs enough history before claiming zero waste", () => {
    const story = build({ purchases: bought(3) });
    expect(story.personality?.key).not.toBe("zero-waster");
  });

  it("falls through to the planner when the list gets followed", () => {
    const story = build({
      purchases: bought(10),
      waste: [{ item_id: "i0", discarded_at: at(2026, 5, 1) }],
      shopping: Array.from({ length: 10 }, (_, i) => ({
        created_at: at(2026, 6, 1),
        is_purchased: i < 8,
        completed_at: i < 8 ? at(2026, 6, 2) : null,
      })),
    });
    expect(story.personality?.key).toBe("planner");
  });

  it("falls back to a steady hand when nothing stands out", () => {
    const story = build({
      purchases: bought(2),
      waste: [{ item_id: "i0", discarded_at: at(2026, 5, 1) }],
    });
    expect(story.personality?.key).toBe("steady");
  });

  it("has no personality without any data", () => {
    expect(build().personality).toBeNull();
    expect(build().hasData).toBe(false);
  });
});

describe("share text", () => {
  const rich = () =>
    build({
      memberSince: at(2026, 1, 1),
      purchases: [
        trip(at(2026, 4, 1), {
          total_cost: 940,
          store_name: "Carrefour",
          purchase_items: Array.from({ length: 10 }, (_, i) => line(`i${i}`, 1, `Food ${i}`)),
        }),
      ],
      consumption: [{ consumed_at: at(2026, 5, 1) }],
      recipes: [{ created_at: at(2026, 5, 2), tags: ["Quick"], ingredientItemIds: ["a"] }],
    });

  it("leads with the positive rescue figures", () => {
    expect(buildShareText(rich())).toContain("10 of 10 foods never thrown away");
  });

  it("names the personality and the product", () => {
    const text = buildShareText(rich());
    expect(text).toContain("The Zero-Waster");
    expect(text).toContain("Shelf Control");
  });

  it("never leaks spend, store or the user's name", () => {
    const text = buildShareText(rich());
    expect(text).not.toContain("940");
    expect(text).not.toContain("Carrefour");
    expect(text).not.toMatch(/AED/i);
  });

  it("keeps to three highlights, dropping the rest", () => {
    // Five highlights qualify; only the first three should survive.
    const text = buildShareText(rich());
    expect(text).toContain("foods never thrown away");
    expect(text).not.toContain("tracked");
    expect(text).not.toContain("shopping trip");
  });

  it("counts in the singular where it should", () => {
    expect(buildShareText(rich())).toContain("1 recipe saved");
  });

  it("stays friendly when there is nothing to report", () => {
    expect(buildShareText(build())).toContain("just getting started");
  });

  it("names the range it covers", () => {
    expect(buildShareText(build({}, "month"))).toContain("this month");
  });
});

describe("resilience", () => {
  it("survives unparseable timestamps instead of throwing", () => {
    const story = build({
      purchases: [trip("not-a-date", { total_cost: 50 })],
      consumption: [{ consumed_at: "" }],
      waste: [{ item_id: "a", discarded_at: "nonsense" }],
    });
    expect(story.shopping.trips).toBe(0);
    expect(story.habits.daysLogged).toBe(0);
    expect(story.rescue.discardCount).toBe(0);
  });

  it("treats a missing purchase_items array as empty", () => {
    const story = build({
      purchases: [
        { purchased_at: at(2026, 7, 1), total_cost: 10, store_name: null, purchase_items: undefined as never },
      ],
    });
    expect(story.shopping.mostBought).toBeNull();
    expect(story.shopping.trips).toBe(1);
  });

  it("breaks ties alphabetically so the story is stable between renders", () => {
    const story = build({
      purchases: [
        trip(at(2026, 7, 1), { purchase_items: [line("a", 2, "Zucchini"), line("b", 2, "Apples")] }),
      ],
    });
    expect(story.shopping.mostBought).toEqual({ label: "Apples", count: 1 });
  });
});
