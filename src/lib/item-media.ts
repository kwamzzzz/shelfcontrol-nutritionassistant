import type { Item } from "@/hooks/usePantry";

export type ItemMediaSource = "uploaded" | "catalog" | "missing";

export interface ItemMedia {
  src: string | null;
  source: ItemMediaSource;
  label: string;
}

type MediaItem = Pick<Item, "name" | "category" | "image_url">;

interface ProductAsset {
  src: string;
  label: string;
  matches: (name: string, category: string) => boolean;
}

const hasWord = (name: string, word: string) =>
  new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}s?\\b`, "i").test(name);

const isDerivedOrPackagedProduct = (name: string, category: string) =>
  category === "canned goods" ||
  /\b(baby food|cake|candy|canned|cereal|chips|chutney|dried|drink|flavou?red|flavou?r|frozen meal|ice cream|jam|juice|milk|oil|paste|powder|puree|sauce|soda|soup|spread|tea|yogh?urt)\b/i.test(name);

/**
 * This bank is deliberately product-specific. A match may cover spelling or
 * country variants of the same food, but never a different food in the same
 * category. If a product is not confidently represented here, the UI shows an
 * honest photo-needed state instead of borrowing a misleading category photo.
 */
const PRODUCT_ASSETS: ProductAsset[] = [
  { src: "/media/products/sweet-potato.jpg", label: "Sweet potato", matches: (n, c) => !isDerivedOrPackagedProduct(n, c) && /\bsweet potatoes?\b/i.test(n) },
  { src: "/media/products/bell-pepper.jpg", label: "Bell pepper", matches: (n, c) => !isDerivedOrPackagedProduct(n, c) && /\b(bell pepper|capsicum)\b/i.test(n) },
  { src: "/media/products/pomegranate.jpg", label: "Pomegranate", matches: (n, c) => !isDerivedOrPackagedProduct(n, c) && hasWord(n, "pomegranate") },
  { src: "/media/products/cauliflower.jpg", label: "Cauliflower", matches: (n, c) => !isDerivedOrPackagedProduct(n, c) && hasWord(n, "cauliflower") },
  { src: "/media/products/pineapple.jpg", label: "Pineapple", matches: (n, c) => !isDerivedOrPackagedProduct(n, c) && hasWord(n, "pineapple") },
  { src: "/media/products/coriander.jpg", label: "Coriander", matches: (n, c) => !isDerivedOrPackagedProduct(n, c) && /\b(coriander|corienda)\b/i.test(n) },
  { src: "/media/products/eggplant.jpg", label: "Eggplant", matches: (n, c) => !isDerivedOrPackagedProduct(n, c) && /\b(eggplant|egg plant)\b/i.test(n) },
  { src: "/media/products/broccoli.jpg", label: "Broccoli", matches: (n, c) => !isDerivedOrPackagedProduct(n, c) && hasWord(n, "broccoli") },
  { src: "/media/products/beetroot.jpg", label: "Beetroot", matches: (n, c) => !isDerivedOrPackagedProduct(n, c) && hasWord(n, "beetroot") },
  { src: "/media/products/avocado.jpg", label: "Avocado", matches: (n, c) => !isDerivedOrPackagedProduct(n, c) && hasWord(n, "avocado") },
  { src: "/media/products/banana.jpg", label: "Banana", matches: (n, c) => !isDerivedOrPackagedProduct(n, c) && hasWord(n, "banana") },
  { src: "/media/products/carrot.jpg", label: "Carrot", matches: (n, c) => !isDerivedOrPackagedProduct(n, c) && hasWord(n, "carrot") },
  { src: "/media/products/cherry.jpg", label: "Cherry", matches: (n, c) => !isDerivedOrPackagedProduct(n, c) && /\b(cherry|cherries)\b/i.test(n) },
  { src: "/media/products/ginger.jpg", label: "Ginger", matches: (n, c) => !isDerivedOrPackagedProduct(n, c) && hasWord(n, "ginger") },
  { src: "/media/products/kiwi.jpg", label: "Kiwi", matches: (n, c) => !isDerivedOrPackagedProduct(n, c) && hasWord(n, "kiwi") },
  { src: "/media/products/lettuce.jpg", label: "Lettuce", matches: (n, c) => !isDerivedOrPackagedProduct(n, c) && hasWord(n, "lettuce") },
  { src: "/media/products/mango.jpg", label: "Mango", matches: (n, c) => !isDerivedOrPackagedProduct(n, c) && hasWord(n, "mango") },
  { src: "/media/products/dill.jpg", label: "Dill", matches: (n, c) => !isDerivedOrPackagedProduct(n, c) && /\b(dill|dil)\b/i.test(n) },
  {
    src: "/media/products/tomato.jpg",
    label: "Tomato",
    matches: (n, c) => !isDerivedOrPackagedProduct(n, c) && hasWord(n, "tomato"),
  },
  {
    src: "/media/products/corn.jpg",
    label: "Corn",
    matches: (n, c) => !isDerivedOrPackagedProduct(n, c) && hasWord(n, "corn"),
  },
];

/**
 * User photography always wins. Otherwise use an exact single-product match.
 * Unknown items intentionally return no src so the card can ask for a photo
 * without showing inaccurate food.
 */
export function getItemMedia(item: MediaItem): ItemMedia {
  const custom = item.image_url?.trim();
  if (custom) {
    return { src: custom, source: "uploaded", label: item.name };
  }

  const name = item.name.trim().toLowerCase();
  const category = item.category?.trim().toLowerCase() ?? "";
  const asset = PRODUCT_ASSETS.find((candidate) => candidate.matches(name, category));

  if (asset) {
    return { src: asset.src, source: "catalog", label: asset.label };
  }

  return { src: null, source: "missing", label: item.name };
}
