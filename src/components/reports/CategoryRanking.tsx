import type { LucideIcon } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface CategoryRankingItem {
  label: string;
  amount: number;
  /** Participação nas saídas/entradas do período, em % (0–100). */
  share: number;
  /** Nota curta opcional, ex.: variação vs período anterior. */
  meta?: string;
  icon?: LucideIcon;
  tone?: "neutral" | "positive" | "negative" | "warning";
}

export interface CategoryRankingProps {
  title?: string;
  items: CategoryRankingItem[];
  className?: string;
  headerSlot?: React.ReactNode;
  emptyLabel?: string;
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
  className,
  headerSlot,
  emptyLabel = "Nada registrado no período.",
}: CategoryRankingProps) {
  const maxAmount = Math.max(...items.map((item) => item.amount), 1);

  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex items-center gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </p>
        <div className="h-px flex-1 bg-border" />
        {headerSlot}
      </div>

      <div className="overflow-hidden border border-border bg-background">
        {items.length === 0 ? (
          <p className="px-5 py-6 font-mono text-xs text-muted-foreground">
            {emptyLabel}
          </p>
        ) : (
          items.map((item, index) => {
            const Icon = item.icon;
            const ratio = Math.max(0, Math.min(1, item.amount / maxAmount));

            return (
              <div
                key={`${item.label}-${index}`}
                className="space-y-2 border-b border-border px-5 py-3.5 last:border-b-0"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-2">
                    {Icon && (
                      <Icon
                        className="h-3.5 w-3.5 shrink-0 self-center text-muted-foreground"
                        strokeWidth={1.5}
                      />
                    )}
                    <p className="selectable-text truncate text-sm">{item.label}</p>
                    {item.meta && (
                      <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                        {item.meta}
                      </span>
                    )}
                  </div>
                  <p className="selectable-text shrink-0 font-mono text-[13px] tabular-nums">
                    {formatCurrency(item.amount)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-border">
                    <div
                      className={cn(
                        "h-px transition-[width] duration-300",
                        toneFillMap[item.tone ?? "neutral"],
                      )}
                      style={{ width: `${ratio * 100}%` }}
                    />
                  </div>
                  <span className="selectable-text w-11 shrink-0 text-right font-mono text-[10px] tabular-nums text-muted-foreground">
                    {item.share.toFixed(1)}%
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
