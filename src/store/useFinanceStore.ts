import { create } from "zustand";
import type { Account, Category, Transaction } from "@/types";
import {
  mockAccounts,
  mockCategories,
  mockTransactions,
} from "@/mocks/financeData";

interface FinanceState {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];

  addTransaction: (txn: Transaction) => void;
  removeTransaction: (id: string) => void;
  updateTransaction: (id: string, patch: Partial<Transaction>) => void;
}

export const useFinanceStore = create<FinanceState>((set) => ({
  accounts: mockAccounts,
  categories: mockCategories,
  transactions: mockTransactions,

  addTransaction: (txn) =>
    set((state) => ({ transactions: [...state.transactions, txn] })),

  removeTransaction: (id) =>
    set((state) => ({
      transactions: state.transactions.filter((t) => t.id !== id),
    })),

  updateTransaction: (id, patch) =>
    set((state) => ({
      transactions: state.transactions.map((t) =>
        t.id === id ? { ...t, ...patch } : t,
      ),
    })),
}));

// ---------- Seletores nomeados ----------

export const selectTotalBalance = (s: FinanceState) =>
  s.accounts
    .filter((a) => a.type !== "credit")
    .reduce((acc, a) => acc + a.balance, 0);

export const selectCreditOutstanding = (s: FinanceState) =>
  s.accounts
    .filter((a) => a.type === "credit")
    .reduce((acc, a) => acc + Math.abs(Math.min(a.balance, 0)), 0);

export const selectAccountById = (s: FinanceState, id: string) =>
  s.accounts.find((a) => a.id === id);

export const selectCategoryById = (s: FinanceState, id: string) =>
  s.categories.find((c) => c.id === id);

export const selectUpcomingTransactions = (s: FinanceState, limit = 6) => {
  const todayIso = new Date().toISOString().slice(0, 10);
  return s.transactions
    .filter((t) => t.date >= todayIso)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, limit);
};

export const selectTransactionsByDate = (s: FinanceState, dateIso: string) =>
  s.transactions.filter((t) => t.date === dateIso);

export const selectMonthFlow = (s: FinanceState) => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const monthPrefix = `${y}-${String(m + 1).padStart(2, "0")}`;
  const inMonth = s.transactions.filter(
    (t) => t.date.startsWith(monthPrefix) && !t.isProjected,
  );
  const income = inMonth
    .filter((t) => t.type === "income")
    .reduce((a, t) => a + t.amount, 0);
  const expense = inMonth
    .filter((t) => t.type === "expense")
    .reduce((a, t) => a + t.amount, 0);
  return { income, expense, net: income - expense };
};
