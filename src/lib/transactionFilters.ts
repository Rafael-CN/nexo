import type { Transaction } from "@/types";

export type TransactionTypeFilter =
  | "all"
  | "income"
  | "expense"
  | "transfer"
  | "projected"
  | "recurring";

export type TransactionSort = "date-desc" | "date-asc" | "amount-desc" | "amount-asc";

export type TransactionFilters = {
  query: string;
  type: TransactionTypeFilter;
  startDate: string;
  endDate: string;
  sort: TransactionSort;
};

export type TransactionTotals = {
  income: number;
  expense: number;
  net: number;
  count: number;
};

export function filterTransactions(
  transactions: Transaction[],
  filters: TransactionFilters,
) {
  const query = normalize(filters.query);

  return transactions.filter((transaction) => {
    if (query && !normalize(transaction.title).includes(query)) return false;
    if (filters.startDate && transaction.date < filters.startDate) return false;
    if (filters.endDate && transaction.date > filters.endDate) return false;

    switch (filters.type) {
      case "income":
      case "expense":
      case "transfer":
        return transaction.type === filters.type;
      case "projected":
        return transaction.isProjected;
      case "recurring":
        return !!transaction.recurrenceId;
      case "all":
        return true;
    }
  });
}

export function sortTransactions(
  transactions: Transaction[],
  sort: TransactionSort,
) {
  return [...transactions].sort((a, b) => {
    switch (sort) {
      case "date-asc":
        return a.date.localeCompare(b.date) || a.title.localeCompare(b.title);
      case "amount-desc":
        return b.amount - a.amount || b.date.localeCompare(a.date);
      case "amount-asc":
        return a.amount - b.amount || b.date.localeCompare(a.date);
      case "date-desc":
        return b.date.localeCompare(a.date) || a.title.localeCompare(b.title);
    }
  });
}

export function groupTransactionsByDate(transactions: Transaction[]) {
  const grouped = new Map<string, Transaction[]>();
  for (const transaction of transactions) {
    const list = grouped.get(transaction.date) ?? [];
    list.push(transaction);
    grouped.set(transaction.date, list);
  }
  return Array.from(grouped.entries());
}

export function calculateTransactionTotals(
  transactions: Transaction[],
): TransactionTotals {
  const income = transactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const expense = transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  return {
    income,
    expense,
    net: income - expense,
    count: transactions.length,
  };
}

export function hasActiveTransactionFilters(filters: TransactionFilters) {
  return (
    filters.query.trim() !== "" ||
    filters.type !== "all" ||
    filters.startDate !== "" ||
    filters.endDate !== ""
  );
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}
