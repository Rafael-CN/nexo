import { forwardRef } from "react";
import type { ComponentPropsWithoutRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatCurrencyInputValue } from "@/components/shared/transactionModalUtils";

interface CurrencyInputProps
  extends Omit<ComponentPropsWithoutRef<"input">, "onChange" | "type" | "value"> {
  value: string;
  onChange: (value: string) => void;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, onBlur, onChange, value, ...props }, ref) => {
    return (
      <Input
        {...props}
        ref={ref}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(formatCurrencyInputValue(event.target.value))}
        onBlur={(event) => {
          const formatted = formatCurrencyInputValue(event.target.value);
          if (formatted !== value) onChange(formatted);
          onBlur?.(event);
        }}
        className={cn("tabular-nums", className)}
      />
    );
  },
);

CurrencyInput.displayName = "CurrencyInput";
