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

  it("ignores future transactions, other accounts, and destination-less transfers", () => {
    const result = getCurrentAccountBalance(
      account(),
      [
        tx({ id: "future-income", date: "2026-04-21", amount: 500, type: "income" }),
        tx({ id: "other-account", accountId: "account-2", amount: 200 }),
        tx({ id: "legacy-transfer", amount: 300, type: "transfer" }),
      ],
      today,
    );

    expect(result).toBe(1_000);
  });

  it("debits the source and credits the destination of a transfer", () => {
    const transactions = [
      tx({
        id: "transfer",
        amount: 300,
        type: "transfer",
        accountId: "account-1",
        transferAccountId: "account-2",
        categoryId: "",
      }),
    ];

    expect(
      getCurrentAccountBalance(account({ id: "account-1" }), transactions, today),
    ).toBe(700);
    expect(
      getCurrentAccountBalance(
        account({ id: "account-2", balance: 50 }),
        transactions,
        today,
      ),
    ).toBe(350);
    expect(
      getCurrentAccountBalance(
        account({ id: "account-3", balance: 10 }),
        transactions,
        today,
      ),
    ).toBe(10);
  });

  it("keeps the total balance unchanged by transfers", () => {
    const accounts = [
      account({ id: "account-1", balance: 1_000 }),
      account({ id: "account-2", balance: 500 }),
    ];
    const total = getTotalCurrentBalance(
      accounts,
      [
        tx({
          id: "transfer",
          amount: 250,
          type: "transfer",
          accountId: "account-1",
          transferAccountId: "account-2",
          categoryId: "",
        }),
      ],
      today,
    );

    expect(total).toBe(1_500);
  });

  it("ignores future transfers", () => {
    const result = getCurrentAccountBalance(
      account({ id: "account-2", balance: 100 }),
      [
        tx({
          id: "future-transfer",
          amount: 300,
          type: "transfer",
          accountId: "account-1",
          transferAccountId: "account-2",
          date: "2026-04-25",
          categoryId: "",
        }),
      ],
      today,
    );

    expect(result).toBe(100);
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

describe("contas fora do saldo efetivo", () => {
  it("ignora contas com excludedFromTotal e arquivadas no total", () => {
    const accounts = [
      account({ id: "a-1", balance: 1000 }),
      account({ id: "reserva", balance: 5000, excludedFromTotal: true }),
      account({ id: "arquivada", balance: 200, archived: true }),
    ];

    expect(getTotalCurrentBalance(accounts, [])).toBe(1000);
  });

  it("transferência para reserva reduz o total (sai do pool contado)", () => {
    const accounts = [
      account({ id: "a-1", balance: 1000 }),
      account({ id: "reserva", balance: 0, excludedFromTotal: true }),
    ];
    const txns = [
      tx({
        id: "aporte",
        type: "transfer",
        amount: 300,
        accountId: "a-1",
        transferAccountId: "reserva",
        date: "2020-01-02",
      }),
    ];

    expect(getTotalCurrentBalance(accounts, txns)).toBe(700);
  });
});
