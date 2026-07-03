import type { StatementEntry, StatementParseResult } from "./types";

/**
 * Parser de CSV bancário com heurísticas:
 * - separador detectado entre ; , e tab;
 * - colunas de data, valor e descrição inferidas pelo conteúdo
 *   (com preferência para nomes conhecidos no cabeçalho);
 * - datas dd/mm/aaaa e ISO; valores "1.234,56", "-1234.56" e "(54,90)".
 */
export function parseCsvStatement(contents: string): StatementParseResult {
  const rows = parseCsvRows(contents);
  if (rows.length === 0) return { entries: [], skipped: 0 };

  const hasHeader = looksLikeHeader(rows[0]);
  const header = hasHeader ? rows[0].map((cell) => normalizeHeader(cell)) : [];
  const dataRows = hasHeader ? rows.slice(1) : rows;
  if (dataRows.length === 0) return { entries: [], skipped: 0 };

  const columnCount = Math.max(...dataRows.map((row) => row.length));
  const dateColumn = pickColumn(
    header,
    ["data", "date", "dt", "data lancamento", "data de lancamento"],
    dataRows,
    columnCount,
    (cell) => parseBrDate(cell) !== null,
  );
  const amountColumn = pickColumn(
    header,
    ["valor", "amount", "value", "quantia", "valor (r$)"],
    dataRows,
    columnCount,
    (cell) => parseBrAmount(cell) !== null,
    dateColumn,
  );

  if (dateColumn === -1 || amountColumn === -1) {
    return { entries: [], skipped: dataRows.length };
  }

  const titleColumn = pickTitleColumn(
    header,
    dataRows,
    columnCount,
    dateColumn,
    amountColumn,
  );

  const entries: StatementEntry[] = [];
  let skipped = 0;

  for (const row of dataRows) {
    const date = parseBrDate(row[dateColumn] ?? "");
    const amount = parseBrAmount(row[amountColumn] ?? "");
    const title = (row[titleColumn] ?? "").trim();

    if (!date || amount === null || amount === 0 || !title) {
      skipped += 1;
      continue;
    }

    entries.push({
      date,
      title,
      amount: Math.abs(amount),
      type: amount > 0 ? "income" : "expense",
    });
  }

  return { entries, skipped };
}

export function parseCsvRows(contents: string): string[][] {
  const text = contents.replace(/^\uFEFF/, "");
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field);
      field = "";
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }

  row.push(field);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);

  return rows;
}

function detectDelimiter(text: string): string {
  const firstLines = text.split(/\r?\n/, 5).join("\n");
  const candidates: Array<[string, number]> = [
    [";", countOutsideQuotes(firstLines, ";")],
    [",", countOutsideQuotes(firstLines, ",")],
    ["\t", countOutsideQuotes(firstLines, "\t")],
  ];
  candidates.sort((a, b) => b[1] - a[1]);
  return candidates[0][1] > 0 ? candidates[0][0] : ";";
}

function countOutsideQuotes(text: string, char: string): number {
  let count = 0;
  let inQuotes = false;
  for (const current of text) {
    if (current === '"') inQuotes = !inQuotes;
    else if (current === char && !inQuotes) count += 1;
  }
  return count;
}

function looksLikeHeader(row: string[]): boolean {
  return row.every(
    (cell) => parseBrDate(cell) === null && parseBrAmount(cell) === null,
  );
}

function normalizeHeader(cell: string): string {
  return cell
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function pickColumn(
  header: string[],
  knownNames: string[],
  rows: string[][],
  columnCount: number,
  matches: (cell: string) => boolean,
  exclude = -1,
): number {
  const byName = header.findIndex(
    (name, index) => index !== exclude && knownNames.includes(name),
  );
  if (byName !== -1) return byName;

  let best = -1;
  let bestRate = 0;
  for (let column = 0; column < columnCount; column += 1) {
    if (column === exclude) continue;
    const filled = rows.filter((row) => (row[column] ?? "").trim() !== "");
    if (filled.length === 0) continue;
    const rate =
      filled.filter((row) => matches(row[column] ?? "")).length / filled.length;
    if (rate > bestRate && rate >= 0.8) {
      bestRate = rate;
      best = column;
    }
  }
  return best;
}

function pickTitleColumn(
  header: string[],
  rows: string[][],
  columnCount: number,
  dateColumn: number,
  amountColumn: number,
): number {
  const knownNames = [
    "descricao",
    "description",
    "historico",
    "memo",
    "titulo",
    "lancamento",
    "estabelecimento",
    "identificador",
  ];
  const byName = header.findIndex(
    (name, index) =>
      index !== dateColumn && index !== amountColumn && knownNames.includes(name),
  );
  if (byName !== -1) return byName;

  let best = -1;
  let bestLength = -1;
  for (let column = 0; column < columnCount; column += 1) {
    if (column === dateColumn || column === amountColumn) continue;
    const totalLength = rows.reduce(
      (sum, row) => sum + (row[column] ?? "").trim().length,
      0,
    );
    if (totalLength > bestLength) {
      bestLength = totalLength;
      best = column;
    }
  }
  return best;
}

export function parseBrDate(raw: string): string | null {
  const cell = raw.trim();

  const iso = cell.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return validateDate(iso[1], iso[2], iso[3]);
  }

  const br = cell.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}(?:\d{2})?)$/);
  if (br) {
    const year = br[3].length === 2 ? `20${br[3]}` : br[3];
    return validateDate(year, br[2].padStart(2, "0"), br[1].padStart(2, "0"));
  }

  return null;
}

function validateDate(year: string, month: string, day: string): string | null {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (y < 1900 || y > 2200 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${year}-${month}-${day}`;
}

export function parseBrAmount(raw: string): number | null {
  let cell = raw.trim();
  if (!cell) return null;

  let negative = false;
  if (/^\(.*\)$/.test(cell)) {
    negative = true;
    cell = cell.slice(1, -1);
  }

  cell = cell.replace(/R\$\s?/i, "").replace(/\s/g, "");
  if (cell.startsWith("-")) {
    negative = true;
    cell = cell.slice(1);
  } else if (cell.startsWith("+")) {
    cell = cell.slice(1);
  }

  if (!/^[\d.,]+$/.test(cell) || !/\d/.test(cell)) return null;

  const lastComma = cell.lastIndexOf(",");
  const lastDot = cell.lastIndexOf(".");
  if (lastComma > lastDot) {
    // formato brasileiro: 1.234,56
    cell = cell.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > lastComma) {
    // formato americano: 1,234.56
    cell = cell.replace(/,/g, "");
  }

  const value = Number.parseFloat(cell);
  if (!Number.isFinite(value)) return null;
  return negative ? -value : value;
}
