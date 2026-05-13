import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface NumberInputProps
  extends Omit<React.ComponentProps<typeof Input>, "type"> {}

const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ className, inputMode = "decimal", ...props }, ref) => {
    return (
      <Input
        ref={ref}
        type="text"
        inputMode={inputMode}
        className={cn("font-mono tabular-nums", className)}
        {...props}
      />
    );
  },
);
NumberInput.displayName = "NumberInput";

export { NumberInput };
