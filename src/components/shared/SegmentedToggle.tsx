import { cn } from "@/lib/utils";

export interface SegmentedToggleOption<T extends string> {
  value: T;
  label: string;
}

/**
 * Toggle segmentado no padrão do seletor de tipo do modal de transação:
 * botões fora da ordem de Tab (a troca por teclado é via Ctrl+Tab do
 * modal que o hospeda), com o item ativo em alto contraste.
 */
export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: readonly SegmentedToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex border border-border bg-background", className)}>
      {options.map((option, index) => (
        <button
          key={option.value}
          type="button"
          tabIndex={-1}
          onClick={() => onChange(option.value)}
          aria-pressed={option.value === value}
          className={cn(
            "px-3 py-2 text-[11px] uppercase tracking-[0.14em] transition-colors",
            index < options.length - 1 && "border-r border-border",
            option.value === value
              ? "bg-foreground text-background"
              : "bg-background text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** Avança (ou retorna) o valor dentro da lista de opções — para Ctrl+Tab. */
export function cycleSegmentedValue<T extends string>(
  options: readonly SegmentedToggleOption<T>[],
  current: T,
  backwards = false,
): T {
  const index = options.findIndex((option) => option.value === current);
  const step = backwards ? options.length - 1 : 1;
  return options[(Math.max(index, 0) + step) % options.length].value;
}
