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

describe("parseLine — space-separated format (no commas, D = dirham)", () => {
  it("parses name + weight + price with a D-suffixed price", () => {
    expect(parseLine("Potato 1.100kg 8D")).toMatchObject({
      name: "Potato", weight: 1.1, weightUnit: "kg", price: 8, quantity: null,
    });
  });

  it("keeps a multi-word item name", () => {
    expect(parseLine("Onions brown 700g 10D")).toMatchObject({
      name: "Onions Brown", weight: 700, weightUnit: "g", price: 10,
    });
    expect(parseLine("Beef chest 1kg 25D")).toMatchObject({
      name: "Beef Chest", weight: 1, weightUnit: "kg", price: 25,
    });
  });

  it("parses quantity + weight + price together", () => {
    expect(parseLine("Carrot 6 peices 1kg 10D")).toMatchObject({
      name: "Carrot", quantity: 6, weight: 1, weightUnit: "kg", price: 10,
    });
  });

  it("parses a bundle quantity", () => {
    expect(parseLine("Corienda  2 bundle 2D")).toMatchObject({
      name: "Corienda", quantity: 2, quantityUnit: "bundle", price: 2,
    });
  });

  it("handles price written before weight", () => {
    expect(parseLine("Veil 65D 1.3kg")).toMatchObject({
      name: "Veil", price: 65, weight: 1.3, weightUnit: "kg",
    });
  });

  it("handles a weight-only price with no D and a plain trailing number", () => {
    expect(parseLine("Tail 0.45g 20")).toMatchObject({
      name: "Tail", weight: 0.45, weightUnit: "g", price: 20,
    });
  });

  it("handles name + price only (no measure)", () => {
    expect(parseLine("Egg plant 12D")).toMatchObject({
      name: "Egg Plant", price: 12, weight: null, quantity: null,
    });
  });

  it("keeps bracketed content while space-parsing", () => {
    expect(parseLine("Mango 45 (1 box)")).toMatchObject({
      name: "Mango", price: 45, notes: "1 box",
    });
  });

  it("fills weight from a leftover unlabeled number", () => {
    // "Avocado 3 pieces 650 19D" → 3 pieces, 650 (weight, unit unknown), 19 dirham
    expect(parseLine("Avocado 3 pieces 650 19D")).toMatchObject({
      name: "Avocado", quantity: 3, quantityUnit: "piece", weight: 650, price: 19,
    });
  });

  it("parses a full realistic block", () => {
    const rows = parseBulkNotes(`Beetroot 900g 8D
Bell pepper 1kg 15D
Mint 1 bundle 1D
Lamb cubes 50D
Pomegranate 4 pieces 12D`);
    expect(rows).toHaveLength(5);
    expect(rows[0]).toMatchObject({ name: "Beetroot", weight: 900, weightUnit: "g", price: 8 });
    expect(rows[1]).toMatchObject({ name: "Bell Pepper", weight: 1, weightUnit: "kg", price: 15 });
    expect(rows[2]).toMatchObject({ name: "Mint", quantity: 1, quantityUnit: "bundle", price: 1 });
    expect(rows[3]).toMatchObject({ name: "Lamb Cubes", price: 50 });
    expect(rows[4]).toMatchObject({ name: "Pomegranate", quantity: 4, quantityUnit: "piece", price: 12 });
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
