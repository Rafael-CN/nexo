import { addDays, format, parseISO, subDays } from "date-fns";
import { parseBrAmount, parseBrDate } from "@/lib/statement/csv";

export interface ParsedNaturalEntry {
  title: string;
  amount: number;
  /** ISO yyyy-MM-dd */
  date: string;
  type: "expense" | "income";
}

const INCOME_WORDS = new Set([
  "recebi",
  "receita",
  "entrada",
  "ganhei",
  "salario",
  "salário",
  "pix recebido",
]);

const DATE_WORDS: Record<string, number> = {
  hoje: 0,
  ontem: -1,
  anteontem: -2,
  amanha: 1,
  "amanhã": 1,
};

/**
 * Em pt-BR "1.200" é milhar (1200), não decimal — normaliza antes do
 * parser genérico, que trataria o ponto como separador americano.
 */
function parseAmountToken(token: string): number | null {
  const normalized = /^\d{1,3}(\.\d{3})+$/.test(token)
    ? token.replace(/\./g, "")
    : token;
  return parseBrAmount(normalized);
}

/**
 * Interpreta entradas rápidas como "mercado 54,90 ontem" ou
 * "+ salário 4.500 05/07": último token numérico vira o valor,
 * palavras de data (hoje/ontem/amanhã) ou dd/mm definem a data,
 * "+"/palavras de receita definem o tipo, e o resto vira o título.
 * Retorna null quando não há valor ou título — aí a busca assume.
 */
export function parseNaturalEntry(
  input: string,
  todayIso = format(new Date(), "yyyy-MM-dd"),
): ParsedNaturalEntry | null {
  let text = input.trim();
  if (!text) return null;

  let type: ParsedNaturalEntry["type"] = "expense";
  if (text.startsWith("+")) {
    type = "income";
    text = text.slice(1).trim();
  } else if (text.startsWith("-")) {
    text = text.slice(1).trim();
  }

  const tokens = text.split(/\s+/);
  let amount: number | null = null;
  let amountIndex = -1;
  let date: string | null = null;
  let dateIndex = -1;

  for (let index = tokens.length - 1; index >= 0; index -= 1) {
    const token = tokens[index];
    const lower = token
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();

    if (date === null && lower in DATE_WORDS) {
      date = shiftDate(todayIso, DATE_WORDS[lower]);
      dateIndex = index;
      continue;
    }

    if (date === null && /^\d{1,2}\/\d{1,2}(\/\d{2,4})?$/.test(token)) {
      const withYear = token.includes("/") && token.split("/").length === 3
        ? token
        : `${token}/${todayIso.slice(0, 4)}`;
      const parsed = parseBrDate(withYear);
      if (parsed) {
        date = parsed;
        dateIndex = index;
        continue;
      }
    }

    if (amount === null && /\d/.test(token)) {
      const parsed = parseAmountToken(token);
      if (parsed !== null && parsed > 0) {
        amount = parsed;
        amountIndex = index;
      }
    }
  }

  if (amount === null) return null;

  const titleTokens = tokens.filter(
    (_, index) => index !== amountIndex && index !== dateIndex,
  );
  const incomeHit = titleTokens.some((token) =>
    INCOME_WORDS.has(
      token.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase(),
    ) || INCOME_WORDS.has(token.toLowerCase()),
  );
  if (incomeHit) type = "income";

  const title = titleTokens.join(" ").replace(/\s+/g, " ").trim();
  if (!title) return null;

  return {
    title: capitalize(title),
    amount,
    date: date ?? todayIso,
    type,
  };
}

export interface ParsedNaturalTransfer {
  /** Texto livre que aponta a conta de destino (ex.: "reserva"). */
  targetText: string;
  amount: number;
  /** ISO yyyy-MM-dd */
  date: string;
  /** "aporte" quando a intenção é contribuição; senão transferência. */
  intent: "transfer" | "aporte";
}

const TRANSFER_WORDS = new Set(["transferir", "transfere", "transferencia", "mover"]);
const APORTE_WORDS = new Set(["aporte", "aportar", "guardar"]);
const CONNECTOR_WORDS = new Set(["de", "para", "pra", "na", "no", "a"]);

/**
 * Interpreta transferências em linguagem natural:
 * "transferir 500 para reserva", "aporte 300 na reserva amanhã".
 * Exige a palavra-chave, um valor e o texto do destino — o casamento
 * com a conta acontece em quem chama (palette), que conhece o store.
 */
export function parseNaturalTransfer(
  input: string,
  todayIso = format(new Date(), "yyyy-MM-dd"),
): ParsedNaturalTransfer | null {
  const text = input.trim();
  if (!text) return null;

  const tokens = text.split(/\s+/);
  const normalized = tokens.map((token) =>
    token.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase(),
  );

  const keywordIndex = normalized.findIndex(
    (token) => TRANSFER_WORDS.has(token) || APORTE_WORDS.has(token),
  );
  if (keywordIndex === -1) return null;
  const intent = APORTE_WORDS.has(normalized[keywordIndex])
    ? ("aporte" as const)
    : ("transfer" as const);

  let amount: number | null = null;
  let amountIndex = -1;
  let date: string | null = null;
  let dateIndex = -1;

  for (let index = tokens.length - 1; index >= 0; index -= 1) {
    if (index === keywordIndex) continue;
    const lower = normalized[index];

    if (date === null && lower in DATE_WORDS) {
      date = shiftDate(todayIso, DATE_WORDS[lower]);
      dateIndex = index;
      continue;
    }

    if (amount === null && /\d/.test(tokens[index])) {
      const parsed = parseAmountToken(tokens[index]);
      if (parsed !== null && parsed > 0) {
        amount = parsed;
        amountIndex = index;
      }
    }
  }

  if (amount === null) return null;

  const targetText = tokens
    .filter(
      (_, index) =>
        index !== keywordIndex &&
        index !== amountIndex &&
        index !== dateIndex &&
        !CONNECTOR_WORDS.has(normalized[index]),
    )
    .join(" ")
    .trim();
  if (!targetText) return null;

  return { targetText, amount, date: date ?? todayIso, intent };
}

function shiftDate(todayIso: string, days: number): string {
  const today = parseISO(todayIso);
  const shifted = days >= 0 ? addDays(today, days) : subDays(today, -days);
  return format(shifted, "yyyy-MM-dd");
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
