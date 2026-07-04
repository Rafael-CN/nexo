import { describe, expect, it } from "vitest";
import { parseNaturalEntry } from "./naturalEntry";

const TODAY = "2026-07-04";

describe("parseNaturalEntry", () => {
  it("parses title, BR amount and relative date", () => {
    expect(parseNaturalEntry("mercado 54,90 ontem", TODAY)).toEqual({
      title: "Mercado",
      amount: 54.9,
      date: "2026-07-03",
      type: "expense",
    });
  });

  it("defaults to today and expense", () => {
    expect(parseNaturalEntry("uber centro 23,50", TODAY)).toEqual({
      title: "Uber centro",
      amount: 23.5,
      date: TODAY,
      type: "expense",
    });
  });

  it("detects income via + prefix and via words", () => {
    expect(parseNaturalEntry("+ freelance 900 amanhã", TODAY)).toMatchObject({
      title: "Freelance",
      amount: 900,
      date: "2026-07-05",
      type: "income",
    });
    expect(parseNaturalEntry("salário 4.500,00", TODAY)).toMatchObject({
      amount: 4500,
      type: "income",
    });
  });

  it("accepts explicit dd/mm dates", () => {
    expect(parseNaturalEntry("aluguel 2100 05/07", TODAY)).toMatchObject({
      title: "Aluguel",
      date: "2026-07-05",
    });
    expect(parseNaturalEntry("iptu 320 10/01/2027", TODAY)).toMatchObject({
      date: "2027-01-10",
    });
  });

  it("returns null without amount or without title", () => {
    expect(parseNaturalEntry("apenas texto sem valor", TODAY)).toBeNull();
    expect(parseNaturalEntry("54,90", TODAY)).toBeNull();
    expect(parseNaturalEntry("", TODAY)).toBeNull();
  });
});
