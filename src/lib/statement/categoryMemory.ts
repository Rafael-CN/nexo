const STORAGE_KEY = "nexo.categoryMemory.v1";
const MAX_ENTRIES = 500;

type MemoryMap = Record<string, string>;

/**
 * Memória local de categorização: título normalizado → categoria.
 * Alimentada a cada importação confirmada, para que o mesmo
 * estabelecimento venha pré-categorizado da próxima vez.
 */
export function normalizeStatementTitle(title: string): string {
  return title
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\d+/g, "")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function suggestCategory(title: string): string | undefined {
  const key = normalizeStatementTitle(title);
  if (!key) return undefined;
  return readMemory()[key];
}

export function rememberCategory(title: string, categoryId: string) {
  const key = normalizeStatementTitle(title);
  if (!key || !categoryId) return;

  const memory = readMemory();
  memory[key] = categoryId;

  const entries = Object.entries(memory);
  const trimmed =
    entries.length > MAX_ENTRIES ? entries.slice(entries.length - MAX_ENTRIES) : entries;

  writeMemory(Object.fromEntries(trimmed));
}

/** Remove referências a uma categoria excluída. */
export function forgetCategory(categoryId: string) {
  const memory = readMemory();
  const next = Object.fromEntries(
    Object.entries(memory).filter(([, value]) => value !== categoryId),
  );
  writeMemory(next);
}

function readMemory(): MemoryMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as MemoryMap;
    }
    return {};
  } catch {
    return {};
  }
}

function writeMemory(memory: MemoryMap) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
  } catch {
    // localStorage cheio ou indisponível: a memória é só conveniência.
  }
}
