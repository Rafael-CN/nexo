import { format } from "date-fns";
import type {
  Account,
  Category,
  RecurrenceRule,
  Transaction,
  TransactionType,
} from "@/types";

export interface TransactionModalFormState {
  type: TransactionType;
  title: string;
  amount: string;
  date: string;
  accountId: string;
  categoryId: string;
  recurrenceFrequency: RecurrenceRule["frequency"] | "none";
  recurrenceInterval: string;
  recurrenceNoEnd: boolean;
  recurrenceUntil: string;
}

const brlCurrencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatCurrencyInputValue(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";

  return brlCurrencyFormatter.format(Number(digits) / 100);
}

export function formatTransactionAmount(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "";

  return brlCurrencyFormatter.format(value);
}

export function parseCurrencyInputValue(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return Number.NaN;

  return Number(digits) / 100;
}

export function getDefaultTransactionAccountId(
  accounts: Account[],
  transactions: Transaction[],
) {
  const latestTransaction = transactions.reduce<{
    transaction: Transaction | null;
    index: number;
  }>(
    (current, transaction, index) => {
      if (!current.transaction) {
        return { transaction, index };
      }

      if (transaction.date > current.transaction.date) {
        return { transaction, index };
      }

      if (transaction.date === current.transaction.date && index > current.index) {
        return { transaction, index };
      }

      return current;
    },
    { transaction: null, index: -1 },
  );

  const transactionAccountId = latestTransaction.transaction?.accountId;
  if (transactionAccountId && accounts.some((account) => account.id === transactionAccountId)) {
    return transactionAccountId;
  }

  return accounts[accounts.length - 1]?.id ?? "";
}

export function buildTransactionForm(
  transaction?: Transaction | null,
  rule?: RecurrenceRule | null,
  initialDate?: string,
  defaultAccountId = "",
  defaultType: TransactionType = "expense",
): TransactionModalFormState {
  return {
    type: transaction?.type === "income" ? "income" : defaultType,
    title: transaction?.title ?? "",
    amount: transaction ? formatTransactionAmount(transaction.amount) : "",
    date: transaction?.date ?? initialDate ?? format(new Date(), "yyyy-MM-dd"),
    accountId: transaction?.accountId ?? defaultAccountId,
    categoryId: transaction?.categoryId ?? "",
    recurrenceFrequency: rule?.frequency ?? "none",
    recurrenceInterval: rule ? String(rule.interval) : "1",
    recurrenceNoEnd: !rule?.until,
    recurrenceUntil: rule?.until ?? "",
  };
}

export function filterTransactionCategories(
  categories: Category[],
  type: TransactionType,
  query: string,
) {
  const normalized = query.trim().toLowerCase();
  const kind = type === "income" ? "income" : "expense";

  return categories
    .filter(
      (category) =>
        category.kind === kind &&
        (normalized === "" ||
          category.name.toLowerCase().includes(normalized) ||
          category.icon.toLowerCase().includes(normalized)),
    )
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}
