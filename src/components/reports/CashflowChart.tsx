import { useState } from "react";
import { dsPopoverSurface } from "@/lib/designSystem";
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
  const [hovered, setHovered] = useState<number | null>(null);
  const max = Math.max(
    1,
    ...points.map((point) => Math.max(point.inflow, point.outflow)),
  );
  const totalInflow = points.reduce((sum, point) => sum + point.inflow, 0);
  const totalOutflow = points.reduce((sum, point) => sum + point.outflow, 0);
  const net = totalInflow - totalOutflow;
  const firstLabel = points[0]?.label ?? "";
  const lastLabel = points[points.length - 1]?.label ?? "";

  const hoveredPoint = hovered !== null ? points[hovered] : null;
  // Mantém o tooltip dentro do gráfico mesmo nas colunas das bordas.
  const hoveredLeft =
    hovered !== null && points.length > 0
      ? Math.min(88, Math.max(12, ((hovered + 0.5) / points.length) * 100))
      : 50;

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

      <div className="relative border border-border bg-background p-5">
        {/* E2: tooltip rico segue a coluna sob o cursor. */}
        {hoveredPoint && (
          <div
            className={cn(
              "pointer-events-none absolute top-3 z-10 min-w-[190px] -translate-x-1/2 p-3",
              dsPopoverSurface,
              "animate-in fade-in-0 zoom-in-95 duration-100",
            )}
            style={{ left: `${hoveredLeft}%` }}
            role="status"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {hoveredPoint.label}
            </p>
            <div className="mt-2 space-y-1 font-mono text-[11px] tabular-nums">
              <p className="flex items-baseline justify-between gap-4">
                <span className="text-muted-foreground">Entradas</span>
                <span className="money text-success">
                  +{formatCurrency(hoveredPoint.inflow)}
                </span>
              </p>
              <p className="flex items-baseline justify-between gap-4">
                <span className="text-muted-foreground">Saídas</span>
                <span className="money text-destructive">
                  −{formatCurrency(hoveredPoint.outflow)}
                </span>
              </p>
              <p className="flex items-baseline justify-between gap-4 border-t border-border pt-1">
                <span className="text-muted-foreground">Resultado</span>
                <span
                  className={cn(
                    "money",
                    hoveredPoint.inflow - hoveredPoint.outflow < 0 &&
                      "text-destructive",
                  )}
                >
                  {formatCurrency(hoveredPoint.inflow - hoveredPoint.outflow)}
                </span>
              </p>
            </div>
          </div>
        )}

        <div
          className="flex h-44 items-stretch gap-[3px]"
          onMouseLeave={() => setHovered(null)}
        >
          {points.map((point, index) => {
            const inflowHeight = (point.inflow / max) * 100;
            const outflowHeight = (point.outflow / max) * 100;

            return (
              <div
                key={`${point.label}-${index}`}
                className={cn(
                  "group flex min-w-0 flex-1 flex-col",
                  hovered === index && "bg-accent/40",
                )}
                onMouseEnter={() => setHovered(index)}
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
