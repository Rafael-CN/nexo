import { describe, expect, it } from "vitest";
import {
  calculateTransactionTotals,
  filterTransactions,
  groupTransactionsByDate,
  hasActiveTransactionFilters,
  sortTransactions,
  type TransactionFilters,
} from "./transactionFilters";
import type { Transaction } from "@/types";

const defaultFilters: TransactionFilters = {
  query: "",
  type: "all",
  startDate: "",
  endDate: "",
  sort: "date-desc",
};

function tx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "tx-1",
    title: "Alimentação",
    amount: 100,
    date: "2026-04-20",
    accountId: "account-1",
    categoryId: "category-1",
    type: "expense",
    isProjected: false,
    ...overrides,
  };
}

describe("transaction filters", () => {
  it("filters transfers by type and keeps them out of income/expense totals", () => {
    const transactions = [
      tx({ id: "expense", type: "expense", amount: 100 }),
      tx({ id: "income", type: "income", amount: 400 }),
      tx({
        id: "transfer",
        type: "transfer",
        amount: 250,
        transferAccountId: "account-2",
        categoryId: "",
      }),
    ];

    const transfersOnly = filterTransactions(transactions, {
      ...defaultFilters,
      type: "transfer",
    });
    expect(transfersOnly.map((transaction) => transaction.id)).toEqual([
      "transfer",
    ]);

    const totals = calculateTransactionTotals(transactions);
    expect(totals.income).toBe(400);
    expect(totals.expense).toBe(100);
    expect(totals.net).toBe(300);
    expect(totals.count).toBe(3);
  });

  it("matches text without requiring accents", () => {
    const result = filterTransactions(
      [
        tx({ id: "food", title: "Alimentação" }),
        tx({ id: "fuel", title: "Combustível" }),
      ],
      { ...defaultFilters, query: "alimentacao" },
    );

    expect(result.map((transaction) => transaction.id)).toEqual(["food"]);
  });

  it("filters by type, projected state, recurrence and date range", () => {
    const transactions = [
      tx({ id: "income", type: "income", date: "2026-04-20" }),
      tx({ id: "projected", isProjected: true, date: "2026-04-23" }),
      tx({ id: "recurring", recurrenceId: "rule-1", date: "2026-04-24" }),
      tx({ id: "outside", date: "2026-05-01" }),
    ];

    expect(
      filterTransactions(transactions, {
        ...defaultFilters,
        type: "projected",
      }).map((transaction) => transaction.id),
    ).toEqual(["projected"]);

    expect(
      filterTransactions(transactions, {
        ...defaultFilters,
        type: "recurring",
      }).map((transaction) => transaction.id),
    ).toEqual(["recurring"]);

    expect(
      filterTransactions(transactions, {
        ...defaultFilters,
        startDate: "2026-04-21",
        endDate: "2026-04-30",
      }).map((transaction) => transaction.id),
    ).toEqual(["projected", "recurring"]);
  });

  it("sorts by date and amount", () => {
    const transactions = [
      tx({ id: "small", amount: 10, date: "2026-04-21" }),
      tx({ id: "large", amount: 500, date: "2026-04-20" }),
    ];

    expect(
      sortTransactions(transactions, "date-desc").map(
        (transaction) => transaction.id,
      ),
    ).toEqual(["small", "large"]);

    expect(
      sortTransactions(transactions, "amount-desc").map(
        (transaction) => transaction.id,
      ),
    ).toEqual(["large", "small"]);
  });

  it("groups by date and calculates totals", () => {
    const transactions = [
      tx({ id: "expense", amount: 80, date: "2026-04-20" }),
      tx({ id: "income", amount: 200, type: "income", date: "2026-04-20" }),
      tx({ id: "other-day", amount: 30, date: "2026-04-19" }),
    ];

    expect(groupTransactionsByDate(transactions)).toHaveLength(2);
    expect(calculateTransactionTotals(transactions)).toEqual({
      income: 200,
      expense: 110,
      net: 90,
      count: 3,
    });
  });

  it("detects active filters", () => {
    expect(hasActiveTransactionFilters(defaultFilters)).toBe(false);
    expect(
      hasActiveTransactionFilters({ ...defaultFilters, query: "salario" }),
    ).toBe(true);
  });
});
