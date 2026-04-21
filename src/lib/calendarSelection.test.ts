import { describe, expect, it } from "vitest";
import {
  normalizeDateRange,
  summarizeSelectedRange,
} from "./calendarSelection";
import type { Account, Transaction } from "@/types";

function account(overrides: Partial<Account> = {}): Account {
  return {
    id: "account-1",
    name: "Checking",
    institution: "Bank",
    type: "checking",
    balance: 0,
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

function summarize(
  overrides: Partial<Parameters<typeof summarizeSelectedRange>[0]> = {},
) {
  const effectiveTransactions = overrides.effectiveTransactions ?? [];
  return summarizeSelectedRange({
    start: "2026-04-19",
    end: "2026-04-19",
    accounts: [account()],
    effectiveTransactions,
    timelineTransactions: effectiveTransactions,
    dailyBalances: new Map(),
    baseBalance: 0,
    todayIso: "2026-04-21",
    ...overrides,
  });
}

describe("calendar selection range helpers", () => {
  it("normalizes reversed ranges", () => {
    expect(normalizeDateRange("2026-04-25", "2026-04-19")).toEqual({
      start: "2026-04-19",
      end: "2026-04-25",
    });
  });
});

describe("summarizeSelectedRange", () => {
  it("calculates historical ending balance only through the selected date", () => {
    const summary = summarize({
      end: "2026-04-19",
      effectiveTransactions: [
        tx({ id: "after-range", date: "2026-04-20", amount: 60 }),
      ],
    });

    expect(summary.balance).toBe(0);
    expect(summary.income).toBe(0);
    expect(summary.expense).toBe(0);
    expect(summary.transactions).toEqual([]);
  });

  it("includes historical transactions through the selected range end", () => {
    const summary = summarize({
      end: "2026-04-20",
      effectiveTransactions: [
        tx({ id: "expense", date: "2026-04-20", amount: 60 }),
        tx({
          id: "income",
          date: "2026-04-19",
          amount: 25,
          type: "income",
        }),
      ],
    });

    expect(summary.balance).toBe(-35);
    expect(summary.income).toBe(25);
    expect(summary.expense).toBe(60);
    expect(summary.transactions.map((transaction) => transaction.id)).toEqual([
      "income",
      "expense",
    ]);
  });

  it("uses projected daily balance when range ends in the future", () => {
    const summary = summarize({
      start: "2026-04-22",
      end: "2026-04-24",
      baseBalance: 500,
      todayIso: "2026-04-21",
      dailyBalances: new Map([["2026-04-24", 720]]),
      timelineTransactions: [
        tx({
          id: "future-income",
          date: "2026-04-23",
          amount: 220,
          type: "income",
          isProjected: true,
        }),
      ],
    });

    expect(summary.balance).toBe(720);
    expect(summary.income).toBe(220);
    expect(summary.expense).toBe(0);
  });

  it("falls back to known future timeline transactions when no daily checkpoint exists", () => {
    const summary = summarize({
      start: "2026-04-22",
      end: "2026-04-30",
      baseBalance: 500,
      todayIso: "2026-04-21",
      timelineTransactions: [
        tx({ id: "future-expense", date: "2026-04-25", amount: 80 }),
        tx({
          id: "future-income",
          date: "2026-04-28",
          amount: 40,
          type: "income",
        }),
      ],
    });

    expect(summary.balance).toBe(460);
  });
});
