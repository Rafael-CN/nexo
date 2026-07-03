import type { Transaction } from "@/types";
import { isOfxFile, parseOfx } from "./ofx";
import { parseCsvStatement } from "./csv";
import type { StatementEntry, StatementParseResult } from "./types";

export * from "./types";
export * from "./ofx";
export * from "./csv";
export * from "./categoryMemory";

export function parseStatement(
  fileName: string,
  contents: string,
): StatementParseResult {
  if (isOfxFile(fileName, contents)) {
    return parseOfx(contents);
  }
  return parseCsvStatement(contents);
}

export interface ReviewEntry extends StatementEntry {
  /** Já existe lançamento igual (mesma conta, data, valor e tipo). */
  isDuplicate: boolean;
}

/**
 * Marca prováveis duplicatas comparando com os lançamentos já
 * registrados na conta de destino: mesma data, mesmo valor e mesmo tipo.
 */
export function markDuplicates(
  entries: StatementEntry[],
  existing: Transaction[],
  accountId: string,
): ReviewEntry[] {
  const keys = new Set(
    existing
      .filter((txn) => txn.accountId === accountId)
      .map((txn) => duplicateKey(txn.date, txn.amount, txn.type)),
  );

  return entries.map((entry) => ({
    ...entry,
    isDuplicate: keys.has(duplicateKey(entry.date, entry.amount, entry.type)),
  }));
}

function duplicateKey(date: string, amount: number, type: string) {
  return `${date}|${amount.toFixed(2)}|${type}`;
}

/**
 * Decodifica o arquivo respeitando extratos legados em ISO-8859-1
 * (comuns em OFX de bancos brasileiros).
 */
export async function readStatementFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const utf8 = new TextDecoder("utf-8").decode(buffer);
  if (!utf8.includes("�")) return utf8;
  return new TextDecoder("iso-8859-1").decode(buffer);
}
