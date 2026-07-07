import { useEffect, useRef, useState } from "react";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const DURATION_MS = 180;

/**
 * Valor monetário com transição suave entre mudanças — usado nos
 * números-herói. Sempre marcado como `.money` (modo sigilo).
 */
export function AnimatedCurrency({
  value,
  compact = false,
  className,
}: {
  value: number;
  compact?: boolean;
  className?: string;
}) {
  const [display, setDisplay] = useState(value);
  const frameRef = useRef<number>();
  const fromRef = useRef(value);

  useEffect(() => {
    const from = fromRef.current;
    if (from === value) return;

    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / DURATION_MS);
      const eased = 1 - (1 - progress) ** 2;
      setDisplay(from + (value - from) * eased);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step);
      } else {
        fromRef.current = value;
      }
    };

    frameRef.current = requestAnimationFrame(step);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      fromRef.current = value;
    };
  }, [value]);

  return (
    <span className={cn("money", className)}>
      {formatCurrency(display, compact)}
    </span>
  );
}
