const PROFILE_KEY = "financeiro.profile.v1";

export type LocalProfile = {
  name: string;
  createdAt: string;
};

export function getLocalProfile(): LocalProfile | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(PROFILE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<LocalProfile>;
    if (!parsed.name || !parsed.createdAt) return null;
    return { name: parsed.name, createdAt: parsed.createdAt };
  } catch {
    return null;
  }
}

export function saveLocalProfile(profile: LocalProfile) {
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function getProfileInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "U";
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
