import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  computeDailyBalances,
  expandRecurring,
  findOverdueRecurrences,
} from "./projection";
import type { RecurrenceRule, Transaction } from "@/types";

const fixedToday = new Date("2026-04-20T12:00:00");

function tx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "tx-1",
    title: "Transaction",
    amount: 100,
    date: "2026-04-21",
    accountId: "account-1",
    categoryId: "category-1",
    type: "expense",
    isProjected: false,
    ...overrides,
  };
}

function rule(overrides: Partial<RecurrenceRule> = {}): RecurrenceRule {
  return {
    id: "rule-1",
    frequency: "monthly",
    interval: 1,
    ...overrides,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(fixedToday);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("findOverdueRecurrences", () => {
  it("lists occurrences between the anchor and today that were never materialized", () => {
    const overdue = findOverdueRecurrences(
      [tx({ date: "2026-02-10", recurrenceId: "rule-1" })],
      [rule()],
      "2026-04-20",
    );

    expect(overdue.map((t) => t.date)).toEqual(["2026-03-10", "2026-04-10"]);
    expect(overdue.every((t) => !t.isProjected)).toBe(true);
    expect(overdue[0].id).toBe("rule-1_due_2026-03-10");
  });

  it("respects the rule end date and returns nothing when up to date", () => {
    expect(
      findOverdueRecurrences(
        [tx({ date: "2026-02-10", recurrenceId: "rule-1" })],
        [rule({ until: "2026-03-01" })],
        "2026-04-20",
      ),
    ).toHaveLength(0);

    expect(
      findOverdueRecurrences(
        [tx({ date: "2026-04-10", recurrenceId: "rule-1" })],
        [rule()],
        "2026-04-20",
      ),
    ).toHaveLength(0);
  });
});

describe("expandRecurring", () => {
  it("expands monthly recurrence from the latest occurrence through the horizon", () => {
    const expanded = expandRecurring(
      [tx({ date: "2026-04-10", recurrenceId: "rule-1" })],
      [rule()],
      70,
    );

    expect(expanded.map((t) => t.date)).toEqual([
      "2026-05-10",
      "2026-06-10",
    ]);
    expect(expanded.every((t) => t.isProjected)).toBe(true);
    expect(expanded.map((t) => t.id)).toEqual([
      "rule-1_exp_2026-05-10",
      "rule-1_exp_2026-06-10",
    ]);
  });

  it("expands weekly recurrence and respects the horizon", () => {
    const expanded = expandRecurring(
      [tx({ date: "2026-04-21", recurrenceId: "weekly-paycheck", type: "income" })],
      [rule({ id: "weekly-paycheck", frequency: "weekly", interval: 1 })],
      15,
    );

    expect(expanded.map((t) => t.date)).toEqual([
      "2026-04-28",
      "2026-05-05",
    ]);
    expect(expanded.map((t) => t.type)).toEqual(["income", "income"]);
  });

  it("stops expansion at the rule until date", () => {
    const expanded = expandRecurring(
      [tx({ date: "2026-04-21", recurrenceId: "rule-1" })],
      [rule({ frequency: "weekly", until: "2026-05-05" })],
      30,
    );

    expect(expanded.map((t) => t.date)).toEqual([
      "2026-04-28",
      "2026-05-05",
    ]);
  });

  it("does not emit past occurrences when the anchor is old", () => {
    const expanded = expandRecurring(
      [tx({ date: "2026-04-01", recurrenceId: "rule-1" })],
      [rule({ frequency: "weekly" })],
      20,
    );

    expect(expanded.map((t) => t.date)).toEqual([
      "2026-04-22",
      "2026-04-29",
      "2026-05-06",
    ]);
  });

  it("uses an existing future projection as the anchor to avoid duplicates", () => {
    const expanded = expandRecurring(
      [
        tx({ id: "real", date: "2026-04-10", recurrenceId: "rule-1" }),
        tx({
          id: "projected",
          date: "2026-05-10",
          recurrenceId: "rule-1",
          isProjected: true,
        }),
      ],
      [rule()],
      70,
    );

    expect(expanded.map((t) => t.date)).toEqual(["2026-06-10"]);
  });
});

describe("computeDailyBalances", () => {
  it("walks forward from tomorrow and accumulates income and expenses", () => {
    const balances = computeDailyBalances(
      1_000,
      [
        tx({ date: "2026-04-21", amount: 250, type: "income" }),
        tx({ date: "2026-04-22", amount: 80, type: "expense" }),
      ],
      3,
    );

    expect([...balances.entries()]).toEqual([
      ["2026-04-21", 1_250],
      ["2026-04-22", 1_170],
      ["2026-04-23", 1_170],
    ]);
  });

  it("ignores transfers, past transactions, today, and transactions beyond the horizon", () => {
    const balances = computeDailyBalances(
      500,
      [
        tx({ date: "2026-04-19", amount: 300, type: "income" }),
        tx({ date: "2026-04-20", amount: 300, type: "income" }),
        tx({ date: "2026-04-21", amount: 300, type: "transfer" }),
        tx({ date: "2026-04-23", amount: 300, type: "expense" }),
      ],
      2,
    );

    expect([...balances.entries()]).toEqual([
      ["2026-04-21", 500],
      ["2026-04-22", 500],
    ]);
  });

  it("keeps already projected future transactions in the balance path", () => {
    const balances = computeDailyBalances(
      200,
      [tx({ date: "2026-04-21", amount: 50, type: "expense", isProjected: true })],
      1,
    );

    expect(balances.get("2026-04-21")).toBe(150);
  });

  it("accumulates expanded monthly recurrence in the future balance path", () => {
    const recurring = expandRecurring(
      [tx({ date: "2026-04-10", amount: 300, recurrenceId: "rent" })],
      [rule({ id: "rent", frequency: "monthly" })],
      35,
    );

    const balances = computeDailyBalances(2_000, recurring, 35);

    expect(balances.get("2026-05-09")).toBe(2_000);
    expect(balances.get("2026-05-10")).toBe(1_700);
  });

  it("keeps daily, weekly, and monthly checkpoints consistent on one projection path", () => {
    const balances = computeDailyBalances(
      1_000,
      [
        tx({ date: "2026-04-21", amount: 50, type: "expense" }),
        tx({ date: "2026-04-27", amount: 400, type: "income" }),
        tx({ date: "2026-05-20", amount: 250, type: "expense" }),
      ],
      31,
    );

    expect(balances.get("2026-04-21")).toBe(950);
    expect(balances.get("2026-04-27")).toBe(1_350);
    expect(balances.get("2026-05-20")).toBe(1_100);
  });
});
