export function isEditableElement(target: EventTarget | null) {
  if (!target || typeof target !== "object") return false;

  const element = target as {
    closest?: (selector: string) => unknown;
    isContentEditable?: boolean;
  };

  return Boolean(
    element.closest?.(
      'input, textarea, select, [contenteditable=""], [contenteditable="true"]',
    ) || element.isContentEditable,
  );
}

export type Shortcut = string;

function normalizeKey(key: string) {
  return key.length === 1 ? key.toLowerCase() : key.toLowerCase().trim();
}

function matchesShortcutBinding(event: KeyboardEvent, shortcut: Shortcut) {
  const parts = shortcut
    .toLowerCase()
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean);

  const key = parts.at(-1);
  if (!key) return false;

  const modifiers = new Set(parts.slice(0, -1));
  const wantsMod = modifiers.has("mod");
  const wantsCtrl = modifiers.has("ctrl");
  const wantsMeta = modifiers.has("meta");
  const wantsShift = modifiers.has("shift");
  const wantsAlt = modifiers.has("alt");

  const hasMod = event.metaKey || event.ctrlKey;
  if (wantsMod ? !hasMod : hasMod && !wantsCtrl && !wantsMeta) return false;
  if (wantsCtrl && !event.ctrlKey) return false;
  if (wantsMeta && !event.metaKey) return false;
  if (wantsShift !== event.shiftKey) return false;
  if (wantsAlt !== event.altKey) return false;

  return normalizeKey(event.key) === key;
}

export function formatShortcut(shortcut: Shortcut) {
  const parts = shortcut
    .toLowerCase()
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean);

  const key = parts.at(-1);
  if (!key) return "";

  const labels = parts.slice(0, -1).map((part) => {
    if (part === "mod") return "Ctrl/Cmd";
    if (part === "ctrl") return "Ctrl";
    if (part === "cmd" || part === "meta") return "Cmd";
    if (part === "shift") return "Shift";
    if (part === "alt" || part === "option") return "Alt";
    return part;
  });

  const keyLabel =
    key === "escape" ? "Esc" : key.length === 1 ? key.toUpperCase() : key;

  return [...labels, keyLabel].join("+");
}

export function isShortcutEvent(event: KeyboardEvent, shortcut: Shortcut) {
  if (event.defaultPrevented || event.repeat) return false;
  if (isEditableElement(event.target)) return false;
  return matchesShortcutBinding(event, shortcut);
}

export function isGlobalShortcutEvent(event: KeyboardEvent) {
  if (event.defaultPrevented || event.repeat) return false;
  if (isEditableElement(event.target)) return false;

  return [
    "mod+k",
    "mod+n",
    "mod+,",
    "mod+1",
    "mod+2",
    "mod+3",
    "mod+4",
    "mod+5",
    "mod+6",
    "mod+7",
  ].some((shortcut) => matchesShortcutBinding(event, shortcut));
}
