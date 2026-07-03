import type { StatementEntry, StatementParseResult } from "./types";

/**
 * Parser tolerante de OFX (SGML ou XML) — extrai os blocos STMTTRN.
 * Bancos brasileiros variam bastante: tags sem fechamento, datas com
 * timezone ([-3:BRT]) e valores com vírgula são todos aceitos.
 */
export function parseOfx(contents: string): StatementParseResult {
  const blocks = contents.match(/<STMTTRN>[\s\S]*?(?=<\/STMTTRN>|<STMTTRN>|<\/BANKTRANLIST>|$)/gi) ?? [];
  const entries: StatementEntry[] = [];
  let skipped = 0;

  for (const block of blocks) {
    const date = parseOfxDate(tagValue(block, "DTPOSTED"));
    const amount = parseOfxAmount(tagValue(block, "TRNAMT"));
    const memo = tagValue(block, "MEMO");
    const name = tagValue(block, "NAME");
    const externalId = tagValue(block, "FITID");
    const title = decodeOfxText(memo || name).trim();

    if (!date || amount === null || amount === 0 || !title) {
      skipped += 1;
      continue;
    }

    entries.push({
      date,
      title,
      amount: Math.abs(amount),
      type: amount > 0 ? "income" : "expense",
      externalId: externalId || undefined,
    });
  }

  return { entries, skipped };
}

export function isOfxFile(fileName: string, contents: string) {
  return (
    /\.ofx$/i.test(fileName) ||
    /<OFX>/i.test(contents) ||
    /OFXHEADER/i.test(contents)
  );
}

function tagValue(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}>([^<\\r\\n]*)`, "i"));
  return match ? match[1].trim() : "";
}

function parseOfxDate(raw: string): string | null {
  const digits = raw.replace(/[^0-9]/g, "").slice(0, 8);
  if (digits.length !== 8) return null;

  const year = Number(digits.slice(0, 4));
  const month = Number(digits.slice(4, 6));
  const day = Number(digits.slice(6, 8));
  if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

function parseOfxAmount(raw: string): number | null {
  if (!raw) return null;
  const normalized = raw.replace(",", ".");
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : null;
}

/** Alguns bancos escapam acentos como entidades HTML no MEMO. */
function decodeOfxText(text: string): string {
  return text
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}
