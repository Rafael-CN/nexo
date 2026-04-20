import { describe, expect, it } from "vitest";
import {
  getCurrentAccountBalance,
  getCurrentAccountBalances,
  getTotalCurrentBalance,
} from "./balance";
import type { Account, Transaction } from "@/types";

const today = new Date("2026-04-20T12:00:00");

function account(overrides: Partial<Account> = {}): Account {
  return {
    id: "account-1",
    name: "Checking",
    institution: "Bank",
    type: "checking",
    balance: 1_000,
    color: "#1f77b4",
    ...overrides,
  };
}

function tx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "tx-1",
    title: "Transaction",
    amount: 100,
    date: "2026-04-20",
    accountId: "account-1",
    categoryId: "category-1",
    type: "expense",
    isProjected: false,
    ...overrides,
  };
}

describe("getCurrentAccountBalance", () => {
  it("uses base balance plus effective transactions up to today, including projected ones", () => {
    const result = getCurrentAccountBalance(
      account(),
      [
        tx({ id: "past-income", date: "2026-04-19", amount: 500, type: "income" }),
        tx({
          id: "projected-today",
          date: "2026-04-20",
          amount: 150,
          type: "expense",
          isProjected: true,
        }),
      ],
      today,
    );

    expect(result).toBe(1_350);
  });

  it("ignores future transactions, other accounts, and transfers", () => {
    const result = getCurrentAccountBalance(
      account(),
      [
        tx({ id: "future-income", date: "2026-04-21", amount: 500, type: "income" }),
        tx({ id: "other-account", accountId: "account-2", amount: 200 }),
        tx({ id: "transfer", amount: 300, type: "transfer" }),
      ],
      today,
    );

    expect(result).toBe(1_000);
  });
});

describe("getCurrentAccountBalances", () => {
  it("returns current balances by account id", () => {
    const balances = getCurrentAccountBalances(
      [
        account({ id: "checking", balance: 1_000 }),
        account({ id: "savings", balance: 2_000 }),
      ],
      [
        tx({ accountId: "checking", amount: 250, type: "income" }),
        tx({ accountId: "savings", amount: 400, type: "expense" }),
      ],
      today,
    );

    expect(balances.get("checking")).toBe(1_250);
    expect(balances.get("savings")).toBe(1_600);
  });
});

describe("getTotalCurrentBalance", () => {
  it("aggregates effective balances across accounts", () => {
    const total = getTotalCurrentBalance(
      [
        account({ id: "checking", balance: 1_000 }),
        account({ id: "cash", balance: 200 }),
      ],
      [
        tx({ accountId: "checking", amount: 100, type: "expense" }),
        tx({ accountId: "cash", amount: 50, type: "income", isProjected: true }),
        tx({ accountId: "cash", amount: 999, type: "income", date: "2026-04-21" }),
      ],
      today,
    );

    expect(total).toBe(1_150);
  });
});
