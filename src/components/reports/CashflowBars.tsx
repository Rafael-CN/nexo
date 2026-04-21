import { cn } from "@/lib/utils";

export interface CashflowPoint {
  label: string;
  inflow?: number;
  outflow?: number;
  value?: number;
}

export interface CashflowBarsProps {
  title?: string;
  subtitle?: string;
  points: CashflowPoint[];
  maxValue?: number;
  className?: string;
}

function formatHeight(value: number, max: number) {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, (value / max) * 100));
}

export function CashflowBars({
  title = "Cashflow",
  subtitle,
  points,
  maxValue,
  className,
}: CashflowBarsProps) {
  const computedMax =
    maxValue ??
    Math.max(
      1,
      ...points.map((point) =>
        Math.max(
          Math.abs(point.inflow ?? 0),
          Math.abs(point.outflow ?? 0),
          Math.abs(point.value ?? 0),
        ),
      ),
    );

  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex items-center gap-3">
        <div className="space-y-0.5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {title}
          </p>
          {subtitle ? (
            <p className="font-mono text-[11px] text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="grid grid-cols-1 gap-px border border-border bg-transparent sm:grid-cols-2 xl:grid-cols-4">
        {points.map((point) => {
          const inflowHeight = formatHeight(point.inflow ?? Math.max(point.value ?? 0, 0), computedMax);
          const outflowHeight = formatHeight(point.outflow ?? Math.max(-(point.value ?? 0), 0), computedMax);
          const net =
            point.value ??
            (point.inflow ?? 0) - (point.outflow ?? 0);

          return (
            <div key={point.label} className="bg-background p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    {point.label}
                  </p>
                  <p className="mt-1 font-mono text-[11px] tabular-nums text-muted-foreground">
                    {net >= 0 ? "+" : ""}
                    {net.toLocaleString("pt-BR", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex h-28 items-center">
                <div className="flex h-full w-full items-center gap-2">
                  <div className="flex h-full flex-1 flex-col justify-end">
                    <div className="flex h-1/2 items-end justify-center">
                      <div
                        className="w-full max-w-12 bg-success/90"
                        style={{ height: `${inflowHeight}%` }}
                        aria-hidden
                      />
                    </div>
                    <div className="flex h-1/2 items-start justify-center">
                      <div
                        className="w-full max-w-12 bg-destructive/90"
                        style={{ height: `${outflowHeight}%` }}
                        aria-hidden
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                <span>In</span>
                <span>Out</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
