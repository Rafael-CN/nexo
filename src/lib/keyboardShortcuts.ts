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

export function isGlobalShortcutEvent(event: KeyboardEvent) {
  if (event.defaultPrevented || event.repeat) return false;
  if (!(event.metaKey || event.ctrlKey) || event.altKey) return false;
  if (isEditableElement(event.target)) return false;

  const key = event.key.toLowerCase();
  return key === "k" || key === "n" || /^[1-7]$/.test(key);
}
