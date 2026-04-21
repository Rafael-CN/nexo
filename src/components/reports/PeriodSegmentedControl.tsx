import { cn } from "@/lib/utils";

export interface PeriodOption {
  value: string;
  label: string;
  shortLabel?: string;
  disabled?: boolean;
}

export interface PeriodSegmentedControlProps {
  value: string;
  options: PeriodOption[];
  onValueChange: (value: string) => void;
  className?: string;
}

export function PeriodSegmentedControl({
  value,
  options,
  onValueChange,
  className,
}: PeriodSegmentedControlProps) {
  return (
    <div
      role="tablist"
      aria-label="Period selection"
      className={cn(
        "inline-flex flex-wrap gap-px border border-border bg-transparent p-px",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={option.disabled}
            onClick={() => onValueChange(option.value)}
            className={cn(
              "min-h-9 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              active
                ? "bg-background text-foreground"
                : "bg-muted/30 text-muted-foreground hover:bg-accent/60 hover:text-foreground",
              option.disabled && "cursor-not-allowed opacity-50 hover:bg-muted/30 hover:text-muted-foreground",
            )}
          >
            <span className="block sm:hidden">
              {option.shortLabel ?? option.label}
            </span>
            <span className="hidden sm:block">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
