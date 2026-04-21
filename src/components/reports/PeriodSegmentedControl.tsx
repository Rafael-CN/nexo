import type { KeyboardEvent } from "react";
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
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (
      event.key !== "ArrowLeft" &&
      event.key !== "ArrowRight" &&
      event.key !== "Home" &&
      event.key !== "End"
    ) {
      return;
    }

    const buttons = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>("button[role='tab']"),
    ).filter((button) => !button.disabled);

    if (buttons.length === 0) return;

    const currentButton = event.target instanceof HTMLButtonElement ? event.target : null;
    const currentIndex = currentButton ? buttons.indexOf(currentButton) : -1;
    const activeIndex = buttons.findIndex(
      (button) => button.dataset.active === "true",
    );
    const baseIndex = currentIndex >= 0 ? currentIndex : Math.max(activeIndex, 0);

    let nextIndex = baseIndex;
    if (event.key === "ArrowRight") {
      nextIndex = (baseIndex + 1) % buttons.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (baseIndex - 1 + buttons.length) % buttons.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = buttons.length - 1;
    }

    event.preventDefault();
    buttons[nextIndex]?.focus();
    buttons[nextIndex]?.click();
  }

  return (
    <div
      role="tablist"
      aria-label="Period selection"
      onKeyDown={handleKeyDown}
      className={cn(
        "inline-flex max-w-full flex-nowrap gap-px overflow-x-auto border border-border bg-transparent p-px",
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
            tabIndex={active ? 0 : -1}
            data-active={active ? "true" : "false"}
            disabled={option.disabled}
            onClick={() => onValueChange(option.value)}
            className={cn(
              "min-h-8 shrink-0 whitespace-nowrap px-3 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors ui-focus-ring-inset",
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
