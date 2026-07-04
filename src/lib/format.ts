import { getCurrencyCode, getCurrencyLocale } from "./currency";

const currencyCode = getCurrencyCode();
const currencyLocale = getCurrencyLocale();

export const currencyFormatter = new Intl.NumberFormat(currencyLocale, {
  style: "currency",
  currency: currencyCode,
});

const compactFormatter = new Intl.NumberFormat(currencyLocale, {
  style: "currency",
  currency: currencyCode,
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatCurrency(value: number, compact = false): string {
  return compact ? compactFormatter.format(value) : currencyFormatter.format(value);
}

export function formatSignedCurrency(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${currencyFormatter.format(Math.abs(value))}`;
}
