import { create } from "zustand";
import type { Account, Category, Transaction } from "@/types";
import {
  mockAccounts,
  mockCategories,
  mockTransactions,
} from "@/mocks/financeData";
import { db, isTauri } from "@/lib/db";

interface FinanceState {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  isLoaded: boolean;

  initialize: () => Promise<void>;
  addTransaction: (txn: Transaction) => Promise<void>;
  removeTransaction: (id: string) => Promise<void>;
  updateTransaction: (id: string, patch: Partial<Transaction>) => Promise<void>;
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  accounts: [],
  categories: [],
  transactions: [],
  isLoaded: false,

  initialize: async () => {
    if (isTauri) {
      const [accounts, categories, transactions] = await Promise.all([
        db.getAccounts(),
        db.getCategories(),
        db.getTransactions(),
      ]);
      set({ accounts, categories, transactions, isLoaded: true });
    } else {
      set({
        accounts: mockAccounts,
        categories: mockCategories,
        transactions: mockTransactions,
        isLoaded: true,
      });
    }
  },

  addTransaction: async (txn) => {
    set((state) => ({ transactions: [...state.transactions, txn] }));
    if (isTauri) await db.addTransaction(txn);
  },

  removeTransaction: async (id) => {
    set((state) => ({
      transactions: state.transactions.filter((t) => t.id !== id),
    }));
    if (isTauri) await db.deleteTransaction(id);
  },

  updateTransaction: async (id, patch) => {
    const existing = get().transactions.find((t) => t.id === id);
    if (!existing) return;
    const merged = { ...existing, ...patch };
    set((state) => ({
      transactions: state.transactions.map((t) => (t.id === id ? merged : t)),
    }));
    if (isTauri) await db.updateTransaction(merged);
  },
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
