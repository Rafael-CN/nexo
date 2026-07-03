import { format, lastDayOfMonth } from "date-fns";
import type { Account, Transaction } from "@/types";

export interface InvoiceWindow {
  /** Primeiro dia do ciclo (inclusive), ISO. */
  start: string;
  /** Dia de fechamento (inclusive), ISO. */
  end: string;
  /** Consumo do ciclo: despesas menos estornos. */
  total: number;
}

export interface InvoiceSummary {
  /** Fatura aberta: ciclo de compras em andamento. */
  open: InvoiceWindow;
  /** Fatura fechada mais recente, com vencimento. */
  closed: InvoiceWindow & { dueDate: string };
}

/**
 * Resumo de fatura de um cartão de crédito a partir do dia de
 * fechamento configurado. Dias 29-31 são ajustados para o último
 * dia do mês quando o mês é mais curto.
 */
export function getInvoiceSummary(
  account: Account,
  transactions: Transaction[],
  todayIso = format(new Date(), "yyyy-MM-dd"),
): InvoiceSummary | null {
  if (account.type !== "credit" || !account.closingDay) return null;

  const closingDay = account.closingDay;
  const today = parseIsoParts(todayIso);

  // Fechamento mais recente que já aconteceu (<= hoje).
  const currentMonthClosing = clampedDate(today.year, today.month, closingDay);
  const lastClosing =
    currentMonthClosing <= todayIso
      ? currentMonthClosing
      : clampedDate(...previousMonth(today.year, today.month), closingDay);

  const lastClosingParts = parseIsoParts(lastClosing);
  const nextClosing = clampedDate(
    ...nextMonth(lastClosingParts.year, lastClosingParts.month),
    closingDay,
  );
  const previousClosing = clampedDate(
    ...previousMonth(lastClosingParts.year, lastClosingParts.month),
    closingDay,
  );

  const openWindow = {
    start: dayAfter(lastClosing),
    end: nextClosing,
  };
  const closedWindow = {
    start: dayAfter(previousClosing),
    end: lastClosing,
  };

  return {
    open: {
      ...openWindow,
      total: windowTotal(account.id, transactions, openWindow),
    },
    closed: {
      ...closedWindow,
      total: windowTotal(account.id, transactions, closedWindow),
      dueDate: resolveDueDate(lastClosing, account.dueDay ?? closingDay),
    },
  };
}

function windowTotal(
  accountId: string,
  transactions: Transaction[],
  window: { start: string; end: string },
) {
  return transactions.reduce((total, txn) => {
    if (txn.accountId !== accountId) return total;
    if (txn.date < window.start || txn.date > window.end) return total;
    if (txn.type === "expense") return total + txn.amount;
    // Estornos reduzem a fatura; transferências são pagamento, não consumo.
    if (txn.type === "income") return total - txn.amount;
    return total;
  }, 0);
}

/**
 * Vencimento: primeiro dia `dueDay` estritamente após o fechamento.
 */
function resolveDueDate(closingIso: string, dueDay: number): string {
  const closing = parseIsoParts(closingIso);
  const sameMonth = clampedDate(closing.year, closing.month, dueDay);
  if (sameMonth > closingIso) return sameMonth;
  return clampedDate(...nextMonth(closing.year, closing.month), dueDay);
}

function parseIsoParts(iso: string) {
  return {
    year: Number(iso.slice(0, 4)),
    month: Number(iso.slice(5, 7)),
    day: Number(iso.slice(8, 10)),
  };
}

function clampedDate(year: number, month: number, day: number): string {
  const lastDay = lastDayOfMonth(new Date(year, month - 1, 1)).getDate();
  const clamped = Math.min(day, lastDay);
  return `${year}-${String(month).padStart(2, "0")}-${String(clamped).padStart(2, "0")}`;
}

function dayAfter(iso: string): string {
  const parts = parseIsoParts(iso);
  const date = new Date(parts.year, parts.month - 1, parts.day + 1);
  return format(date, "yyyy-MM-dd");
}

function previousMonth(year: number, month: number): [number, number] {
  return month === 1 ? [year - 1, 12] : [year, month - 1];
}

function nextMonth(year: number, month: number): [number, number] {
  return month === 12 ? [year + 1, 1] : [year, month + 1];
}
