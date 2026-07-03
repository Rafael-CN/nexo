import { describe, expect, it } from "vitest";
import { getInvoiceSummary } from "./invoice";
import type { Account, Transaction } from "@/types";

function creditAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: "card-1",
    name: "Cartão",
    institution: "Banco",
    type: "credit",
    balance: 0,
    color: "#111",
    closingDay: 10,
    dueDay: 17,
    ...overrides,
  };
}

function tx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: crypto.randomUUID(),
    title: "Compra",
    amount: 100,
    date: "2026-07-01",
    accountId: "card-1",
    categoryId: "cat-1",
    type: "expense",
    isProjected: false,
    ...overrides,
  };
}

describe("getInvoiceSummary", () => {
  it("returns null for non-credit accounts or missing closing day", () => {
    expect(
      getInvoiceSummary(creditAccount({ type: "checking" }), [], "2026-07-03"),
    ).toBeNull();
    expect(
      getInvoiceSummary(creditAccount({ closingDay: undefined }), [], "2026-07-03"),
    ).toBeNull();
  });

  it("splits open and closed cycles around the closing day", () => {
    // hoje = 03/07, fechamento dia 10: último fechamento foi 10/06
    const summary = getInvoiceSummary(
      creditAccount(),
      [
        tx({ date: "2026-06-05", amount: 200 }), // fatura fechada (11/05-10/06)
        tx({ date: "2026-06-15", amount: 80 }), // fatura aberta (11/06-10/07)
        tx({ date: "2026-07-02", amount: 40 }), // fatura aberta
        tx({ date: "2026-07-11", amount: 999 }), // ciclo seguinte, fora
      ],
      "2026-07-03",
    );

    expect(summary).not.toBeNull();
    expect(summary!.closed).toMatchObject({
      start: "2026-05-11",
      end: "2026-06-10",
      total: 200,
      dueDate: "2026-06-17",
    });
    expect(summary!.open).toMatchObject({
      start: "2026-06-11",
      end: "2026-07-10",
      total: 120,
    });
  });

  it("uses the current month closing when today is past it", () => {
    // hoje = 15/07, fechamento dia 10: último fechamento foi 10/07
    const summary = getInvoiceSummary(
      creditAccount(),
      [tx({ date: "2026-07-12", amount: 55 })],
      "2026-07-15",
    );

    expect(summary!.open.start).toBe("2026-07-11");
    expect(summary!.open.end).toBe("2026-08-10");
    expect(summary!.open.total).toBe(55);
    expect(summary!.closed.end).toBe("2026-07-10");
  });

  it("subtracts refunds and ignores transfer payments", () => {
    const summary = getInvoiceSummary(
      creditAccount(),
      [
        tx({ date: "2026-06-20", amount: 300 }),
        tx({ date: "2026-06-25", amount: 50, type: "income" }), // estorno
        tx({
          date: "2026-06-26",
          amount: 500,
          type: "transfer",
          accountId: "checking-1",
          transferAccountId: "card-1",
          categoryId: "",
        }), // pagamento
      ],
      "2026-07-03",
    );

    expect(summary!.open.total).toBe(250);
  });

  it("clamps closing day 31 on shorter months", () => {
    // hoje = 15/02, fechamento dia 31 → fechamentos em 31/01 e 28/02
    const summary = getInvoiceSummary(
      creditAccount({ closingDay: 31, dueDay: 7 }),
      [],
      "2026-02-15",
    );

    expect(summary!.open.start).toBe("2026-02-01");
    expect(summary!.open.end).toBe("2026-02-28");
    expect(summary!.closed.end).toBe("2026-01-31");
    expect(summary!.closed.dueDate).toBe("2026-02-07");
  });

  it("pushes the due date to next month when it falls before the closing", () => {
    const summary = getInvoiceSummary(
      creditAccount({ closingDay: 25, dueDay: 5 }),
      [],
      "2026-07-28",
    );

    // fechamento 25/07 → vencimento 05/08
    expect(summary!.closed.end).toBe("2026-07-25");
    expect(summary!.closed.dueDate).toBe("2026-08-05");
  });
});
