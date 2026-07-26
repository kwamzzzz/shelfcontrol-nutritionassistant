import { describe, expect, it } from "vitest";
import { getItemMedia } from "@/lib/item-media";

describe("getItemMedia", () => {
  it("keeps an uploaded product image", () => {
    expect(getItemMedia({
      name: "Bell pepper",
      category: "Produce",
      image_url: "https://example.com/pepper.jpg",
    })).toEqual({
      src: "https://example.com/pepper.jpg",
      source: "uploaded",
      label: "Bell pepper",
    });
  });

  it("uses a food-specific fallback for blank product images", () => {
    expect(getItemMedia({
      name: "Golden Kiwi",
      category: "Produce",
      image_url: null,
    }).src).toBe("/media/products/kiwi.jpg");

    expect(getItemMedia({
      name: "Egg Plant",
      category: null,
      image_url: "",
    }).src).toBe("/media/products/eggplant.jpg");

    expect(getItemMedia({
      name: "Bell Peppers",
      category: "Produce",
      image_url: null,
    }).src).toBe("/media/products/bell-pepper.jpg");
  });

  it("uses a neutral missing state instead of a misleading category photo", () => {
    expect(getItemMedia({
      name: "Sweet Corn - Whole Kernel",
      category: "Canned Goods",
      image_url: null,
    })).toEqual({
      src: null,
      source: "missing",
      label: "Sweet Corn - Whole Kernel",
    });

    expect(getItemMedia({
      name: "Sea Bass",
      category: "Meat & Seafood",
      image_url: null,
    }).source).toBe("missing");

    expect(getItemMedia({
      name: "Mango Yogurt",
      category: "Dairy",
      image_url: null,
    }).source).toBe("missing");

    expect(getItemMedia({
      name: "Oman Pofak Cheese Puffed Corn",
      category: "Snacks",
      image_url: null,
    }).source).toBe("missing");
  });
});
