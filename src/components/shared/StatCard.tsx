import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  delta?: { value: string; positive?: boolean };
  icon?: LucideIcon;
  accent?: "primary" | "success" | "warning" | "destructive" | "neutral";
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
}: StatCardProps) {
  return (
    <div className="group flex h-full min-h-[108px] flex-col justify-between gap-4 border border-border p-5 transition-colors hover:bg-accent/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={cn("h-1.5 w-1.5 rounded-full", dotMap[accent])}
            aria-hidden
          />
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </p>
        </div>
        {Icon && (
          <Icon
            className="h-3.5 w-3.5 text-muted-foreground"
            strokeWidth={1.5}
          />
        )}
      </div>

      <div className="min-h-[52px] space-y-1.5">
        <p className="truncate font-mono text-2xl font-normal tracking-tight">
          {value}
        </p>
        {delta && (
          <p
            className={cn(
              "font-mono text-[11px] tabular-nums",
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
