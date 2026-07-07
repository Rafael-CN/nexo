import { useShallow } from "zustand/react/shallow";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToastStore } from "@/store/useToastStore";
import { dsShadow } from "@/lib/designSystem";
import { cn } from "@/lib/utils";

const toneBorderMap = {
  default: "border-border",
  success: "border-success/40",
  destructive: "border-destructive/40",
} as const;

/** Pilha de toasts no canto inferior direito — sóbria, com ação opcional. */
export function Toaster() {
  const toasts = useToastStore(useShallow((s) => s.toasts));
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-80 flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={cn(
            "pointer-events-auto flex items-center gap-3 border bg-background px-4 py-3",
            dsShadow,
            "animate-in fade-in-0 slide-in-from-bottom-2 duration-150",
            toneBorderMap[toast.tone ?? "default"],
          )}
        >
          <p className="min-w-0 flex-1 text-sm leading-5">{toast.message}</p>

          {toast.actionLabel && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 shrink-0 rounded-sm px-2 font-mono text-[10px] uppercase tracking-wider"
              onClick={() => {
                dismiss(toast.id);
                void toast.onAction?.();
              }}
            >
              {toast.actionLabel}
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            aria-label="Fechar aviso"
            onClick={() => dismiss(toast.id)}
          >
            <X className="h-3.5 w-3.5" strokeWidth={1.5} />
          </Button>
        </div>
      ))}
    </div>
  );
}
