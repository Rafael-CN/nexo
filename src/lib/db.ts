import { invoke } from "@tauri-apps/api/core";
import type {
  Account,
  Category,
  Goal,
  RecurrenceRule,
  Transaction,
} from "@/types";

export const isTauri =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export const db = {
  getAccounts: () => invoke<Account[]>("get_accounts"),
  getCategories: () => invoke<Category[]>("get_categories"),
  addAccount: (account: Account) => invoke<void>("add_account", { account }),
  updateAccount: (account: Account) =>
    invoke<void>("update_account", { account }),
  deleteAccount: (id: string) => invoke<void>("delete_account", { id }),
  addCategory: (category: Category) =>
    invoke<void>("add_category", { category }),
  updateCategory: (category: Category) =>
    invoke<void>("update_category", { category }),
  deleteCategory: (id: string) => invoke<void>("delete_category", { id }),
  getTransactions: () => invoke<Transaction[]>("get_transactions"),
  addTransaction: (txn: Transaction) => invoke<void>("add_transaction", { txn }),
  updateTransaction: (txn: Transaction) =>
    invoke<void>("update_transaction", { txn }),
  deleteTransaction: (id: string) =>
    invoke<void>("delete_transaction", { id }),
  getRecurrenceRules: () => invoke<RecurrenceRule[]>("get_recurrence_rules"),
  addRecurrenceRule: (rule: RecurrenceRule) =>
    invoke<void>("add_recurrence_rule", { rule }),
  updateRecurrenceRule: (rule: RecurrenceRule) =>
    invoke<void>("update_recurrence_rule", { rule }),
  deleteRecurrenceRule: (id: string) =>
    invoke<void>("delete_recurrence_rule", { id }),
  getGoals: () => invoke<Goal[]>("get_goals"),
  addGoal: (goal: Goal) => invoke<void>("add_goal", { goal }),
  updateGoal: (goal: Goal) => invoke<void>("update_goal", { goal }),
  deleteGoal: (id: string) => invoke<void>("delete_goal", { id }),
};
