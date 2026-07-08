import { describe, expect, it } from "vitest";
import {
  buildInstallmentTransactions,
  buildTransactionForm,
  filterTransactionCategories,
  formatCurrencyInputValue,
  getDefaultTransactionAccountId,
  parseCurrencyInputValue,
  parseInstallmentCount,
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

  it("keeps transfer type and destination when editing a transfer", () => {
    const form = buildTransactionForm({
      ...transaction("t-1", "2025-04-21", "acc-1"),
      type: "transfer",
      categoryId: "",
      transferAccountId: "acc-2",
    });

    expect(form.type).toBe("transfer");
    expect(form.transferAccountId).toBe("acc-2");
    expect(form.categoryId).toBe("");
  });

  it("honors the default type when creating", () => {
    const form = buildTransactionForm(null, null, undefined, "acc-1", "transfer");

    expect(form.type).toBe("transfer");
    expect(form.transferAccountId).toBe("");
  });

  it("formats currency while typing from cents", () => {
    expect(formatCurrencyInputValue("1")).toContain("0,01");
    expect(formatCurrencyInputValue("123456")).toContain("1.234,56");
  });

  it("parses formatted currency back to a number", () => {
    expect(parseCurrencyInputValue("R$ 1.234,56")).toBe(1234.56);
  });

  it("skips reserve accounts when picking the default account", () => {
    const accounts = [
      { id: "reserva", excludedFromTotal: true },
      { id: "corrente" },
    ] as Account[];
    const txns = [
      transaction("t-1", "2025-04-20", "corrente"),
      transaction("t-2", "2025-04-25", "reserva"),
    ];

    // Último lançamento foi na reserva, mas o default deve ficar na corrente.
    expect(getDefaultTransactionAccountId(accounts, txns)).toBe("corrente");
    // Só reservas: usa o que houver.
    expect(
      getDefaultTransactionAccountId([accounts[0]], []),
    ).toBe("reserva");
  });

  it("returns null (never NaN) for empty or non-numeric input", () => {
    // NaN viraria null no JSON do IPC e o serde do Tauri rejeitaria.
    expect(parseCurrencyInputValue("")).toBeNull();
    expect(parseCurrencyInputValue("R$ ")).toBeNull();
    expect(parseCurrencyInputValue("abc")).toBeNull();
  });

  it("formats existing transaction amounts for editing", () => {
    const form = buildTransactionForm(transaction("t-1", "2025-04-21", "acc-1"));

    expect(form.amount).toContain("10,00");
  });

  it("builds a monthly installment series with shared id and clamped dates", () => {
    const series = buildInstallmentTransactions(
      {
        title: "Notebook",
        amount: 250,
        date: "2026-01-31",
        accountId: "card-1",
        categoryId: "cat-1",
        type: "expense",
        isProjected: false,
      },
      3,
      "2026-02-10",
    );

    expect(series).toHaveLength(3);
    expect(series.map((txn) => txn.title)).toEqual([
      "Notebook (1/3)",
      "Notebook (2/3)",
      "Notebook (3/3)",
    ]);
    // dia 31 ajustado nos meses curtos
    expect(series.map((txn) => txn.date)).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
    ]);
    // mesma série, ids distintos, projeção pela data
    const ids = new Set(series.map((txn) => txn.installmentId));
    expect(ids.size).toBe(1);
    expect(new Set(series.map((txn) => txn.id)).size).toBe(3);
    expect(series.map((txn) => txn.isProjected)).toEqual([false, true, true]);
  });

  it("clamps the installment count", () => {
    expect(parseInstallmentCount("0")).toBe(1);
    expect(parseInstallmentCount("abc")).toBe(1);
    expect(parseInstallmentCount("12")).toBe(12);
    expect(parseInstallmentCount("999")).toBe(48);
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
