import { useEffect } from "react";
import { isGlobalShortcutEvent } from "@/lib/keyboardShortcuts";

type DesktopShortcutHandlers = {
  onOpenPalette: () => void;
  onOpenNewTransaction: () => void;
  onNavigateToIndex: (index: number) => void;
  enabled?: boolean;
};

export function useDesktopShortcuts({
  onOpenPalette,
  onOpenNewTransaction,
  onNavigateToIndex,
  enabled = true,
}: DesktopShortcutHandlers) {
  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (!isGlobalShortcutEvent(event)) return;

      const key = event.key.toLowerCase();
      if (key === "k") {
        event.preventDefault();
        onOpenPalette();
        return;
      }

      if (key === "n") {
        event.preventDefault();
        onOpenNewTransaction();
        return;
      }

      if (/^[1-7]$/.test(key)) {
        event.preventDefault();
        onNavigateToIndex(Number(key) - 1);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, onNavigateToIndex, onOpenNewTransaction, onOpenPalette]);
}
