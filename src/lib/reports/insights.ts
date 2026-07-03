import type { Category, Transaction } from "@/types";
import type { ReportPeriod } from "./period";
import { aggregateTransactionsByCategory } from "./categories";
import { compareCashFlow, summarizePeriodCashFlow } from "./cashflow";

export type ReportInsight = {
  id: string;
  tone: "success" | "warning" | "danger" | "neutral";
  title: string;
  description: string;
  value?: string;
  actionLabel?: string;
};

export function generateReportInsights({
  transactions,
  categories,
  period,
}: {
  transactions: Transaction[];
  categories: Category[];
  period: ReportPeriod;
}): ReportInsight[] {
  const summary = summarizePeriodCashFlow(transactions, period);
  const comparison = compareCashFlow(transactions, period);
  const expenseRanking = aggregateTransactionsByCategory({
    transactions,
    categories,
    period,
    kind: "expense",
  });
  const insights: ReportInsight[] = [];
  const topCategory = expenseRanking[0];
  const monthlyPreset =
    period.preset === "current-month" || period.preset === "last-month";
  const overBudget = monthlyPreset
    ? expenseRanking.find(
        (item) =>
          item.monthlyBudget !== null && item.total > item.monthlyBudget,
      )
    : undefined;

  if (overBudget && overBudget.monthlyBudget !== null) {
    insights.push({
      id: `over-budget-${overBudget.categoryId}`,
      tone: "danger",
      title: `${overBudget.name} estourou o orçamento`,
      description: "O gasto do mês passou do limite definido para a categoria.",
      value: formatPercent(overBudget.total / overBudget.monthlyBudget),
      actionLabel: "Rever categoria",
    });
  }

  const strongestIncrease = expenseRanking.find(
    (item) => item.previousTotal > 0 && item.deltaPct !== null && item.deltaPct >= 0.2,
  );
  const recurringExpense = expenseRanking.reduce(
    (sum, item) => sum + item.recurringTotal,
    0,
  );

  if (summary.net < 0) {
    insights.push({
      id: "negative-net",
      tone: "danger",
      title: "Período no vermelho",
      description: "As saídas superaram as entradas no período selecionado.",
      value: formatPercent(Math.abs(summary.net / Math.max(summary.income, 1))),
      actionLabel: "Revisar maiores gastos",
    });
  } else if (summary.savingsRate !== null && summary.savingsRate >= 0.2) {
    insights.push({
      id: "healthy-savings-rate",
      tone: "success",
      title: "Boa capacidade de poupar",
      description: "O período mantém uma folga relevante entre entradas e saídas.",
      value: formatPercent(summary.savingsRate),
    });
  }

  if (topCategory && topCategory.percentage >= 0.35) {
    insights.push({
      id: "concentrated-category",
      tone: "warning",
      title: `${topCategory.name} concentra o gasto`,
      description: "Uma categoria representa uma fatia alta das despesas do período.",
      value: formatPercent(topCategory.percentage),
      actionLabel: "Abrir composição",
    });
  }

  if (strongestIncrease) {
    insights.push({
      id: `category-increase-${strongestIncrease.categoryId}`,
      tone: "warning",
      title: `${strongestIncrease.name} subiu no período`,
      description: "Esta categoria cresceu acima do período anterior.",
      value: formatPercent(strongestIncrease.deltaPct ?? 0),
      actionLabel: "Comparar transações",
    });
  }

  if (summary.expense > 0 && recurringExpense / summary.expense >= 0.45) {
    insights.push({
      id: "recurring-pressure",
      tone: "neutral",
      title: "Recorrências pesam no caixa",
      description: "Quase metade ou mais das saídas está ligada a recorrências.",
      value: formatPercent(recurringExpense / summary.expense),
      actionLabel: "Ver recorrentes",
    });
  }

  if (comparison.expenseDeltaPct !== null && comparison.expenseDeltaPct <= -0.15) {
    insights.push({
      id: "expense-improved",
      tone: "success",
      title: "Despesas em queda",
      description: "Você reduziu as saídas em relação ao período anterior.",
      value: formatPercent(Math.abs(comparison.expenseDeltaPct)),
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: "stable-period",
      tone: "neutral",
      title: "Sem desvios relevantes",
      description: "Os dados do período ainda não mostram pressões ou mudanças fortes.",
    });
  }

  return insights.slice(0, 4);
}

export function formatPercent(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
    style: "percent",
  }).format(value);
}
