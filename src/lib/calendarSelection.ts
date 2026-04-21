import { differenceInCalendarDays, parseISO } from "date-fns";
import { getTotalCurrentBalance } from "@/lib/balance";
import type { Account, Transaction } from "@/types";

export type SelectedRangeSummary = {
  start: string;
  end: string;
  days: number;
  income: number;
  expense: number;
  balance: number;
  transactions: Transaction[];
};

export function normalizeDateRange(start: string, end: string) {
  return start <= end ? { start, end } : { start: end, end: start };
}

export function isDateInRange(date: string, start: string, end: string) {
  return date >= start && date <= end;
}

export function summarizeSelectedRange({
  start,
  end,
  accounts,
  effectiveTransactions,
  timelineTransactions,
  dailyBalances,
  baseBalance,
  todayIso,
}: {
  start: string;
  end: string;
  accounts: Account[];
  effectiveTransactions: Transaction[];
  timelineTransactions: Transaction[];
  dailyBalances: Map<string, number>;
  baseBalance: number;
  todayIso: string;
}): SelectedRangeSummary {
  const range = normalizeDateRange(start, end);
  const transactions = timelineTransactions
    .filter((transaction) =>
      isDateInRange(transaction.date, range.start, range.end),
    )
    .sort((a, b) => a.date.localeCompare(b.date));

  const income = transactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const expense = transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const balance =
    range.end <= todayIso
      ? getTotalCurrentBalance(
          accounts,
          effectiveTransactions,
          new Date(`${range.end}T12:00:00`),
        )
      : dailyBalances.get(range.end) ??
        getProjectedBalanceThroughDate(
          baseBalance,
          timelineTransactions,
          todayIso,
          range.end,
        );

  return {
    ...range,
    days: differenceInCalendarDays(parseISO(range.end), parseISO(range.start)) + 1,
    income,
    expense,
    balance,
    transactions,
  };
}

function getProjectedBalanceThroughDate(
  baseBalance: number,
  transactions: Transaction[],
  todayIso: string,
  endIso: string,
) {
  return transactions.reduce((balance, transaction) => {
    if (transaction.date <= todayIso || transaction.date > endIso) return balance;
    if (transaction.type === "income") return balance + transaction.amount;
    if (transaction.type === "expense") return balance - transaction.amount;
    return balance;
  }, baseBalance);
}
