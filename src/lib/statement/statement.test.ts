import { describe, expect, it } from "vitest";
import { parseOfx } from "./ofx";
import { parseBrAmount, parseBrDate, parseCsvStatement } from "./csv";
import { markDuplicates, parseStatement } from "./index";
import type { Transaction } from "@/types";

const SAMPLE_OFX = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
CHARSET:1252

<OFX>
<BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260615120000[-3:BRT]
<TRNAMT>-54.90
<FITID>2026061501
<MEMO>UBER TRIP 8842
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260616
<TRNAMT>1200,00
<FITID>2026061602
<NAME>TED RECEBIDA EMPRESA X
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>invalid
<TRNAMT>-10.00
<MEMO>linha quebrada
</STMTTRN>
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1>
</OFX>`;

describe("parseOfx", () => {
  it("extracts debit and credit entries with normalized dates", () => {
    const result = parseOfx(SAMPLE_OFX);

    expect(result.entries).toHaveLength(2);
    expect(result.skipped).toBe(1);

    expect(result.entries[0]).toMatchObject({
      date: "2026-06-15",
      title: "UBER TRIP 8842",
      amount: 54.9,
      type: "expense",
      externalId: "2026061501",
    });
    expect(result.entries[1]).toMatchObject({
      date: "2026-06-16",
      title: "TED RECEBIDA EMPRESA X",
      amount: 1200,
      type: "income",
    });
  });
});

describe("parseCsvStatement", () => {
  it("parses a semicolon bank export with BR dates and amounts", () => {
    const csv = [
      "Data;Histórico;Valor",
      "15/06/2026;PIX RESTAURANTE;-89,50",
      '16/06/2026;"SALARIO; EMPRESA";4.500,00',
      "linha;invalida;abc",
    ].join("\r\n");

    const result = parseCsvStatement(csv);

    expect(result.entries).toHaveLength(2);
    expect(result.skipped).toBe(1);
    expect(result.entries[0]).toMatchObject({
      date: "2026-06-15",
      title: "PIX RESTAURANTE",
      amount: 89.5,
      type: "expense",
    });
    expect(result.entries[1]).toMatchObject({
      date: "2026-06-16",
      title: "SALARIO; EMPRESA",
      amount: 4500,
      type: "income",
    });
  });

  it("parses comma-separated files without header", () => {
    const csv = ["2026-06-20,Compra mercado,-120.35", "2026-06-21,Reembolso,45.00"].join(
      "\n",
    );

    const result = parseCsvStatement(csv);

    expect(result.entries).toHaveLength(2);
    expect(result.entries[0].date).toBe("2026-06-20");
    expect(result.entries[0].type).toBe("expense");
    expect(result.entries[1].type).toBe("income");
  });

  it("understands BR and US numbers, currency prefix and parentheses", () => {
    expect(parseBrAmount("1.234,56")).toBe(1234.56);
    expect(parseBrAmount("-1,234.56")).toBe(-1234.56);
    expect(parseBrAmount("R$ 99,90")).toBe(99.9);
    expect(parseBrAmount("(54,90)")).toBe(-54.9);
    expect(parseBrAmount("abc")).toBeNull();
  });

  it("understands common date formats", () => {
    expect(parseBrDate("05/07/2026")).toBe("2026-07-05");
    expect(parseBrDate("5/7/26")).toBe("2026-07-05");
    expect(parseBrDate("2026-07-05")).toBe("2026-07-05");
    expect(parseBrDate("32/13/2026")).toBeNull();
  });
});

describe("parseStatement", () => {
  it("routes by file type", () => {
    expect(parseStatement("extrato.ofx", SAMPLE_OFX).entries).toHaveLength(2);
    expect(
      parseStatement("extrato.csv", "Data;Descrição;Valor\n01/06/2026;Teste;-10,00")
        .entries,
    ).toHaveLength(1);
  });
});

describe("markDuplicates", () => {
  it("flags entries matching account, date, amount and type", () => {
    const existing: Transaction[] = [
      {
        id: "tx-1",
        title: "Uber",
        amount: 54.9,
        date: "2026-06-15",
        accountId: "acc-1",
        categoryId: "cat-1",
        type: "expense",
        isProjected: false,
      },
    ];

    const entries = markDuplicates(
      [
        { date: "2026-06-15", title: "UBER TRIP", amount: 54.9, type: "expense" },
        { date: "2026-06-16", title: "UBER TRIP", amount: 54.9, type: "expense" },
      ],
      existing,
      "acc-1",
    );

    expect(entries[0].isDuplicate).toBe(true);
    expect(entries[1].isDuplicate).toBe(false);

    const otherAccount = markDuplicates(entries, existing, "acc-2");
    expect(otherAccount[0].isDuplicate).toBe(false);
  });
});
