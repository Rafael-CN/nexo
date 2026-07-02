import { useEffect } from "react";
import {
  isEscapeKeyEvent,
  isGlobalShortcutEvent,
  isShortcutEvent,
} from "@/lib/keyboardShortcuts";

type DesktopShortcutHandlers = {
  onOpenPalette: () => void;
  onOpenNewTransaction: () => void;
  onOpenNewTransfer: () => void;
  onOpenHelp: () => void;
  onOpenSettings: () => void;
  onNavigateToIndex: (index: number) => void;
  onClosePalette: () => void;
  onCloseTransactionModal: () => void;
  isCommandPaletteOpen: boolean;
  isTransactionModalOpen: boolean;
  enabled?: boolean;
};

export function useDesktopShortcuts({
  onOpenPalette,
  onOpenNewTransaction,
  onOpenNewTransfer,
  onOpenHelp,
  onOpenSettings,
  onNavigateToIndex,
  onClosePalette,
  onCloseTransactionModal,
  isCommandPaletteOpen,
  isTransactionModalOpen,
  enabled = true,
}: DesktopShortcutHandlers) {
  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (isCommandPaletteOpen || isTransactionModalOpen) return;

      if (isShortcutEvent(event, "shift+?")) {
        event.preventDefault();
        onOpenHelp();
        return;
      }

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

      if (key === "t") {
        event.preventDefault();
        onOpenNewTransfer();
        return;
      }

      if (key === ",") {
        event.preventDefault();
        onOpenSettings();
        return;
      }

      if (/^[1-7]$/.test(key)) {
        event.preventDefault();
        onNavigateToIndex(Number(key) - 1);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    enabled,
    onNavigateToIndex,
    onOpenNewTransaction,
    onOpenNewTransfer,
    onOpenHelp,
    onOpenPalette,
    onOpenSettings,
    isCommandPaletteOpen,
    isTransactionModalOpen,
  ]);

  useEffect(() => {
    if (!enabled) return;

    function handleEscape(event: KeyboardEvent) {
      if (!isEscapeKeyEvent(event)) return;

      // Uma camada flutuante aberta (select, date picker, autocomplete)
      // consome o Escape antes do modal — fechar só a camada, nunca os dois.
      if (
        document.querySelector(
          "[data-radix-popper-content-wrapper], [data-picker-popover]",
        )
      ) {
        return;
      }

      if (isCommandPaletteOpen) {
        event.preventDefault();
        onClosePalette();
        return;
      }

      if (isTransactionModalOpen) {
        event.preventDefault();
        onCloseTransactionModal();
      }
    }

    document.addEventListener("keydown", handleEscape, true);
    return () => document.removeEventListener("keydown", handleEscape, true);
  }, [
    enabled,
    isCommandPaletteOpen,
    isTransactionModalOpen,
    onClosePalette,
    onCloseTransactionModal,
  ]);
}
