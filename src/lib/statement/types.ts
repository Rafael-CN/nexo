export interface StatementEntry {
  /** ISO yyyy-MM-dd */
  date: string;
  title: string;
  /** Valor absoluto. */
  amount: number;
  type: "income" | "expense";
  /** FITID do OFX, quando disponível. */
  externalId?: string;
}

export interface StatementParseResult {
  entries: StatementEntry[];
  /** Linhas/blocos que não puderam ser interpretados. */
  skipped: number;
}
