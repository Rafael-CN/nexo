const RELEASES_API =
  "https://api.github.com/repos/Rafael-CN/nexo/releases/latest";
export const RELEASES_PAGE = "https://github.com/Rafael-CN/nexo/releases/latest";

const LAST_CHECK_KEY = "nexo.updates.lastCheck.v1";
const DISMISSED_KEY = "nexo.updates.dismissedVersion.v1";
const AUTO_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6h

export interface UpdateInfo {
  version: string;
  url: string;
  notes?: string;
  publishedAt?: string;
}

export function getAppVersion(): string {
  return typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "0.0.0";
}

/**
 * Comparação de versões x.y.z (sufixos de pré-release são ignorados).
 * Retorna > 0 quando `a` é mais nova que `b`.
 */
export function compareVersions(a: string, b: string): number {
  const parse = (value: string) =>
    value
      .replace(/^v/i, "")
      .split(/[.+-]/)
      .slice(0, 3)
      .map((part) => Number.parseInt(part, 10) || 0);

  const [aMajor = 0, aMinor = 0, aPatch = 0] = parse(a);
  const [bMajor = 0, bMinor = 0, bPatch = 0] = parse(b);

  return aMajor - bMajor || aMinor - bMinor || aPatch - bPatch;
}

/**
 * Consulta o último release publicado no GitHub e devolve os dados
 * quando há versão mais nova que a atual. Releases em rascunho não
 * aparecem — o aviso passa a valer quando o draft é publicado.
 */
export async function checkForUpdate(
  currentVersion = getAppVersion(),
): Promise<UpdateInfo | null> {
  const response = await fetch(RELEASES_API, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!response.ok) {
    if (response.status === 404) return null; // nenhum release publicado ainda
    throw new Error("Não foi possível consultar as atualizações agora.");
  }

  const release = (await response.json()) as {
    tag_name?: string;
    html_url?: string;
    body?: string;
    published_at?: string;
  };

  const version = (release.tag_name ?? "").replace(/^v/i, "");
  if (!version || compareVersions(version, currentVersion) <= 0) return null;

  return {
    version,
    url: release.html_url ?? RELEASES_PAGE,
    notes: release.body || undefined,
    publishedAt: release.published_at,
  };
}

export function shouldAutoCheck(now = Date.now()): boolean {
  try {
    const last = Number(window.localStorage.getItem(LAST_CHECK_KEY) ?? 0);
    return now - last >= AUTO_CHECK_INTERVAL_MS;
  } catch {
    return true;
  }
}

export function markChecked(now = Date.now()) {
  try {
    window.localStorage.setItem(LAST_CHECK_KEY, String(now));
  } catch {
    // sem localStorage: checa de novo na próxima abertura
  }
}

export function getDismissedVersion(): string | null {
  try {
    return window.localStorage.getItem(DISMISSED_KEY);
  } catch {
    return null;
  }
}

export function dismissVersion(version: string) {
  try {
    window.localStorage.setItem(DISMISSED_KEY, version);
  } catch {
    // sem localStorage: o aviso volta na próxima abertura
  }
}
