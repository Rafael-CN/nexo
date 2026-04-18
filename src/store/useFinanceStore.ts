import { create } from "zustand";
import type { Account, Category, Goal, RecurrenceRule, Transaction } from "@/types";
import {
  mockAccounts,
  mockCategories,
  mockGoals,
  mockRecurrenceRules,
  mockTransactions,
} from "@/mocks/financeData";

interface FinanceState {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  goals: Goal[];
  recurrenceRules: RecurrenceRule[];

  addTransaction: (txn: Transaction) => void;
  removeTransaction: (id: string) => void;
  updateTransaction: (id: string, patch: Partial<Transaction>) => void;

  addGoal: (goal: Goal) => void;
  removeGoal: (id: string) => void;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
}

export const useFinanceStore = create<FinanceState>((set) => ({
  accounts: mockAccounts,
  categories: mockCategories,
  transactions: mockTransactions,
  goals: mockGoals,
  recurrenceRules: mockRecurrenceRules,

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

  addGoal: (goal) =>
    set((state) => ({ goals: [...state.goals, goal] })),

  removeGoal: (id) =>
    set((state) => ({ goals: state.goals.filter((g) => g.id !== id) })),

  updateGoal: (id, patch) =>
    set((state) => ({
      goals: state.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)),
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

export const selectGoalsSummary = (s: FinanceState) => {
  const active = s.goals.filter((g) => g.status === "active");
  const totalCurrent = active.reduce((a, g) => a + g.currentAmount, 0);
  const totalTarget = active.reduce((a, g) => a + g.targetAmount, 0);
  return { totalCurrent, totalTarget, count: active.length };
};
