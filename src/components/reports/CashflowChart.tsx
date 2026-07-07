import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SectionHeader } from "@/components/shared/SectionHeader";

export interface CashflowChartPoint {
  label: string;
  inflow: number;
  outflow: number;
}

export interface CashflowChartProps {
  title?: string;
  points: CashflowChartPoint[];
  className?: string;
}

export function CashflowChart({
  title = "Fluxo do período",
  points,
  className,
}: CashflowChartProps) {
  const max = Math.max(
    1,
    ...points.map((point) => Math.max(point.inflow, point.outflow)),
  );
  const totalInflow = points.reduce((sum, point) => sum + point.inflow, 0);
  const totalOutflow = points.reduce((sum, point) => sum + point.outflow, 0);
  const net = totalInflow - totalOutflow;
  const firstLabel = points[0]?.label ?? "";
  const lastLabel = points[points.length - 1]?.label ?? "";

  return (
    <section className={cn("space-y-3", className)}>
      <SectionHeader label={title}>
        <p className="font-mono text-[10px] tabular-nums text-muted-foreground">
          <span className="money text-success">+{formatCurrency(totalInflow, true)}</span>
          <span className="px-1.5">·</span>
          <span className="money text-destructive">
            −{formatCurrency(totalOutflow, true)}
          </span>
          <span className="px-1.5">·</span>
          <span className={cn("money", net < 0 && "text-destructive")}>
            = {formatCurrency(net, true)}
          </span>
        </p>
      </SectionHeader>

      <div className="border border-border bg-background p-5">
        <div className="flex h-44 items-stretch gap-[3px]">
          {points.map((point, index) => {
            const inflowHeight = (point.inflow / max) * 100;
            const outflowHeight = (point.outflow / max) * 100;

            return (
              <div
                key={`${point.label}-${index}`}
                className="group flex min-w-0 flex-1 flex-col"
                title={`${point.label}\n+ ${formatCurrency(point.inflow)}\n− ${formatCurrency(point.outflow)}`}
              >
                <div className="flex flex-1 items-end justify-center">
                  <div
                    className="w-full max-w-6 bg-success/70 transition-colors group-hover:bg-success"
                    style={{ height: `${inflowHeight}%` }}
                    aria-hidden
                  />
                </div>
                <div className="h-px shrink-0 bg-border" aria-hidden />
                <div className="flex flex-1 items-start justify-center">
                  <div
                    className="w-full max-w-6 bg-destructive/60 transition-colors group-hover:bg-destructive"
                    style={{ height: `${outflowHeight}%` }}
                    aria-hidden
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-border pt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          <span>{firstLabel}</span>
          <span>{lastLabel}</span>
        </div>
      </div>
    </section>
  );
}
