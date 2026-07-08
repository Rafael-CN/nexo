import { useEffect } from "react";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

/** Ação contextual que a página atual oferece ao palette (Ctrl+K). */
export interface PaletteContextAction {
  id: string;
  label: string;
  description?: string;
  keywords?: string[];
  run: () => void;
}

interface PaletteContextState {
  actions: PaletteContextAction[];
  register: (actions: PaletteContextAction[]) => () => void;
}

export const usePaletteContextStore = create<PaletteContextState>((set) => ({
  actions: [],
  register: (actions) => {
    set((state) => ({ actions: [...state.actions, ...actions] }));
    return () => {
      set((state) => ({
        actions: state.actions.filter((action) => !actions.includes(action)),
      }));
    };
  },
}));

/**
 * Registra ações contextuais enquanto a página está montada — o palette
 * as exibe no grupo "Nesta página". Passe um array novo quando as
 * dependências mudarem; o efeito cuida do registro/limpeza.
 */
export function usePaletteContext(actions: PaletteContextAction[]) {
  const register = usePaletteContextStore((s) => s.register);

  useEffect(() => {
    if (actions.length === 0) return;
    return register(actions);
  }, [register, actions]);
}

export function useContextActions() {
  return usePaletteContextStore(useShallow((s) => s.actions));
}
