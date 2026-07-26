export type PriceBasis = "kg" | "l" | "piece" | "pack";
export type PriceSource = "receipt" | "observed" | "community";

export interface PriceRecord {
  id: string;
  storeName: string;
  totalPrice: number;
  currency: string;
  quantity: number;
  unit: string;
  observedAt: string;
  source: PriceSource;
}

export interface NormalizedPriceRecord extends PriceRecord {
  basis: PriceBasis;
  normalizedPrice: number;
}

export interface StorePriceSummary extends NormalizedPriceRecord {
  rank: number;
  differenceFromBest: number;
}

const MASS_TO_KG: Record<string, number> = {
  g: 0.001,
  gram: 0.001,
  grams: 0.001,
  kg: 1,
  kilogram: 1,
  kilograms: 1,
};

const VOLUME_TO_L: Record<string, number> = {
  ml: 0.001,
  milliliter: 0.001,
  milliliters: 0.001,
  millilitre: 0.001,
  millilitres: 0.001,
  l: 1,
  litre: 1,
  litres: 1,
  liter: 1,
  liters: 1,
};

const PIECE_UNITS = new Set([
  "piece",
  "pieces",
  "unit",
  "units",
  "each",
  "item",
  "items",
  "count",
]);

const PACK_UNITS = new Set([
  "pack",
  "packs",
  "packet",
  "packets",
  "box",
  "boxes",
  "bag",
  "bags",
  "bottle",
  "bottles",
  "can",
  "cans",
  "jar",
  "jars",
]);

export const cleanUnit = (unit: string | null | undefined) =>
  (unit ?? "").trim().toLowerCase().replace(/\./g, "");

export function basisForUnit(unit: string | null | undefined): PriceBasis {
  const cleaned = cleanUnit(unit);
  if (cleaned in MASS_TO_KG) return "kg";
  if (cleaned in VOLUME_TO_L) return "l";
  if (PIECE_UNITS.has(cleaned)) return "piece";
  if (PACK_UNITS.has(cleaned)) return "pack";
  return "pack";
}

export function quantityInBasis(quantity: number, unit: string): {
  basis: PriceBasis;
  quantity: number;
} | null {
  if (!Number.isFinite(quantity) || quantity <= 0) return null;
  const cleaned = cleanUnit(unit);
  if (cleaned in MASS_TO_KG) return { basis: "kg", quantity: quantity * MASS_TO_KG[cleaned] };
  if (cleaned in VOLUME_TO_L) return { basis: "l", quantity: quantity * VOLUME_TO_L[cleaned] };
  if (PIECE_UNITS.has(cleaned)) return { basis: "piece", quantity };
  if (PACK_UNITS.has(cleaned)) return { basis: "pack", quantity };
  return { basis: "pack", quantity };
}

export function normalizePrice(record: PriceRecord): NormalizedPriceRecord | null {
  if (!Number.isFinite(record.totalPrice) || record.totalPrice < 0) return null;
  const normalizedQuantity = quantityInBasis(record.quantity, record.unit);
  if (!normalizedQuantity) return null;
  return {
    ...record,
    basis: normalizedQuantity.basis,
    normalizedPrice: record.totalPrice / normalizedQuantity.quantity,
  };
}

export function summarizeStores(
  records: NormalizedPriceRecord[],
  basis: PriceBasis,
): StorePriceSummary[] {
  const latestByStore = new Map<string, NormalizedPriceRecord>();
  records
    .filter((record) => record.basis === basis)
    .sort((a, b) => new Date(b.observedAt).getTime() - new Date(a.observedAt).getTime())
    .forEach((record) => {
      const key = record.storeName.trim().toLocaleLowerCase();
      if (!latestByStore.has(key)) latestByStore.set(key, record);
    });

  const sorted = [...latestByStore.values()].sort((a, b) => a.normalizedPrice - b.normalizedPrice);
  const best = sorted[0]?.normalizedPrice ?? 0;
  return sorted.map((record, index) => ({
    ...record,
    rank: index + 1,
    differenceFromBest: record.normalizedPrice - best,
  }));
}

export function basisLabel(basis: PriceBasis): string {
  if (basis === "kg") return "kg";
  if (basis === "l") return "L";
  if (basis === "piece") return "piece";
  return "pack";
}

export function formatStockAmount(quantity: number, basis: PriceBasis): string {
  const maximumFractionDigits = quantity < 10 ? 1 : 0;
  return `${quantity.toLocaleString(undefined, { maximumFractionDigits })} ${basisLabel(basis)}`;
}

function parseServingSize(servingSize: string | null | undefined) {
  if (!servingSize) return null;
  const match = servingSize.trim().match(/(\d+(?:\.\d+)?)\s*([a-zA-Z]+)/);
  if (!match) return null;
  return quantityInBasis(Number(match[1]), match[2]);
}

export interface StockAdvice {
  tone: "buy" | "plan" | "wait";
  label: string;
  detail: string;
  portions: number | null;
  stockAmount: string;
}

export function getStockAdvice(
  stockRows: Array<{ quantity: number; unit: string }>,
  servingSize?: string | null,
): StockAdvice {
  const normalizedRows = stockRows
    .map((row) => quantityInBasis(Number(row.quantity), row.unit))
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  const primaryBasis = normalizedRows[0]?.basis ?? "piece";
  const comparable = normalizedRows.filter((row) => row.basis === primaryBasis);
  const total = comparable.reduce((sum, row) => sum + row.quantity, 0);
  const stockAmount = formatStockAmount(total, primaryBasis);
  const serving = parseServingSize(servingSize);
  const portions =
    serving && serving.basis === primaryBasis && serving.quantity > 0
      ? Math.max(0, Math.floor(total / serving.quantity))
      : primaryBasis === "piece"
        ? Math.max(0, Math.floor(total))
        : null;

  if (total <= 0 || (portions !== null && portions <= 1)) {
    return {
      tone: "buy",
      label: total <= 0 ? "Buy now" : "Good time to buy",
      detail: total <= 0 ? "You have none left in the pantry." : `${portions} portion left in your pantry.`,
      portions,
      stockAmount,
    };
  }

  if ((portions !== null && portions <= 3) || (portions === null && total <= 1)) {
    return {
      tone: "plan",
      label: "Plan your next buy",
      detail: portions !== null ? `${portions} portions left in your pantry.` : `${stockAmount} left in your pantry.`,
      portions,
      stockAmount,
    };
  }

  return {
    tone: "wait",
    label: "You can wait",
    detail: portions !== null ? `${portions} portions left in your pantry.` : `${stockAmount} left in your pantry.`,
    portions,
    stockAmount,
  };
}
