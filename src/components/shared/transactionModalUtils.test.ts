import { describe, expect, it } from "vitest";
import {
  buildTransactionForm,
  filterTransactionCategories,
  getDefaultTransactionAccountId,
} from "./transactionModalUtils";
import type { Account, Category, Transaction } from "@/types";

function account(id: string): Account {
  return {
    id,
    name: id,
    institution: "Bank",
    type: "checking",
    balance: 0,
    color: "#000000",
  };
}

function transaction(id: string, date: string, accountId: string): Transaction {
  return {
    id,
    title: id,
    amount: 10,
    date,
    accountId,
    categoryId: "cat-1",
    type: "expense",
    isProjected: false,
  };
}

describe("transactionModalUtils", () => {
  it("prefers the latest transaction account when creating", () => {
    const accounts = [account("acc-1"), account("acc-2")];
    const transactions = [
      transaction("t-1", "2025-04-02", "acc-1"),
      transaction("t-2", "2025-04-21", "acc-2"),
      transaction("t-3", "2025-04-21", "acc-1"),
    ];

    expect(getDefaultTransactionAccountId(accounts, transactions)).toBe("acc-1");
  });

  it("falls back to the last account when no transaction is available", () => {
    const accounts = [account("acc-1"), account("acc-2")];

    expect(getDefaultTransactionAccountId(accounts, [])).toBe("acc-2");
  });

  it("builds a blank form with the provided defaults", () => {
    const form = buildTransactionForm(null, null, "2025-04-21", "acc-2");

    expect(form).toMatchObject({
      type: "expense",
      date: "2025-04-21",
      accountId: "acc-2",
      categoryId: "",
      recurrenceFrequency: "none",
    });
  });

  it("filters categories by type and query", () => {
    const categories: Category[] = [
      {
        id: "c-1",
        name: "Moradia",
        color: "#fff",
        icon: "home",
        kind: "expense",
      },
      {
        id: "c-2",
        name: "Salário",
        color: "#fff",
        icon: "briefcase",
        kind: "income",
      },
      {
        id: "c-3",
        name: "Mercado",
        color: "#fff",
        icon: "shopping-cart",
        kind: "expense",
      },
    ];

    expect(filterTransactionCategories(categories, "expense", "mer")).toEqual([
      categories[2],
    ]);
  });
});

