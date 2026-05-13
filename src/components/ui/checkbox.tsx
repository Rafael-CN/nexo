import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "type" | "checked" | "defaultChecked" | "onChange"
  > {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  children?: React.ReactNode;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ checked, onCheckedChange, children, className, disabled, ...props }, ref) => {
    return (
      <label
        className={cn(
          "inline-flex items-center gap-2.5 select-none",
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
          className,
        )}
      >
        <input
          ref={ref}
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onCheckedChange(event.currentTarget.checked)}
          {...props}
        />
        <span
          className={cn(
            "grid h-4 w-4 shrink-0 place-items-center rounded-sm border border-border bg-background transition-colors",
            "peer-disabled:cursor-not-allowed peer-disabled:opacity-60",
            "peer-checked:border-foreground peer-checked:bg-foreground",
          )}
        >
          <Check
            className={cn(
              "h-3 w-3 text-background transition-opacity",
              checked ? "opacity-100" : "opacity-0",
            )}
            strokeWidth={3}
          />
        </span>
        {children ? (
          <span className="font-mono text-[11px] leading-none text-muted-foreground">
            {children}
          </span>
        ) : null}
      </label>
    );
  },
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
