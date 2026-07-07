import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Chip de tecla — padrão único para dicas de atalho em toda a interface
 * (ajuda de atalhos, botões de salvar, rodapés de picker, palette).
 */
export function Kbd({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center border border-border bg-accent/40 px-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

/** Sequência de teclas ("Ctrl" + "Enter") com espaçamento padrão. */
export function KbdGroup({
  keys,
  className,
}: {
  keys: string[];
  className?: string;
}) {
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1", className)}>
      {keys.map((key) => (
        <Kbd key={key}>{key}</Kbd>
      ))}
    </span>
  );
}
