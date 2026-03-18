export type CurrencyCode = "AED" | "USD" | "EUR" | "GBP" | "SAR" | "INR";

interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  decimals: number;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  AED: { code: "AED", symbol: "AED", name: "UAE Dirham", decimals: 2 },
  USD: { code: "USD", symbol: "$", name: "US Dollar", decimals: 2 },
  EUR: { code: "EUR", symbol: "€", name: "Euro", decimals: 2 },
  GBP: { code: "GBP", symbol: "£", name: "British Pound", decimals: 2 },
  SAR: { code: "SAR", symbol: "SAR", name: "Saudi Riyal", decimals: 2 },
  INR: { code: "INR", symbol: "₹", name: "Indian Rupee", decimals: 2 },
};

// Phase 1: app-wide default. Later this can come from user profile / settings.
const APP_CURRENCY: CurrencyCode = "AED";

export const getActiveCurrency = (): CurrencyConfig => CURRENCIES[APP_CURRENCY];

/**
 * Format a numeric value for display with the active currency.
 * e.g. formatCurrency(32) → "AED 32.00"
 */
export const formatCurrency = (value: number | null | undefined): string => {
  if (value == null || value === 0) return "";
  const c = getActiveCurrency();
  return `${c.symbol} ${value.toFixed(c.decimals)}`;
};

/**
 * Short format without zero-check, always returns a string.
 */
export const formatCurrencyAlways = (value: number | null | undefined): string => {
  const c = getActiveCurrency();
  return `${c.symbol} ${(value ?? 0).toFixed(c.decimals)}`;
};
