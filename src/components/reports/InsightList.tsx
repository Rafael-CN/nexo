import type { LucideIcon } from "lucide-react";
import { AlertTriangle, ArrowRight, CheckCircle2, Info, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InsightItem {
  title: string;
  description?: string;
  meta?: string;
  tone?: "neutral" | "positive" | "warning" | "negative";
  icon?: LucideIcon;
}

export interface InsightListProps {
  title?: string;
  items: InsightItem[];
  className?: string;
}

const toneIconMap: Record<NonNullable<InsightItem["tone"]>, LucideIcon> = {
  neutral: Info,
  positive: CheckCircle2,
  warning: AlertTriangle,
  negative: ArrowRight,
};

const toneTextMap: Record<NonNullable<InsightItem["tone"]>, string> = {
  neutral: "text-muted-foreground",
  positive: "text-success",
  warning: "text-warning",
  negative: "text-destructive",
};

export function InsightList({
  title = "Insights",
  items,
  className,
}: InsightListProps) {
  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex items-center gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </p>
        <div className="h-px flex-1 bg-border" />
        <Sparkles className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
      </div>

      <div className="overflow-hidden border border-border bg-background">
        {items.map((item, index) => {
          const ToneIcon = item.icon ?? toneIconMap[item.tone ?? "neutral"];

          return (
            <div
              key={`${item.title}-${index}`}
              className="flex items-start gap-3 border-b border-border px-5 py-4 last:border-b-0"
            >
              <div className={cn("mt-0.5 shrink-0", toneTextMap[item.tone ?? "neutral"])}>
                <ToneIcon className="h-3.5 w-3.5" strokeWidth={1.75} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <p className="selectable-text text-sm font-medium">{item.title}</p>
                  {item.meta ? (
                    <p className="selectable-text font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      {item.meta}
                    </p>
                  ) : null}
                </div>
                {item.description ? (
                  <p className="selectable-text mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                    {item.description}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
