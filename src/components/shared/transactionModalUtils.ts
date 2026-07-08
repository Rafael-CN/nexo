import { addMonths, format, parseISO } from "date-fns";
import { currencyFormatter } from "@/lib/format";
import type {
  Account,
  Category,
  RecurrenceRule,
  Transaction,
  TransactionType,
} from "@/types";

export const MAX_INSTALLMENTS = 48;

export interface TransactionModalFormState {
  type: TransactionType;
  title: string;
  amount: string;
  date: string;
  accountId: string;
  categoryId: string;
  transferAccountId: string;
  installments: string;
  notes: string;
  recurrenceFrequency: RecurrenceRule["frequency"] | "none";
  recurrenceInterval: string;
  recurrenceNoEnd: boolean;
  recurrenceUntil: string;
}

export function formatCurrencyInputValue(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";

  return currencyFormatter.format(Number(digits) / 100);
}

export function formatTransactionAmount(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "";

  return currencyFormatter.format(value);
}

/**
 * Converte o texto do CurrencyInput em número — ou null quando vazio.
 * Nunca retorna NaN: NaN vira null no JSON do IPC e explode no serde
 * do Tauri ("invalid type: null, expected f64").
 */
export function parseCurrencyInputValue(value: string): number | null {
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;

  const parsed = Number(digits) / 100;
  return Number.isFinite(parsed) ? parsed : null;
}

export function getDefaultTransactionAccountId(
  accounts: Account[],
  transactions: Transaction[],
) {
  // Reservas (fora do saldo) não devem ser o default de um lançamento comum.
  const preferred = accounts.filter(
    (account) => !account.archived && !account.excludedFromTotal,
  );
  const pool = preferred.length > 0 ? preferred : accounts;
  const poolIds = new Set(pool.map((account) => account.id));
  const candidates = transactions.filter((transaction) =>
    poolIds.has(transaction.accountId),
  );

  const latestTransaction = candidates.reduce<{
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
  if (transactionAccountId && poolIds.has(transactionAccountId)) {
    return transactionAccountId;
  }

  return pool[pool.length - 1]?.id ?? "";
}

export function buildTransactionForm(
  transaction?: Transaction | null,
  rule?: RecurrenceRule | null,
  initialDate?: string,
  defaultAccountId = "",
  defaultType: TransactionType = "expense",
): TransactionModalFormState {
  return {
    type: transaction?.type ?? defaultType,
    title: transaction?.title ?? "",
    amount: transaction ? formatTransactionAmount(transaction.amount) : "",
    date: transaction?.date ?? initialDate ?? format(new Date(), "yyyy-MM-dd"),
    accountId: transaction?.accountId ?? defaultAccountId,
    categoryId: transaction?.categoryId ?? "",
    transferAccountId: transaction?.transferAccountId ?? "",
    installments: "1",
    notes: transaction?.notes ?? "",
    recurrenceFrequency: rule?.frequency ?? "none",
    recurrenceInterval: rule ? String(rule.interval) : "1",
    recurrenceNoEnd: !rule?.until,
    recurrenceUntil: rule?.until ?? "",
  };
}

export function parseInstallmentCount(value: string): number {
  const count = Number.parseInt(value, 10);
  if (!Number.isFinite(count) || count < 1) return 1;
  return Math.min(count, MAX_INSTALLMENTS);
}

/**
 * Gera as N parcelas mensais de uma compra: títulos "(k/N)", datas
 * avançando mês a mês (dia 31 é ajustado em meses curtos) e um
 * installmentId compartilhado para a série.
 */
export function buildInstallmentTransactions(
  base: Omit<Transaction, "id" | "installmentId">,
  count: number,
  todayIso = format(new Date(), "yyyy-MM-dd"),
): Transaction[] {
  const installmentId = crypto.randomUUID();
  const firstDate = parseISO(base.date);

  return Array.from({ length: count }, (_, index) => {
    const date = format(addMonths(firstDate, index), "yyyy-MM-dd");
    return {
      ...base,
      id: crypto.randomUUID(),
      title: `${base.title} (${index + 1}/${count})`,
      date,
      isProjected: date > todayIso,
      installmentId,
    };
  });
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
