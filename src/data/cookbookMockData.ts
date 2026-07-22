export type Ingredient = {
  id: string;
  name: string;
  quantity: number | null;
  unit: string;
  optional?: boolean;
  toTaste?: boolean;
};

export type MockRecipe = {
  id: string;
  title: string;
  description: string;
  image: string;
  prepMins: number;
  cookMins: number;
  servings: number;
  caloriesPerServing: number;
  tags: string[];
  ingredients: Ingredient[];
  instructions: string[];
  nutrition: {
    calories: number;
    carbs: number;
    protein: number;
    fat: number;
    fiber: number;
    sugar: number;
    sodium: number;
  };
  tips?: string[];
};

export const MOCK_RECIPES: MockRecipe[] = [
  {
    id: "autumn-roasted-vegetables",
    title: "Autumn Roasted Vegetables",
    description:
      "A colorful medley of seasonal vegetables roasted to perfection with olive oil, herbs, and a touch of garlic. Simple, healthy, and full of cozy fall flavors.",
    image:
      "https://images.unsplash.com/photo-1447279506476-3faec8071eee?auto=format&fit=crop&w=1400&q=80",
    prepMins: 5,
    cookMins: 25,
    servings: 4,
    caloriesPerServing: 300,
    tags: ["Vegetarian", "Gluten-Free", "Vegan", "High Fiber"],
    ingredients: [
      { id: "i1", name: "Large butternut squash, peeled and cubed", quantity: 1, unit: "whole" },
      { id: "i2", name: "Brussels sprouts, halved", quantity: 2, unit: "cups" },
      { id: "i3", name: "Red onion, cut into wedges", quantity: 1, unit: "medium" },
      { id: "i4", name: "Large carrots, peeled and chopped", quantity: 2, unit: "whole" },
      { id: "i5", name: "Olive oil", quantity: 3, unit: "tbsp" },
      { id: "i6", name: "Garlic, minced", quantity: 3, unit: "cloves" },
      { id: "i7", name: "Dried thyme", quantity: 1, unit: "tsp" },
      { id: "i8", name: "Smoked paprika", quantity: 0.5, unit: "tsp" },
      { id: "i9", name: "Salt and pepper", quantity: null, unit: "", toTaste: true },
      { id: "i10", name: "Fresh parsley, chopped for garnish", quantity: null, unit: "", optional: true },
    ],
    instructions: [
      "Preheat oven to 400°F (200°C).",
      "Prepare squash cubes on a baking sheet and roast for 20–25 minutes, until tender.",
      "Place onions and carrots on the sheet. Add garlic and olive oil; toss to coat.",
      "Add remaining vegetables and seasonings. Toss well.",
      "Roast for another 15 minutes, stirring halfway through, until vegetables are golden and tender.",
      "Remove from oven and garnish with parsley. Serve warm and enjoy!",
    ],
    nutrition: {
      calories: 300,
      carbs: 35,
      protein: 5,
      fat: 15,
      fiber: 5,
      sugar: 8,
      sodium: 400,
    },
    tips: [
      "Cut vegetables to a uniform size so they roast evenly.",
      "For extra crispiness, spread veggies in a single layer with room between pieces.",
      "Leftovers keep for up to 4 days in an airtight container.",
    ],
  },
];

export const RELATED_RECIPES = [
  {
    id: "maple-glazed-carrots",
    title: "Maple Glazed Carrots",
    mins: 25,
    servings: 4,
    image:
      "https://images.unsplash.com/photo-1590165482129-1b8b27698780?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "garlic-herb-potatoes",
    title: "Garlic Herb Roasted Potatoes",
    mins: 30,
    servings: 4,
    image:
      "https://images.unsplash.com/photo-1552332386-f8dd00dc2f85?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "honey-brussels-sprouts",
    title: "Honey Roasted Brussels Sprouts",
    mins: 20,
    servings: 4,
    image:
      "https://images.unsplash.com/photo-1438118907704-7718ee9a191a?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "butternut-kale-salad",
    title: "Butternut Squash & Kale Salad",
    mins: 15,
    servings: 2,
    image:
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "roasted-cauliflower",
    title: "Roasted Cauliflower with Tahini",
    mins: 35,
    servings: 4,
    image:
      "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?auto=format&fit=crop&w=800&q=80",
  },
];

export function formatQuantity(q: number | null, unit: string, opts?: { toTaste?: boolean; optional?: boolean }): string {
  if (opts?.toTaste) return "to taste";
  if (opts?.optional && q == null) return "—";
  if (q == null) return "—";
  const rounded = Math.round(q * 100) / 100;
  const display =
    rounded === 0.5
      ? "½"
      : rounded === 0.25
        ? "¼"
        : rounded === 0.75
          ? "¾"
          : rounded === 0.33
            ? "⅓"
            : rounded === 0.67
              ? "⅔"
              : Number.isInteger(rounded)
                ? String(rounded)
                : String(rounded);
  return unit ? `${display} ${unit}` : display;
}