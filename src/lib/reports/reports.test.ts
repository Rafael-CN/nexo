import { describe, expect, it } from "vitest";
import {
  aggregateTransactionsByCategory,
  buildCashflowSeries,
  compareCashFlow,
  generateReportInsights,
  getPreviousPeriod,
  resolveReportPeriod,
  summarizePeriodCashFlow,
} from "@/lib/reports";
import type { Category, Transaction } from "@/types";

const categories: Category[] = [
  {
    id: "salary",
    name: "Salário",
    color: "#22c55e",
    icon: "briefcase",
    kind: "income",
  },
  {
    id: "food",
    name: "Alimentação",
    color: "#f97316",
    icon: "utensils",
    kind: "expense",
  },
  {
    id: "transport",
    name: "Transporte",
    color: "#0ea5e9",
    icon: "car",
    kind: "expense",
  },
];

const transactions: Transaction[] = [
  tx("jan-salary", "Salário", 5000, "2026-01-05", "income", "salary"),
  tx("jan-food", "Mercado", 1000, "2026-01-10", "expense", "food"),
  tx("jan-transport", "Combustível", 400, "2026-01-20", "expense", "transport"),
  tx("feb-salary", "Salário", 5000, "2026-02-05", "income", "salary"),
  tx("feb-food-1", "Mercado", 1500, "2026-02-10", "expense", "food"),
  tx("feb-food-2", "Restaurante", 500, "2026-02-18", "expense", "food", {
    recurrenceId: "food-rule",
  }),
  tx("feb-transport", "Transporte", 350, "2026-02-20", "expense", "transport", {
    isProjected: true,
  }),
];

describe("reports", () => {
  it("resolves current and previous periods with explicit today", () => {
    const period = resolveReportPeriod("current-month", "2026-02-15");
    const previous = getPreviousPeriod(period);

    expect(period).toMatchObject({
      startIso: "2026-02-01",
      endIso: "2026-02-28",
    });
    expect(previous).toMatchObject({
      startIso: "2026-01-04",
      endIso: "2026-01-31",
    });
  });

  it("summarizes period cash flow and counts projected/recurring rows", () => {
    const period = resolveReportPeriod("current-month", "2026-02-15");
    const summary = summarizePeriodCashFlow(transactions, period);

    expect(summary.income).toBe(5000);
    expect(summary.expense).toBe(2350);
    expect(summary.net).toBe(2650);
    expect(summary.projectedCount).toBe(1);
    expect(summary.recurringCount).toBe(1);
    expect(summary.savingsRate).toBeCloseTo(0.53);
  });

  it("compares cash flow with the previous period", () => {
    const period = resolveReportPeriod("current-month", "2026-02-15");
    const comparison = compareCashFlow(transactions, period);

    expect(comparison.previous.expense).toBe(1400);
    expect(comparison.expenseDelta).toBe(950);
    expect(comparison.incomeDeltaPct).toBe(0);
  });

  it("aggregates expense transactions by category", () => {
    const period = resolveReportPeriod("current-month", "2026-02-15");
    const previousPeriod = resolveReportPeriod("last-month", "2026-02-15");
    const ranking = aggregateTransactionsByCategory({
      transactions,
      categories,
      period,
      previousPeriod,
      kind: "expense",
    });

    expect(ranking[0]).toMatchObject({
      categoryId: "food",
      total: 2000,
      previousTotal: 1000,
      count: 2,
      recurringTotal: 500,
    });
    expect(ranking[0].percentage).toBeCloseTo(2000 / 2350);
  });

  it("builds a daily cashflow series", () => {
    const series = buildCashflowSeries(transactions, {
      startIso: "2026-02-04",
      endIso: "2026-02-06",
    });

    expect(series).toHaveLength(3);
    expect(series[1]).toMatchObject({
      date: "2026-02-05",
      income: 5000,
      expense: 0,
      net: 5000,
      runningNet: 5000,
    });
  });

  it("generates actionable report insights", () => {
    const insights = generateReportInsights({
      transactions,
      categories,
      period: resolveReportPeriod("current-month", "2026-02-15"),
    });

    expect(insights.some((insight) => insight.id === "concentrated-category")).toBe(
      true,
    );
    expect(insights.some((insight) => insight.id.startsWith("category-increase"))).toBe(
      true,
    );
  });
});

function tx(
  id: string,
  title: string,
  amount: number,
  date: string,
  type: Transaction["type"],
  categoryId: string,
  patch: Partial<Transaction> = {},
): Transaction {
  return {
    id,
    title,
    amount,
    date,
    accountId: "account",
    categoryId,
    type,
    isProjected: false,
    ...patch,
  };
}
