import type { Category, Transaction } from "@/types";
import { filterTransactionsByPeriod } from "./cashflow";
import { getPreviousPeriod, type ReportPeriod } from "./period";

export type CategoryReportItem = {
  categoryId: string;
  name: string;
  color: string;
  icon: string;
  kind: Category["kind"];
  total: number;
  previousTotal: number;
  delta: number;
  deltaPct: number | null;
  percentage: number;
  count: number;
  recurringTotal: number;
  projectedTotal: number;
};

export function aggregateTransactionsByCategory({
  transactions,
  categories,
  period,
  previousPeriod = getPreviousPeriod(period as ReportPeriod),
  kind = "expense",
}: {
  transactions: Transaction[];
  categories: Category[];
  period: Pick<ReportPeriod, "startIso" | "endIso">;
  previousPeriod?: Pick<ReportPeriod, "startIso" | "endIso">;
  kind?: Category["kind"];
}): CategoryReportItem[] {
  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const currentRows = filterTransactionsByPeriod(transactions, period).filter(
    (transaction) => transaction.type === kind,
  );
  const previousRows = filterTransactionsByPeriod(
    transactions,
    previousPeriod,
  ).filter((transaction) => transaction.type === kind);
  const total = currentRows.reduce((sum, transaction) => sum + transaction.amount, 0);
  const grouped = new Map<string, CategoryReportItem>();

  for (const transaction of currentRows) {
    const category = categoryMap.get(transaction.categoryId);
    const id = category?.id ?? "uncategorized";
    const existing = grouped.get(id) ?? buildCategoryItem(id, category, kind);

    existing.total += transaction.amount;
    existing.count += 1;
    if (transaction.recurrenceId) existing.recurringTotal += transaction.amount;
    if (transaction.isProjected) existing.projectedTotal += transaction.amount;
    grouped.set(id, existing);
  }

  const previousTotals = new Map<string, number>();
  for (const transaction of previousRows) {
    previousTotals.set(
      transaction.categoryId,
      (previousTotals.get(transaction.categoryId) ?? 0) + transaction.amount,
    );
  }

  return Array.from(grouped.values())
    .map((item) => {
      const previousTotal = previousTotals.get(item.categoryId) ?? 0;
      const delta = item.total - previousTotal;
      return {
        ...item,
        previousTotal,
        delta,
        deltaPct: percentChange(item.total, previousTotal),
        percentage: total > 0 ? item.total / total : 0,
      };
    })
    .sort((a, b) => b.total - a.total);
}

function buildCategoryItem(
  id: string,
  category: Category | undefined,
  kind: Category["kind"],
): CategoryReportItem {
  return {
    categoryId: id,
    name: category?.name ?? "Sem categoria",
    color: category?.color ?? "#71717a",
    icon: category?.icon ?? "tag",
    kind,
    total: 0,
    previousTotal: 0,
    delta: 0,
    deltaPct: null,
    percentage: 0,
    count: 0,
    recurringTotal: 0,
    projectedTotal: 0,
  };
}

function percentChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null;
  return (current - previous) / Math.abs(previous);
}
