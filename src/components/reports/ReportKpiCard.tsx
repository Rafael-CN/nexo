import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export type KpiTone = "neutral" | "positive" | "negative" | "warning";

export interface ReportKpiCardProps {
  label: string;
  value: string;
  /** Marca o valor como monetário — borrado no modo sigilo. */
  money?: boolean;
  delta?: {
    value: string;
    direction?: "up" | "down" | "flat";
  };
  note?: string;
  icon?: LucideIcon;
  tone?: KpiTone;
  className?: string;
}

const toneDotMap: Record<KpiTone, string> = {
  neutral: "bg-muted-foreground",
  positive: "bg-success",
  negative: "bg-destructive",
  warning: "bg-warning",
};

const toneDeltaMap: Record<KpiTone, string> = {
  neutral: "text-muted-foreground",
  positive: "text-success",
  negative: "text-destructive",
  warning: "text-warning",
};

export function ReportKpiCard({
  label,
  value,
  money = false,
  delta,
  note,
  icon: Icon,
  tone = "neutral",
  className,
}: ReportKpiCardProps) {
  const DeltaIcon =
    delta?.direction === "up"
      ? ArrowUpRight
      : delta?.direction === "down"
        ? ArrowDownRight
        : Minus;

  return (
    <div
      className={cn(
        "group flex min-h-[132px] flex-col justify-between border border-border bg-background p-5 transition-colors hover:bg-accent/15",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn("h-1.5 w-1.5 shrink-0 rounded-full", toneDotMap[tone])}
            aria-hidden
          />
          <p className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </p>
        </div>
        {Icon && (
          <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
        )}
      </div>

      <div className="space-y-1.5">
        <p
          className={cn(
            "selectable-text truncate font-mono text-2xl font-normal tabular-nums tracking-tight",
            money && "money",
          )}
        >
          {value}
        </p>
        <div className="flex min-h-[20px] items-center gap-2 text-[11px] tabular-nums">
          {delta ? (
            <span className={cn("selectable-text inline-flex items-center gap-1 font-mono", toneDeltaMap[tone])}>
              <DeltaIcon className="h-3.5 w-3.5" strokeWidth={1.75} />
              {delta.value}
            </span>
          ) : (
            <span className="selectable-text font-mono text-muted-foreground">
              {note ?? " "}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
