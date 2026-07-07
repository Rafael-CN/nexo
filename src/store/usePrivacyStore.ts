import { create } from "zustand";

const STORAGE_KEY = "nexo.privacy.v1";

interface PrivacyState {
  /** Modo sigilo: valores monetários borrados em todo o app. */
  enabled: boolean;
  toggle: () => void;
  setEnabled: (enabled: boolean) => void;
}

function readInitial(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function apply(enabled: boolean) {
  try {
    document.documentElement.dataset.privacy = enabled ? "true" : "false";
    window.localStorage.setItem(STORAGE_KEY, String(enabled));
  } catch {
    // sem DOM/localStorage (testes): estado só em memória
  }
}

export const usePrivacyStore = create<PrivacyState>((set, get) => {
  const initial = readInitial();
  if (typeof document !== "undefined") apply(initial);

  return {
    enabled: initial,
    toggle: () => {
      const next = !get().enabled;
      apply(next);
      set({ enabled: next });
    },
    setEnabled: (enabled) => {
      apply(enabled);
      set({ enabled });
    },
  };
});
