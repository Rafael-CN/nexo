import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  delta?: { value: string; positive?: boolean };
  icon?: LucideIcon;
  accent?: "primary" | "success" | "warning" | "destructive" | "neutral";
  className?: string;
}

const dotMap: Record<NonNullable<StatCardProps["accent"]>, string> = {
  primary: "bg-foreground",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  neutral: "bg-muted-foreground",
};

export function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  accent = "neutral",
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "group flex h-full min-h-[124px] flex-col justify-between gap-4 border border-border bg-background p-5 transition-colors hover:bg-accent/15",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn("h-1.5 w-1.5 rounded-full", dotMap[accent])}
            aria-hidden
          />
          <p className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </p>
        </div>
        {Icon && (
          <Icon
            className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
            strokeWidth={1.5}
          />
        )}
      </div>

      <div className="min-h-[52px] space-y-1.5">
        <p className="selectable-text truncate font-mono text-2xl font-normal tracking-tight">
          {value}
        </p>
        {delta && (
          <p
            className={cn(
              "selectable-text font-mono text-[11px] tabular-nums",
              delta.positive
                ? "text-success"
                : "text-destructive",
            )}
          >
            {delta.value}
          </p>
        )}
      </div>
    </div>
  );
}
