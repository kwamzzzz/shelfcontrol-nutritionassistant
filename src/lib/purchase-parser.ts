/**
 * Bulk purchase notes parser — "substance over form".
 *
 * Turns free-typed grocery lines like:
 *   Tomatoes, 6 pieces, 1 kg, 14
 *   Spinach, 1 bunch, 500 g, 5
 *   Avocado, 4 pieces (two ripe), 1.2 kg, 18 (two still in bag)
 * into structured, editable rows:
 *   { name, quantity, quantityUnit, weight, weightUnit, price, notes }
 *
 * Design goals:
 * - Accept the preferred "Item, quantity, weight, price" order but never *require* it.
 * - Recognise a token as quantity vs weight by its unit, not its position.
 * - Preserve anything in (brackets) or [brackets] as notes, never discard it.
 * - Keep unclassifiable words as notes rather than dropping the line.
 */

export interface ParsedLine {
  name: string;
  quantity: number | null;
  quantityUnit: string | null;
  weight: number | null;
  weightUnit: string | null;
  price: number | null;
  notes: string | null;
  raw: string;
}

// Weight + volume share the "measure" axis (weight field also holds liquid volume).
const WEIGHT_UNITS: Record<string, string> = {
  mg: "mg",
  g: "g", gram: "g", grams: "g", gm: "g", gms: "g",
  kg: "kg", kilo: "kg", kilos: "kg", kilogram: "kg", kilograms: "kg", kgs: "kg",
  oz: "oz", ounce: "oz", ounces: "oz",
  lb: "lb", lbs: "lb", pound: "lb", pounds: "lb",
  tonne: "tonne", tonnes: "tonne", ton: "tonne",
  ml: "ml", milliliter: "ml", millilitre: "ml", mls: "ml",
  cl: "cl", dl: "dl",
  l: "L", liter: "L", litre: "L", liters: "L", litres: "L", ltr: "L",
  gal: "gallon", gallon: "gallon", gallons: "gallon",
  pint: "pint", pt: "pint", quart: "quart", qt: "quart",
};

const COUNT_UNITS: Record<string, string> = {
  piece: "piece", pieces: "piece", pc: "piece", pcs: "piece", pce: "piece",
  unit: "unit", units: "unit", item: "item", items: "item",
  pack: "pack", packs: "pack", packet: "packet", packets: "packet", pkt: "pack",
  sachet: "sachet", stick: "stick", sticks: "stick",
  slice: "slice", slices: "slice", portion: "portion", portions: "portion",
  serving: "serving", servings: "serving",
  bunch: "bunch", bunches: "bunch",
  dozen: "dozen", dozens: "dozen", doz: "dozen",
  box: "box", boxes: "box", carton: "carton", cartons: "carton",
  bottle: "bottle", bottles: "bottle", can: "can", cans: "can",
  jar: "jar", jars: "jar", tub: "tub", tubs: "tub", tray: "tray", trays: "tray",
  bag: "bag", bags: "bag", pouch: "pouch", pouches: "pouch",
  container: "container", containers: "container",
  crate: "crate", crates: "crate", case: "case", cases: "case",
  loaf: "loaf", loaves: "loaf", fillet: "fillet", fillets: "fillet",
  clove: "clove", cloves: "clove", head: "head", heads: "head",
  stalk: "stalk", stalks: "stalk", ear: "ear", ears: "ear",
  block: "block", blocks: "block", cube: "cube", cubes: "cube",
  bundle: "bundle", bundles: "bundle", pair: "pair", pairs: "pair",
  set: "set", sets: "set", punnet: "punnet", punnets: "punnet",
  tin: "tin", tins: "tin", roll: "roll", rolls: "roll",
  bar: "bar", bars: "bar", tube: "tube", tubes: "tube",
};

// Currency words/symbols attached to a number mark it as the price.
// "d" / "dh" / "dhs" = dirham (e.g. "8D"), the app's default currency.
const CURRENCY_TOKENS = new Set([
  "aed", "usd", "eur", "gbp", "sar", "inr", "d", "dhs", "dh", "dirham", "dirhams",
  "$", "€", "£", "₹", "﷼", "rs", "usd$",
]);

const stripCurrencySymbols = (s: string) => s.replace(/[$€£₹﷼]/g, "").trim();

/** Parse a numeric prefix like "1.2", "500", ".5". Returns null if none. */
function parseLeadingNumber(token: string): { value: number; rest: string } | null {
  const m = token.match(/^\s*(\d+(?:\.\d+)?|\.\d+)\s*(.*)$/);
  if (!m) return null;
  const value = parseFloat(m[1]);
  if (!Number.isFinite(value)) return null;
  return { value, rest: m[2].trim() };
}

type Kind = "weight" | "count" | "currency" | "unknownUnit" | "bareNumber" | "text";

interface Classified {
  kind: Kind;
  value?: number;
  unit?: string | null;
  text?: string;
}

/** Classify one comma-separated token (already bracket-stripped). */
function classifyToken(token: string): Classified {
  const t = token.trim();
  if (!t) return { kind: "text", text: "" };

  // Pure currency-symbol price, e.g. "$14" / "AED 14" / "14 aed"
  const cleaned = stripCurrencySymbols(t);
  const num = parseLeadingNumber(cleaned);

  if (num) {
    const unitWord = num.rest.replace(/\.$/, "").toLowerCase().trim();
    if (!unitWord) {
      // Bare number (maybe with a stripped currency symbol → still a price candidate)
      return { kind: "bareNumber", value: num.value };
    }
    if (CURRENCY_TOKENS.has(unitWord)) return { kind: "currency", value: num.value };
    if (WEIGHT_UNITS[unitWord]) return { kind: "weight", value: num.value, unit: WEIGHT_UNITS[unitWord] };
    if (COUNT_UNITS[unitWord]) return { kind: "count", value: num.value, unit: COUNT_UNITS[unitWord] };
    // Number followed by an unrecognised word → treat as a count with that raw unit.
    return { kind: "unknownUnit", value: num.value, unit: unitWord };
  }

  // "aed 14" style where the number came after the currency word
  const words = cleaned.toLowerCase().split(/\s+/);
  if (words.length >= 2 && CURRENCY_TOKENS.has(words[0])) {
    const after = parseLeadingNumber(words.slice(1).join(" "));
    if (after) return { kind: "currency", value: after.value };
  }

  // Non-numeric word(s) → notes fragment (e.g. "organic", "for salad")
  return { kind: "text", text: t };
}

const titleCase = (s: string) =>
  s.replace(/\s+/g, " ").trim().replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Tokenise a space-separated line (no commas), e.g. "Onions brown 700g 8D".
 * The item name is the run of leading words that don't start with a digit
 * (so multi-word names like "Bell pepper" or "Beef chest" stay intact); the
 * remaining words are the measurement tokens, with a bare number and the word
 * after it (e.g. "6 pieces") grouped so the classifier sees one unit token.
 */
function tokenizeSpaced(s: string): { name: string; rest: string[] } | null {
  const words = s.split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;

  let i = 0;
  const nameWords: string[] = [];
  while (i < words.length && !/^\d/.test(words[i])) {
    nameWords.push(words[i]);
    i++;
  }

  // Whole line is a name (no measurements).
  if (i >= words.length) return { name: nameWords.join(" ") || words[0], rest: [] };

  // Degenerate "5 apples" (starts with a number): take the first word as name.
  const name = nameWords.join(" ") || words[i];
  if (!nameWords.length) i++;

  const rest: string[] = [];
  while (i < words.length) {
    const w = words[i];
    const next = words[i + 1];
    if (/^\d+(?:\.\d+)?$/.test(w) && next && /^[a-zA-Z]/.test(next)) {
      rest.push(`${w} ${next}`);
      i += 2;
    } else {
      rest.push(w);
      i += 1;
    }
  }
  return { name, rest };
}

/** Parse a single line. Returns null for blank/comment lines. */
export function parseLine(rawLine: string): ParsedLine | null {
  const raw = rawLine.trim();
  if (!raw || raw.startsWith("#") || raw.startsWith("//")) return null;

  // 1. Pull out bracketed annotations (both round and square) as notes.
  const noteParts: string[] = [];
  const working = raw
    .replace(/[([]([^)\]]*)[)\]]/g, (_all, inner: string) => {
      const trimmed = String(inner).trim();
      if (trimmed) noteParts.push(trimmed);
      return " ";
    })
    .replace(/\s+/g, " ")
    .trim();

  // 2. Tokenise. Comma/semicolon/tab-delimited lines split on the delimiter;
  //    lines without one fall back to space parsing (name words, then units).
  let nameRaw: string;
  let rest: string[];
  if (/[,;\t]/.test(working)) {
    const tokens = working.split(/[,;\t]/).map((t) => t.trim()).filter(Boolean);
    if (tokens.length === 0) return null; // was only an annotation, e.g. "(note)"
    nameRaw = tokens[0];
    rest = tokens.slice(1);
  } else {
    const spaced = tokenizeSpaced(working);
    if (!spaced) return null;
    nameRaw = spaced.name;
    rest = spaced.rest;
  }

  // 3. Item name.
  const name = titleCase(nameRaw);

  let quantity: number | null = null;
  let quantityUnit: string | null = null;
  let weight: number | null = null;
  let weightUnit: string | null = null;
  let price: number | null = null;
  const bareNumbers: number[] = [];
  const currencyNumbers: number[] = [];

  for (const token of rest) {
    const c = classifyToken(token);
    switch (c.kind) {
      case "weight":
        if (weight == null) { weight = c.value!; weightUnit = c.unit!; }
        else bareNumbers.push(c.value!); // second measure → treat spare as number
        break;
      case "count":
        if (quantity == null) { quantity = c.value!; quantityUnit = c.unit!; }
        else bareNumbers.push(c.value!);
        break;
      case "unknownUnit":
        // Unrecognised unit word → best-effort quantity, keep the word as its unit.
        if (quantity == null) { quantity = c.value!; quantityUnit = c.unit ?? null; }
        else bareNumbers.push(c.value!);
        break;
      case "currency":
        currencyNumbers.push(c.value!);
        break;
      case "bareNumber":
        bareNumbers.push(c.value!);
        break;
      case "text":
        if (c.text) noteParts.push(c.text);
        break;
    }
  }

  // 4. Resolve price from bare/currency numbers. A currency-tagged number
  //    (e.g. "8D", "AED 30") wins; otherwise the LAST bare number is the price
  //    (money is written last). Any remaining unlabeled numbers then fill
  //    quantity, then weight, in the order written.
  const pool: number[] = [];
  if (currencyNumbers.length) {
    price = currencyNumbers[currencyNumbers.length - 1];
    pool.push(...currencyNumbers.slice(0, -1), ...bareNumbers);
  } else if (bareNumbers.length) {
    price = bareNumbers[bareNumbers.length - 1];
    pool.push(...bareNumbers.slice(0, -1));
  }
  for (const n of pool) {
    if (quantity == null) quantity = n;
    else if (weight == null) weight = n;
  }

  const notes = noteParts.length ? noteParts.join("; ") : null;

  return { name, quantity, quantityUnit, weight, weightUnit, price, notes, raw };
}

/** Parse a full block of pasted text into rows (blank lines skipped). */
export function parseBulkNotes(text: string): ParsedLine[] {
  return text
    .split(/\r?\n/)
    .map(parseLine)
    .filter((r): r is ParsedLine => r !== null);
}

/**
 * Merge rows that refer to the same item (case-insensitive name).
 * Quantities and prices are summed; weights are summed only when the unit
 * matches (otherwise the first weight is kept); notes are concatenated.
 */
export function mergeDuplicates<T extends ParsedLine>(rows: T[]): ParsedLine[] {
  const map = new Map<string, ParsedLine>();
  for (const r of rows) {
    const key = r.name.trim().toLowerCase();
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...r });
      continue;
    }
    // quantity
    if (r.quantity != null) {
      existing.quantity = (existing.quantity ?? 0) + r.quantity;
      existing.quantityUnit = existing.quantityUnit ?? r.quantityUnit;
    }
    // weight (only if same/compatible unit)
    if (r.weight != null) {
      if (existing.weight != null && existing.weightUnit === r.weightUnit) {
        existing.weight += r.weight;
      } else if (existing.weight == null) {
        existing.weight = r.weight;
        existing.weightUnit = r.weightUnit;
      }
    }
    // price
    if (r.price != null) existing.price = (existing.price ?? 0) + r.price;
    // notes
    const notes = [existing.notes, r.notes].filter(Boolean).join("; ");
    existing.notes = notes || null;
  }
  return Array.from(map.values());
}
