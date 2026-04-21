import { useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  format,
  formatISO,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfToday,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useProjection } from "@/hooks/useProjection";
import type { Transaction } from "@/types";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

export function CalendarPage() {
  const transactions = useFinanceStore(useShallow((s) => s.transactions));
  const {
    expanded,
    dailyBalances,
    weeklyBalances,
    monthlyBalances,
    baseBalance,
  } = useProjection();

  const today = startOfToday();
  const todayIso = formatISO(today, { representation: "date" });
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(today));

  const isCurrentMonth = isSameMonth(today, viewMonth);

  const days = useMemo(() => {
    const gridStart = startOfWeek(viewMonth, { weekStartsOn: 0 });
    const gridEnd = addDays(gridStart, 41);
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [viewMonth]);

  const byDate = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const transaction of [...transactions, ...expanded]) {
      const list = map.get(transaction.date) ?? [];
      list.push(transaction);
      map.set(transaction.date, list);
    }
    return map;
  }, [transactions, expanded]);

  const monthPrefix = format(viewMonth, "yyyy-MM");
  const projectedCount = useMemo(
    () =>
      [...transactions, ...expanded].filter(
        (transaction) =>
          transaction.isProjected && transaction.date.startsWith(monthPrefix),
      ).length,
    [transactions, expanded, monthPrefix],
  );

  return (
    <div className="space-y-10">
      <section className="flex flex-col gap-6 border-b border-border pb-8 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Projeção mensal
          </p>
          <h1 className="font-mono text-4xl font-light capitalize tracking-tight md:text-5xl">
            {format(viewMonth, "MMMM yyyy", { locale: ptBR })}
          </h1>
          <p className="font-mono text-xs text-muted-foreground">
            {projectedCount} lançamentos projetados no período
          </p>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="grid grid-cols-3 border border-border font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <ProjectionMetric label="Hoje" value={baseBalance} />
            <ProjectionMetric
              label="Semana"
              value={weeklyBalances[0]?.balance ?? baseBalance}
            />
            <ProjectionMetric
              label="Mês"
              value={monthlyBalances[0]?.balance ?? baseBalance}
            />
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-sm"
              aria-label="Mês anterior"
              onClick={() => setViewMonth((month) => subMonths(month, 1))}
            >
              <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 rounded-sm px-3 font-mono text-[11px] uppercase tracking-wider",
                isCurrentMonth && "text-muted-foreground",
              )}
              onClick={() => setViewMonth(startOfMonth(startOfToday()))}
            >
              Hoje
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-sm"
              aria-label="Próximo mês"
              onClick={() => setViewMonth((month) => addMonths(month, 1))}
            >
              <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
            </Button>
          </div>
        </div>
      </section>

      <section>
        <div className="grid grid-cols-7 border border-border">
          {WEEKDAYS.map((weekday) => (
            <div
              key={weekday}
              className="border-b border-r border-border bg-muted/30 px-3 py-2 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground last:border-r-0"
            >
              {weekday}
            </div>
          ))}

          {days.map((day, index) => {
            const iso = formatISO(day, { representation: "date" });
            const items = byDate.get(iso) ?? [];
            const inMonth = isSameMonth(day, viewMonth);
            const dayIsToday = isToday(day);
            const isPast = iso < todayIso;

            const projectedBalance = dayIsToday
              ? baseBalance
              : isPast
                ? undefined
                : dailyBalances.get(iso);

            return (
              <div
                key={iso}
                className={cn(
                  "relative min-h-[110px] border-b border-r border-border p-2 transition-colors",
                  (index + 1) % 7 === 0 && "border-r-0",
                  index >= days.length - 7 && "border-b-0",
                  !inMonth && "bg-muted/10",
                  dayIsToday && "bg-accent/40",
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "font-mono text-[11px] tabular-nums",
                      !inMonth && "text-muted-foreground/40",
                      dayIsToday && "font-semibold text-foreground",
                    )}
                  >
                    {format(day, "dd")}
                  </span>
                  {items.length > 0 && (
                    <span className="font-mono text-[9px] text-muted-foreground/60">
                      {items.length}
                    </span>
                  )}
                </div>

                <div className="mt-1.5 space-y-0.5">
                  {items.slice(0, 2).map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center gap-1 text-[10px]"
                    >
                      <span
                        className={cn(
                          "h-1 w-1 shrink-0 rounded-full",
                          transaction.type === "income"
                            ? "bg-success"
                            : "bg-destructive",
                        )}
                        aria-hidden
                      />
                      <span
                        className={cn(
                          "truncate leading-tight",
                          transaction.isProjected
                            ? "text-muted-foreground/70"
                            : "text-foreground",
                        )}
                      >
                        {transaction.title}
                      </span>
                    </div>
                  ))}
                  {items.length > 2 && (
                    <p className="font-mono text-[9px] text-muted-foreground/60">
                      +{items.length - 2}
                    </p>
                  )}
                </div>

                {projectedBalance !== undefined && (
                  <div className="absolute bottom-1.5 left-2 right-2">
                    <p
                      className={cn(
                        "font-mono text-[9px] tabular-nums",
                        projectedBalance < 0
                          ? "text-destructive"
                          : dayIsToday
                            ? "text-foreground/70"
                            : "text-muted-foreground/60",
                      )}
                    >
                      {formatCurrency(projectedBalance, true)}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <Legend color="bg-success" label="Entrada" />
          <Legend color="bg-destructive" label="Saída" />
          <span>.</span>
          <span className="normal-case tracking-normal text-muted-foreground/70">
            Valor no canto inferior = saldo projetado no fim do dia
          </span>
        </div>
      </section>

      {isCurrentMonth && (
        <TodayDetail date={today} transactions={byDate.get(todayIso) ?? []} />
      )}
    </div>
  );
}

function ProjectionMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="min-w-[104px] border-r border-border px-3 py-2 last:border-r-0">
      <p>{label}</p>
      <p
        className={cn(
          "mt-1 text-xs tabular-nums text-foreground",
          value < 0 && "text-destructive",
        )}
      >
        {formatCurrency(value, true)}
      </p>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-1.5 w-1.5 rounded-full", color)} aria-hidden />
      {label}
    </span>
  );
}

function TodayDetail({
  date,
  transactions,
}: {
  date: Date;
  transactions: Transaction[];
}) {
  const todays = transactions.filter((transaction) =>
    isSameDay(new Date(transaction.date), date),
  );

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Detalhe — {format(date, "EEEE, dd MMM", { locale: ptBR })}
        </p>
        <div className="h-px flex-1 bg-border" />
      </div>

      {todays.length === 0 ? (
        <p className="font-mono text-xs text-muted-foreground">
          Sem movimentações hoje.
        </p>
      ) : (
        <ul className="border-t border-border">
          {todays.map((transaction) => (
            <li
              key={transaction.id}
              className="flex items-center justify-between border-b border-border px-1 py-2.5 text-sm last:border-b-0"
            >
              <span className="truncate">{transaction.title}</span>
              <span
                className={cn(
                  "font-mono tabular-nums",
                  transaction.type === "income"
                    ? "text-success"
                    : "text-foreground",
                )}
              >
                {transaction.type === "income" ? "+" : "-"}
                {formatCurrency(transaction.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
