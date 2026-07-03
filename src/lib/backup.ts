import { format } from "date-fns";
import type {
  Account,
  Category,
  Goal,
  RecurrenceRule,
  Transaction,
} from "@/types";

export const BACKUP_FORMAT = "nexo-backup";
export const BACKUP_VERSION = 1;

export type BackupMode = "merge" | "replace";

export interface BackupData {
  accounts: Account[];
  categories: Category[];
  recurrenceRules: RecurrenceRule[];
  transactions: Transaction[];
  goals: Goal[];
}

export interface BackupFile {
  format: string;
  version: number;
  exportedAt: string;
  data: BackupData;
}

export interface ImportSummary {
  accounts: number;
  categories: number;
  recurrenceRules: number;
  transactions: number;
  goals: number;
  skipped: number;
}

export function buildBackupFile(data: BackupData): BackupFile {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
}

export function suggestedBackupFileName(now = new Date()) {
  return `nexo-backup-${format(now, "yyyy-MM-dd")}.json`;
}

export function suggestedCsvFileName(now = new Date()) {
  return `nexo-transacoes-${format(now, "yyyy-MM-dd")}.csv`;
}

/**
 * Validação estrutural usada no modo navegador (sem Tauri).
 * No desktop a validação forte acontece no Rust.
 */
export function parseBackupFile(json: string): BackupFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Arquivo inválido: não é um backup do Nexo.");
  }

  const candidate = parsed as Partial<BackupFile> | null;
  if (
    !candidate ||
    candidate.format !== BACKUP_FORMAT ||
    typeof candidate.version !== "number" ||
    !candidate.data ||
    !Array.isArray(candidate.data.accounts) ||
    !Array.isArray(candidate.data.categories) ||
    !Array.isArray(candidate.data.transactions)
  ) {
    throw new Error("Arquivo inválido: não é um backup do Nexo.");
  }
  if (candidate.version > BACKUP_VERSION) {
    throw new Error(
      "Este backup foi criado por uma versão mais nova do Nexo. Atualize o aplicativo.",
    );
  }

  return {
    format: candidate.format,
    version: candidate.version,
    exportedAt:
      typeof candidate.exportedAt === "string" ? candidate.exportedAt : "",
    data: {
      accounts: candidate.data.accounts,
      categories: candidate.data.categories,
      recurrenceRules: Array.isArray(candidate.data.recurrenceRules)
        ? candidate.data.recurrenceRules
        : [],
      transactions: candidate.data.transactions,
      goals: Array.isArray(candidate.data.goals) ? candidate.data.goals : [],
    },
  };
}

export function mergeBackupData(
  current: BackupData,
  incoming: BackupData,
  mode: BackupMode,
): { data: BackupData; summary: ImportSummary } {
  if (mode === "replace") {
    return {
      data: incoming,
      summary: {
        accounts: incoming.accounts.length,
        categories: incoming.categories.length,
        recurrenceRules: incoming.recurrenceRules.length,
        transactions: incoming.transactions.length,
        goals: incoming.goals.length,
        skipped: 0,
      },
    };
  }

  const summary: ImportSummary = {
    accounts: 0,
    categories: 0,
    recurrenceRules: 0,
    transactions: 0,
    goals: 0,
    skipped: 0,
  };

  function mergeList<T extends { id: string }>(
    existing: T[],
    added: T[],
    count: (n: number) => void,
  ): T[] {
    const seen = new Set(existing.map((item) => item.id));
    const fresh = added.filter((item) => !seen.has(item.id));
    summary.skipped += added.length - fresh.length;
    count(fresh.length);
    return [...existing, ...fresh];
  }

  return {
    data: {
      accounts: mergeList(current.accounts, incoming.accounts, (n) => {
        summary.accounts = n;
      }),
      categories: mergeList(current.categories, incoming.categories, (n) => {
        summary.categories = n;
      }),
      recurrenceRules: mergeList(
        current.recurrenceRules,
        incoming.recurrenceRules,
        (n) => {
          summary.recurrenceRules = n;
        },
      ),
      transactions: mergeList(current.transactions, incoming.transactions, (n) => {
        summary.transactions = n;
      }),
      goals: mergeList(current.goals, incoming.goals, (n) => {
        summary.goals = n;
      }),
    },
    summary,
  };
}

/** CSV pt-BR (separador ";" e decimal ",") — usado no modo navegador. */
export function buildTransactionsCsv(data: BackupData): string {
  const accountName = (id?: string) =>
    data.accounts.find((account) => account.id === id)?.name ?? id ?? "";
  const categoryName = (id: string) =>
    data.categories.find((category) => category.id === id)?.name ?? id;

  const rows = [...data.transactions]
    .sort(
      (a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title),
    )
    .map((txn) => {
      const kind =
        txn.type === "income"
          ? "receita"
          : txn.type === "expense"
            ? "despesa"
            : "transferencia";
      return [
        txn.date,
        txn.title,
        txn.amount.toFixed(2).replace(".", ","),
        kind,
        accountName(txn.accountId),
        txn.type === "transfer" ? accountName(txn.transferAccountId) : "",
        txn.type === "transfer" ? "" : categoryName(txn.categoryId),
        txn.recurrenceId ? "sim" : "nao",
        txn.isProjected ? "sim" : "nao",
        txn.notes ?? "",
      ]
        .map(csvEscape)
        .join(";");
    });

  return [
    "data;titulo;valor;tipo;conta;conta_destino;categoria;recorrente;projetada;notas",
    ...rows,
  ].join("\r\n");
}

function csvEscape(field: string): string {
  if (/[";\n\r]/.test(field)) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

export function downloadTextFile(
  fileName: string,
  contents: string,
  mimeType = "application/json",
) {
  const blob = new Blob([contents], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
