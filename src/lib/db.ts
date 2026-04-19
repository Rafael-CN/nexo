import { invoke } from "@tauri-apps/api/core";
import type { Account, Category, Transaction } from "@/types";

export const isTauri =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export const db = {
  getAccounts: () => invoke<Account[]>("get_accounts"),
  getCategories: () => invoke<Category[]>("get_categories"),
  getTransactions: () => invoke<Transaction[]>("get_transactions"),
  addTransaction: (txn: Transaction) => invoke<void>("add_transaction", { txn }),
  updateTransaction: (txn: Transaction) =>
    invoke<void>("update_transaction", { txn }),
  deleteTransaction: (id: string) =>
    invoke<void>("delete_transaction", { id }),
};
