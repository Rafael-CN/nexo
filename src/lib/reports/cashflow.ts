import { eachDayOfInterval, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Transaction } from "@/types";
import {
  getPreviousPeriod,
  isWithinReportPeriod,
  type ReportPeriod,
} from "./period";

export type CashFlowSummary = {
  income: number;
  expense: number;
  net: number;
  count: number;
  projectedCount: number;
  recurringCount: number;
  savingsRate: number | null;
};

export type CashFlowComparison = {
  previous: CashFlowSummary;
  incomeDelta: number;
  expenseDelta: number;
  netDelta: number;
  incomeDeltaPct: number | null;
  expenseDeltaPct: number | null;
  netDeltaPct: number | null;
};

export type CashflowPoint = {
  date: string;
  label: string;
  income: number;
  expense: number;
  net: number;
  runningNet: number;
};

export function filterTransactionsByPeriod(
  transactions: Transaction[],
  period: Pick<ReportPeriod, "startIso" | "endIso">,
) {
  return transactions.filter((transaction) =>
    isWithinReportPeriod(transaction.date, period),
  );
}

export function summarizePeriodCashFlow(
  transactions: Transaction[],
  period: Pick<ReportPeriod, "startIso" | "endIso">,
): CashFlowSummary {
  const inPeriod = filterTransactionsByPeriod(transactions, period).filter(
    (transaction) => transaction.type !== "transfer",
  );
  const income = inPeriod
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const expense = inPeriod
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  return {
    income,
    expense,
    net: income - expense,
    count: inPeriod.length,
    projectedCount: inPeriod.filter((transaction) => transaction.isProjected)
      .length,
    recurringCount: inPeriod.filter((transaction) => transaction.recurrenceId)
      .length,
    savingsRate: income > 0 ? (income - expense) / income : null,
  };
}

export function compareCashFlow(
  transactions: Transaction[],
  period: ReportPeriod,
): CashFlowComparison {
  const current = summarizePeriodCashFlow(transactions, period);
  const previous = summarizePeriodCashFlow(
    transactions,
    getPreviousPeriod(period),
  );

  return {
    previous,
    incomeDelta: current.income - previous.income,
    expenseDelta: current.expense - previous.expense,
    netDelta: current.net - previous.net,
    incomeDeltaPct: percentChange(current.income, previous.income),
    expenseDeltaPct: percentChange(current.expense, previous.expense),
    netDeltaPct: percentChange(current.net, previous.net),
  };
}

export function buildCashflowSeries(
  transactions: Transaction[],
  period: Pick<ReportPeriod, "startIso" | "endIso">,
): CashflowPoint[] {
  const byDate = new Map<string, { income: number; expense: number }>();

  for (const transaction of filterTransactionsByPeriod(transactions, period)) {
    if (transaction.type === "transfer") continue;
    const entry = byDate.get(transaction.date) ?? { income: 0, expense: 0 };
    if (transaction.type === "income") entry.income += transaction.amount;
    if (transaction.type === "expense") entry.expense += transaction.amount;
    byDate.set(transaction.date, entry);
  }

  let runningNet = 0;
  return eachDayOfInterval({
    start: parseISO(period.startIso),
    end: parseISO(period.endIso),
  }).map((date) => {
    const iso = format(date, "yyyy-MM-dd");
    const entry = byDate.get(iso) ?? { income: 0, expense: 0 };
    const net = entry.income - entry.expense;
    runningNet += net;
    return {
      date: iso,
      label: format(date, "dd MMM", { locale: ptBR }),
      income: entry.income,
      expense: entry.expense,
      net,
      runningNet,
    };
  });
}

function percentChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null;
  return (current - previous) / Math.abs(previous);
}
