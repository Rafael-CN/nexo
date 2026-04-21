import { create } from "zustand";
import { format } from "date-fns";
import type {
  Account,
  Category,
  Goal,
  RecurrenceRule,
  Transaction,
} from "@/types";
import {
  getCurrentAccountBalance,
  getCurrentAccountBalances,
  getTotalCurrentBalance,
} from "@/lib/balance";
import { db, isTauri } from "@/lib/db";

export interface FinanceState {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  goals: Goal[];
  recurrenceRules: RecurrenceRule[];
  isInitializing: boolean;
  initializeError: string | null;
  isLoaded: boolean;

  initialize: () => Promise<void>;
  addAccount: (account: Account) => Promise<void>;
  removeAccount: (id: string) => Promise<void>;
  updateAccount: (id: string, patch: Partial<Account>) => Promise<void>;
  addCategory: (category: Category) => Promise<void>;
  removeCategory: (id: string) => Promise<void>;
  updateCategory: (id: string, patch: Partial<Category>) => Promise<void>;
  addTransaction: (txn: Transaction) => Promise<void>;
  removeTransaction: (id: string) => Promise<void>;
  updateTransaction: (id: string, patch: Partial<Transaction>) => Promise<void>;
  addRecurrenceRule: (rule: RecurrenceRule) => Promise<void>;
  removeRecurrenceRule: (id: string) => Promise<void>;
  updateRecurrenceRule: (
    id: string,
    patch: Partial<RecurrenceRule>,
  ) => Promise<void>;

  addGoal: (goal: Goal) => Promise<void>;
  removeGoal: (id: string) => Promise<void>;
  updateGoal: (id: string, patch: Partial<Goal>) => Promise<void>;
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  accounts: [],
  categories: [],
  transactions: [],
  goals: [],
  recurrenceRules: [],
  isInitializing: false,
  initializeError: null,
  isLoaded: false,

  initialize: async () => {
    if (get().isInitializing) return;

    set({ isInitializing: true, initializeError: null });

    try {
      if (isTauri) {
        const [accounts, categories, transactions, goals, recurrenceRules] =
          await Promise.all([
            db.getAccounts(),
            db.getCategories(),
            db.getTransactions(),
            db.getGoals(),
            db.getRecurrenceRules(),
          ]);
        set({
          accounts,
          categories,
          transactions,
          goals,
          recurrenceRules,
          isInitializing: false,
          initializeError: null,
          isLoaded: true,
        });
      } else {
        set({
          accounts: [],
          categories: [],
          transactions: [],
          goals: [],
          recurrenceRules: [],
          isInitializing: false,
          initializeError: null,
          isLoaded: true,
        });
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : "Não foi possível carregar seus dados financeiros.";

      set({
        isInitializing: false,
        initializeError: message,
        isLoaded: false,
      });
    }
  },

  addAccount: async (account) => {
    if (isTauri) await db.addAccount(account);
    set((state) => ({ accounts: [...state.accounts, account] }));
  },

  removeAccount: async (id) => {
    if (isTauri) await db.deleteAccount(id);
    set((state) => ({ accounts: state.accounts.filter((a) => a.id !== id) }));
  },

  updateAccount: async (id, patch) => {
    const existing = get().accounts.find((a) => a.id === id);
    if (!existing) return;
    const merged = { ...existing, ...patch };
    if (isTauri) await db.updateAccount(merged);
    set((state) => ({
      accounts: state.accounts.map((a) => (a.id === id ? merged : a)),
    }));
  },

  addCategory: async (category) => {
    if (isTauri) await db.addCategory(category);
    set((state) => ({ categories: [...state.categories, category] }));
  },

  removeCategory: async (id) => {
    if (isTauri) await db.deleteCategory(id);
    set((state) => ({
      categories: state.categories.filter((c) => c.id !== id),
    }));
  },

  updateCategory: async (id, patch) => {
    const existing = get().categories.find((c) => c.id === id);
    if (!existing) return;
    const merged = { ...existing, ...patch };
    if (isTauri) await db.updateCategory(merged);
    set((state) => ({
      categories: state.categories.map((c) => (c.id === id ? merged : c)),
    }));
  },

  addTransaction: async (txn) => {
    if (isTauri) await db.addTransaction(txn);
    set((state) => ({ transactions: [...state.transactions, txn] }));
  },

  removeTransaction: async (id) => {
    if (isTauri) await db.deleteTransaction(id);
    set((state) => ({
      transactions: state.transactions.filter((t) => t.id !== id),
    }));
  },

  updateTransaction: async (id, patch) => {
    const existing = get().transactions.find((t) => t.id === id);
    if (!existing) return;
    const merged = { ...existing, ...patch };
    if (isTauri) await db.updateTransaction(merged);
    set((state) => ({
      transactions: state.transactions.map((t) => (t.id === id ? merged : t)),
    }));
  },

  addRecurrenceRule: async (rule) => {
    if (isTauri) await db.addRecurrenceRule(rule);
    set((state) => ({ recurrenceRules: [...state.recurrenceRules, rule] }));
  },

  removeRecurrenceRule: async (id) => {
    if (isTauri) await db.deleteRecurrenceRule(id);
    set((state) => ({
      recurrenceRules: state.recurrenceRules.filter((r) => r.id !== id),
    }));
  },

  updateRecurrenceRule: async (id, patch) => {
    const existing = get().recurrenceRules.find((r) => r.id === id);
    if (!existing) return;
    const merged = { ...existing, ...patch };
    if (isTauri) await db.updateRecurrenceRule(merged);
    set((state) => ({
      recurrenceRules: state.recurrenceRules.map((r) =>
        r.id === id ? merged : r,
      ),
    }));
  },

  addGoal: async (goal) => {
    if (isTauri) await db.addGoal(goal);
    set((state) => ({ goals: [...state.goals, goal] }));
  },

  removeGoal: async (id) => {
    if (isTauri) await db.deleteGoal(id);
    set((state) => ({ goals: state.goals.filter((g) => g.id !== id) }));
  },

  updateGoal: async (id, patch) => {
    const existing = get().goals.find((g) => g.id === id);
    if (!existing) return;
    const merged = { ...existing, ...patch };
    if (isTauri) await db.updateGoal(merged);
    set((state) => ({
      goals: state.goals.map((g) => (g.id === id ? merged : g)),
    }));
  },
}));

// ---------- Seletores nomeados ----------

export const getTodayIso = () => format(new Date(), "yyyy-MM-dd");

export function calculateAccountBalance(
  account: Account,
  transactions: Transaction[],
  dateIso = getTodayIso(),
) {
  return getCurrentAccountBalance(
    account,
    transactions,
    new Date(`${dateIso}T12:00:00`),
  );
}

export const selectEffectiveAccountBalances = (s: FinanceState) =>
  getCurrentAccountBalances(s.accounts, s.transactions);

export const selectEffectiveAccountBalance = (
  s: FinanceState,
  accountId: string,
) => {
  const account = s.accounts.find((a) => a.id === accountId);
  if (!account) return 0;
  return calculateAccountBalance(account, s.transactions);
};

export const selectTotalBalance = (s: FinanceState) =>
  getTotalCurrentBalance(s.accounts, s.transactions);

export const selectCreditOutstanding = (s: FinanceState) =>
  s.accounts
    .filter((a) => a.type === "credit")
    .reduce(
      (acc, account) =>
        acc +
        Math.abs(
          Math.min(calculateAccountBalance(account, s.transactions), 0),
        ),
      0,
    );

export const selectAccountById = (s: FinanceState, id: string) =>
  s.accounts.find((a) => a.id === id);

export const selectCategoryById = (s: FinanceState, id: string) =>
  s.categories.find((c) => c.id === id);

export const selectUpcomingTransactions = (s: FinanceState, limit = 6) => {
  const todayIso = getTodayIso();
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
  const todayIso = getTodayIso();
  const inMonth = s.transactions.filter(
    (t) => t.date.startsWith(monthPrefix) && t.date <= todayIso,
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
