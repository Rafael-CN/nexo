export type CurrencyCode = "BRL" | "USD" | "EUR";

export const currencyOptions: {
  code: CurrencyCode;
  label: string;
  locale: string;
}[] = [
  { code: "BRL", label: "Real Brasileiro (R$)", locale: "pt-BR" },
  { code: "USD", label: "Dólar Americano (US$)", locale: "en-US" },
  { code: "EUR", label: "Euro (€)", locale: "de-DE" },
];

const STORAGE_KEY = "nexo.currency.v1";

export function getCurrencyCode(): CurrencyCode {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && currencyOptions.some((option) => option.code === stored)) {
      return stored as CurrencyCode;
    }
  } catch {
    // sem localStorage (testes/SSR): usa o padrão
  }
  return "BRL";
}

export function getCurrencyLocale(): string {
  const code = getCurrencyCode();
  return currencyOptions.find((option) => option.code === code)?.locale ?? "pt-BR";
}

/**
 * A moeda alimenta formatadores criados na carga dos módulos;
 * o chamador deve recarregar o app após trocar.
 */
export function setCurrencyCode(code: CurrencyCode) {
  try {
    window.localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // indisponível: mantém a atual
  }
}
