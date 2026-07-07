import { create } from "zustand";

export interface Toast {
  id: string;
  message: string;
  /** Rótulo do botão de ação (ex.: "Desfazer"). */
  actionLabel?: string;
  onAction?: () => void | Promise<void>;
  tone?: "default" | "success" | "destructive";
}

interface ToastState {
  toasts: Toast[];
  push: (toast: Omit<Toast, "id">, durationMs?: number) => string;
  dismiss: (id: string) => void;
}

const MAX_TOASTS = 3;
const DEFAULT_DURATION_MS = 6000;

const timers = new Map<string, ReturnType<typeof setTimeout>>();

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  push: (toast, durationMs = DEFAULT_DURATION_MS) => {
    const id = crypto.randomUUID();

    set((state) => {
      const next = [...state.toasts, { ...toast, id }];
      // Estourou o limite: derruba os mais antigos (e seus timers).
      const overflow = next.length - MAX_TOASTS;
      if (overflow > 0) {
        for (const dropped of next.slice(0, overflow)) {
          const timer = timers.get(dropped.id);
          if (timer) clearTimeout(timer);
          timers.delete(dropped.id);
        }
      }
      return { toasts: next.slice(-MAX_TOASTS) };
    });

    timers.set(
      id,
      setTimeout(() => get().dismiss(id), durationMs),
    );

    return id;
  },

  dismiss: (id) => {
    const timer = timers.get(id);
    if (timer) clearTimeout(timer);
    timers.delete(id);
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }));
  },
}));

/** Atalho para disparar um toast fora de componentes React. */
export function toast(message: string, options: Omit<Toast, "id" | "message"> = {}) {
  return useToastStore.getState().push({ message, ...options });
}
