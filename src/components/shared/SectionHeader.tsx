import type { ReactNode } from "react";
import { dsSectionLabel } from "@/lib/designSystem";
import { cn } from "@/lib/utils";

/**
 * Cabeçalho de seção padrão: rótulo mono uppercase + hairline,
 * com espaço opcional para ações à direita. Toda seção de página
 * usa este componente — nunca replicar o padrão manualmente.
 */
export function SectionHeader({
  label,
  children,
  className,
}: {
  label: ReactNode;
  /** Conteúdo à direita da hairline (botões, hints). */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <p className={dsSectionLabel}>{label}</p>
      <div className="h-px flex-1 bg-border" />
      {children}
    </div>
  );
}
