import { describe, it, expect } from "vitest";
import { parseLine, parseBulkNotes, mergeDuplicates } from "./purchase-parser";

describe("parseLine — canonical format (Item, quantity, weight, price)", () => {
  it("parses the primary example", () => {
    expect(parseLine("Tomatoes, 6 pieces, 1 kg, 14")).toMatchObject({
      name: "Tomatoes", quantity: 6, quantityUnit: "piece",
      weight: 1, weightUnit: "kg", price: 14, notes: null,
    });
  });

  it("parses a bunch + grams line", () => {
    expect(parseLine("Spinach, 1 bunch, 500 g, 5")).toMatchObject({
      name: "Spinach", quantity: 1, quantityUnit: "bunch",
      weight: 500, weightUnit: "g", price: 5,
    });
  });

  it("parses decimal weight", () => {
    expect(parseLine("Avocado, 4 pieces, 1.2 kg, 18")).toMatchObject({
      name: "Avocado", quantity: 4, quantityUnit: "piece", weight: 1.2, weightUnit: "kg", price: 18,
    });
  });
});

describe("parseLine — bracket annotations become notes", () => {
  it("captures bracketed notes and still parses the structured fields", () => {
    expect(parseLine("Avocado, 4 pieces (two ripe), 1.2 kg, 18 (two still in bag)")).toMatchObject({
      name: "Avocado", quantity: 4, quantityUnit: "piece",
      weight: 1.2, weightUnit: "kg", price: 18,
      notes: "two ripe; two still in bag",
    });
  });

  it("supports square brackets too", () => {
    expect(parseLine("Milk, 2 bottles [lactose free], 8")).toMatchObject({
      name: "Milk", quantity: 2, quantityUnit: "bottle", price: 8, notes: "lactose free",
    });
  });
});

describe("parseLine — substance over form (lenient)", () => {
  it("handles a missing weight field (3 fields)", () => {
    expect(parseLine("Milk, 2 bottles, 8")).toMatchObject({
      name: "Milk", quantity: 2, quantityUnit: "bottle", weight: null, price: 8,
    });
  });

  it("treats a lone trailing number as the price", () => {
    expect(parseLine("Bread, 5")).toMatchObject({ name: "Bread", price: 5, quantity: null });
  });

  it("splits two bare numbers into quantity then price", () => {
    expect(parseLine("Eggs, 12, 15")).toMatchObject({ name: "Eggs", quantity: 12, price: 15 });
  });

  it("parses weight + price with no count", () => {
    expect(parseLine("Sugar, 1 kg, 12")).toMatchObject({
      name: "Sugar", quantity: null, weight: 1, weightUnit: "kg", price: 12,
    });
  });

  it("is order-independent for unit-tagged fields (price not last)", () => {
    expect(parseLine("Tomatoes, 14, 1 kg, 6 pieces")).toMatchObject({
      name: "Tomatoes", weight: 1, weightUnit: "kg", quantity: 6, quantityUnit: "piece", price: 14,
    });
  });

  it("keeps unrecognised words as notes instead of dropping them", () => {
    expect(parseLine("Tomatoes, organic, 6 pieces, 14")).toMatchObject({
      name: "Tomatoes", quantity: 6, quantityUnit: "piece", price: 14, notes: "organic",
    });
  });

  it("handles a unit with no space", () => {
    expect(parseLine("Spinach, 500g, 5")).toMatchObject({ weight: 500, weightUnit: "g", price: 5 });
  });

  it("title-cases the item name", () => {
    expect(parseLine("  tomatoes , 6 pieces, 14")?.name).toBe("Tomatoes");
  });
});

describe("parseLine — currency handling", () => {
  it("strips a currency symbol from the price", () => {
    expect(parseLine("Cheese, 1 pack, $20")).toMatchObject({ price: 20, quantity: 1, quantityUnit: "pack" });
  });

  it("recognises a currency code before the number", () => {
    expect(parseLine("Rice, 5 kg, AED 30")).toMatchObject({ weight: 5, weightUnit: "kg", price: 30 });
  });

  it("recognises a currency code after the number", () => {
    expect(parseLine("Rice, 5 kg, 30 AED")).toMatchObject({ weight: 5, weightUnit: "kg", price: 30 });
  });
});

describe("parseLine — skips", () => {
  it("returns null for blank and comment lines", () => {
    expect(parseLine("")).toBeNull();
    expect(parseLine("   ")).toBeNull();
    expect(parseLine("# a header")).toBeNull();
    expect(parseLine("(just a note)")).toBeNull();
  });
});

describe("parseBulkNotes", () => {
  it("parses a multi-line block and skips blanks", () => {
    const rows = parseBulkNotes(`Tomatoes, 6 pieces, 1 kg, 14

Spinach, 1 bunch, 500 g, 5
Avocado, 4 pieces, 1.2 kg, 18
Potatoes, 8 pieces, 2 kg, 16`);
    expect(rows).toHaveLength(4);
    expect(rows.map((r) => r.name)).toEqual(["Tomatoes", "Spinach", "Avocado", "Potatoes"]);
    expect(rows[3]).toMatchObject({ quantity: 8, weight: 2, weightUnit: "kg", price: 16 });
  });
});

describe("mergeDuplicates", () => {
  it("sums quantity and price and concatenates notes for same-named items", () => {
    const rows = parseBulkNotes(`Tomatoes, 6 pieces, 1 kg, 14 (ripe)
Tomatoes, 2 pieces, 0.5 kg, 5 (green)`);
    const merged = mergeDuplicates(rows);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({
      name: "Tomatoes", quantity: 8, weight: 1.5, weightUnit: "kg", price: 19,
      notes: "ripe; green",
    });
  });

  it("keeps first weight when units differ", () => {
    const merged = mergeDuplicates([
      { name: "Flour", quantity: 1, quantityUnit: "bag", weight: 1, weightUnit: "kg", price: 3, notes: null, raw: "" },
      { name: "Flour", quantity: 1, quantityUnit: "bag", weight: 500, weightUnit: "g", price: 2, notes: null, raw: "" },
    ]);
    expect(merged[0]).toMatchObject({ quantity: 2, weight: 1, weightUnit: "kg", price: 5 });
  });
});
