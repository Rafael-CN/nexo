import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  onConfirm: () => void;
  disabled?: boolean;
  label?: string;
  confirmLabel?: string;
  className?: string;
}

/**
 * Exclusão em dois passos: o primeiro clique arma o botão,
 * o segundo confirma. Desarma sozinho após alguns segundos
 * ou ao perder o foco — evita perdas acidentais sem precisar
 * de um dialog de confirmação.
 */
export function ConfirmDeleteButton({
  onConfirm,
  disabled,
  label = "Excluir",
  confirmLabel = "Confirmar exclusão",
  className,
}: Props) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timeout = window.setTimeout(() => setArmed(false), 4000);
    return () => window.clearTimeout(timeout);
  }, [armed]);

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "gap-1.5 rounded-sm text-xs text-destructive hover:bg-destructive/10 hover:text-destructive",
        armed && "bg-destructive/10 font-medium",
        className,
      )}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else {
          setArmed(true);
        }
      }}
      onBlur={() => setArmed(false)}
      disabled={disabled}
    >
      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
      {armed ? confirmLabel : label}
    </Button>
  );
}
