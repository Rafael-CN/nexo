import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CategoryRankingItem {
  label: string;
  value: string;
  amount: number;
  share?: number;
  icon?: LucideIcon;
  tone?: "neutral" | "positive" | "negative" | "warning";
}

export interface CategoryRankingProps {
  title?: string;
  items: CategoryRankingItem[];
  maxValue?: number;
  className?: string;
}

const toneFillMap: Record<NonNullable<CategoryRankingItem["tone"]>, string> = {
  neutral: "bg-foreground",
  positive: "bg-success",
  negative: "bg-destructive",
  warning: "bg-warning",
};

export function CategoryRanking({
  title = "Ranking",
  items,
  maxValue,
  className,
}: CategoryRankingProps) {
  const computedMax = maxValue ?? Math.max(...items.map((item) => item.amount), 1);

  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex items-center gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </p>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="border-t border-border">
        {items.map((item, index) => {
          const Icon = item.icon;
          const ratio = Math.max(0, Math.min(1, item.amount / computedMax));

          return (
            <div
              key={`${item.label}-${index}`}
              className="grid gap-4 border-b border-border py-3 [grid-template-columns:minmax(0,1fr)_minmax(120px,1.3fr)_auto] last:border-b-0"
            >
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  {Icon && (
                    <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
                  )}
                  <p className="truncate text-sm">{item.label}</p>
                </div>
                <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  #{index + 1}
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-border">
                    <div
                      className={cn("h-px transition-[width] duration-300", toneFillMap[item.tone ?? "neutral"])}
                      style={{ width: `${ratio * 100}%` }}
                    />
                  </div>
                  {item.share !== undefined ? (
                    <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                      {item.share.toFixed(1)}%
                    </span>
                  ) : null}
                </div>
                <p className="font-mono text-[11px] tabular-nums text-muted-foreground">
                  {item.value}
                </p>
              </div>

              <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
            </div>
          );
        })}
      </div>
    </section>
  );
}
