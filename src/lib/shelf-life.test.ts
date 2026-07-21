import { describe, it, expect } from "vitest";
import {
  classifyFood, estimateShelfLifeDays, recommendStorage, estimateExpiryDate,
} from "./shelf-life";

describe("classifyFood", () => {
  it("classifies by name keyword", () => {
    expect(classifyFood("Chicken breast").type).toBe("poultry");
    expect(classifyFood("Beef chops").type).toBe("raw_meat");
    expect(classifyFood("Salmon fillet").type).toBe("fish_seafood");
    expect(classifyFood("Fresh Spinach").type).toBe("leafy_greens");
    expect(classifyFood("Basmati Rice").type).toBe("rice_grains");
    expect(classifyFood("Cheddar Cheese").type).toBe("cheese");
    expect(classifyFood("Strawberries").type).toBe("berries");
    expect(classifyFood("Potato").type).toBe("root_vegetables");
    expect(classifyFood("Tomato").type).toBe("vegetables");
  });

  it("treats an explicitly frozen product as frozen", () => {
    expect(classifyFood("Frozen peas").type).toBe("frozen");
  });

  it("matches plurals but not substring collisions", () => {
    expect(classifyFood("Tomatoes").type).toBe("vegetables");
    expect(classifyFood("Cherries").type).toBe("berries");
    // collisions that must NOT mis-match short keywords:
    expect(classifyFood("Candy").type).not.toBe("canned");
    expect(classifyFood("Popcorn").type).toBe("snacks");
    expect(classifyFood("Peanuts").type).toBe("dry_goods");
    expect(classifyFood("Butternut squash").type).toBe("root_vegetables");
    expect(classifyFood("Graham crackers").type).toBe("snacks");
    expect(classifyFood("Fruit cocktail can").type).not.toBe("raw_meat");
  });

  it("falls back to the catalog category when the name has no keyword", () => {
    const c = classifyFood("Acme thing", "Dairy");
    expect(c.type).toBe("milk");
    expect(c.matchedBy).toBe("category");
  });

  it("returns 'other' with matchedBy none when nothing matches", () => {
    const c = classifyFood("Zorblax", null);
    expect(c.type).toBe("other");
    expect(c.matchedBy).toBe("none");
  });
});

describe("estimateShelfLifeDays", () => {
  it("gives raw meat a short fridge life and a long freezer life", () => {
    expect(estimateShelfLifeDays("raw_meat", "Counter")).toBe(0);
    expect(estimateShelfLifeDays("raw_meat", "Fridge")).toBe(2);
    expect(estimateShelfLifeDays("raw_meat", "Freezer")).toBe(180);
  });

  it("drops an opened can to a short fridge life (not ~9 months)", () => {
    expect(estimateShelfLifeDays("canned", "Pantry", "sealed")).toBe(730);
    expect(estimateShelfLifeDays("canned", "Pantry", "opened")).toBe(4);
    expect(estimateShelfLifeDays("canned", "Fridge", "opened")).toBe(4);
  });

  it("gives dry rice a long cupboard life", () => {
    expect(estimateShelfLifeDays("rice_grains", "Pantry")).toBe(720);
  });

  it("shortens perishables once opened", () => {
    expect(estimateShelfLifeDays("milk", "Fridge", "sealed")).toBe(7);
    expect(estimateShelfLifeDays("milk", "Fridge", "opened")).toBe(4); // round(7 * 0.6)
  });

  it("returns null for an unconfirmed / Other location", () => {
    expect(estimateShelfLifeDays("milk", null)).toBeNull();
    expect(estimateShelfLifeDays("milk", "Other")).toBeNull();
  });

  it("returns null for an unknown food with no data", () => {
    expect(estimateShelfLifeDays("other", "Fridge")).toBeNull();
  });
});

describe("recommendStorage", () => {
  it("recommends confidently for clear cases", () => {
    expect(recommendStorage("raw_meat")).toEqual({ location: "Fridge", confidence: "high" });
    expect(recommendStorage("rice_grains")).toEqual({ location: "Pantry", confidence: "high" });
    expect(recommendStorage("leafy_greens")).toEqual({ location: "Fridge", confidence: "high" });
    expect(recommendStorage("frozen")).toEqual({ location: "Freezer", confidence: "high" });
  });

  it("is only medium-confident for ambiguous produce", () => {
    expect(recommendStorage("vegetables").confidence).toBe("medium");
    expect(recommendStorage("fruit").confidence).toBe("medium");
  });

  it("gives no recommendation for unknown foods", () => {
    expect(recommendStorage("other")).toEqual({ location: null, confidence: "low" });
  });
});

describe("estimateExpiryDate", () => {
  it("adds days to the logged date (local calendar, no UTC drift)", () => {
    expect(estimateExpiryDate("2026-01-01", 3)).toBe("2026-01-04");
    expect(estimateExpiryDate("2026-01-30", 3)).toBe("2026-02-02");
  });
});
