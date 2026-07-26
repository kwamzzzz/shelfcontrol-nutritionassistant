import { describe, expect, it } from "vitest";
import { getIngredientAvailability } from "./pantry-utils";

describe("getIngredientAvailability", () => {
  it("is missing when nothing is in stock", () => {
    expect(getIngredientAvailability(2, 0)).toBe("missing");
    expect(getIngredientAvailability(null, 0)).toBe("missing");
  });

  it("is short when some stock but less than needed", () => {
    expect(getIngredientAvailability(3, 1)).toBe("short");
    expect(getIngredientAvailability(200, 150)).toBe("short");
  });

  it("is ok when stock meets or exceeds the need", () => {
    expect(getIngredientAvailability(2, 2)).toBe("ok");
    expect(getIngredientAvailability(2, 5)).toBe("ok");
  });

  it("is ok when the recipe asks for no specific amount but stock exists", () => {
    expect(getIngredientAvailability(null, 1)).toBe("ok");
    expect(getIngredientAvailability(undefined, 4)).toBe("ok");
  });
});
