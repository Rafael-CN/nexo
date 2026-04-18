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
import type { Transaction } from "@/types";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function CalendarPage() {
  const transactions = useFinanceStore(useShallow((s) => s.transactions));

  const today = startOfToday();
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(today));

  const isCurrentMonth = isSameMonth(today, viewMonth);

  const days = useMemo(() => {
    const gridStart = startOfWeek(viewMonth, { weekStartsOn: 0 });
    const gridEnd = addDays(gridStart, 41);
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [viewMonth]);

  const byDate = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of transactions) {
      const list = map.get(t.date) ?? [];
      list.push(t);
      map.set(t.date, list);
    }
    return map;
  }, [transactions]);

  const monthPrefix = format(viewMonth, "yyyy-MM");
  const projectedCount = transactions.filter(
    (t) => t.isProjected && t.date.startsWith(monthPrefix),
  ).length;

  return (
    <div className="space-y-10">
      <section className="flex flex-col gap-6 border-b border-border pb-8 md:flex-row md:items-end md:justify-between">
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

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-sm"
            aria-label="Mês anterior"
            onClick={() => setViewMonth((m) => subMonths(m, 1))}
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
            onClick={() => setViewMonth((m) => addMonths(m, 1))}
          >
            <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
          </Button>
        </div>
      </section>

      <section>
        <div className="grid grid-cols-7 border border-border">
          {WEEKDAYS.map((w) => (
            <div
              key={w}
              className="border-b border-r border-border bg-muted/30 px-3 py-2 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground last:border-r-0"
            >
              {w}
            </div>
          ))}

          {days.map((day, i) => {
            const iso = formatISO(day, { representation: "date" });
            const items = byDate.get(iso) ?? [];
            const inMonth = isSameMonth(day, viewMonth);
            const dayIsToday = isToday(day);

            const income = items
              .filter((t) => t.type === "income")
              .reduce((a, t) => a + t.amount, 0);
            const expense = items
              .filter((t) => t.type === "expense")
              .reduce((a, t) => a + t.amount, 0);

            return (
              <div
                key={iso}
                className={cn(
                  "relative min-h-[120px] border-b border-r border-border p-2 transition-colors",
                  (i + 1) % 7 === 0 && "border-r-0",
                  i >= days.length - 7 && "border-b-0",
                  !inMonth && "bg-muted/10",
                  dayIsToday && "bg-accent/40",
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "font-mono text-[11px] tabular-nums",
                      !inMonth && "text-muted-foreground/50",
                      dayIsToday && "font-semibold text-foreground",
                    )}
                  >
                    {format(day, "dd")}
                  </span>
                  {items.length > 0 && (
                    <span className="font-mono text-[9px] text-muted-foreground">
                      {items.length}
                    </span>
                  )}
                </div>

                <div className="mt-2 space-y-1">
                  {items.slice(0, 2).map((t) => {
                    const isIncome = t.type === "income";
                    return (
                      <div
                        key={t.id}
                        className="flex items-center gap-1.5 text-[10px]"
                      >
                        <span
                          className={cn(
                            "h-1 w-1 shrink-0 rounded-full",
                            isIncome ? "bg-success" : "bg-destructive",
                          )}
                          aria-hidden
                        />
                        <span
                          className={cn(
                            "truncate",
                            t.isProjected && "text-muted-foreground",
                          )}
                        >
                          {t.title}
                        </span>
                      </div>
                    );
                  })}
                  {items.length > 2 && (
                    <p className="font-mono text-[9px] text-muted-foreground">
                      +{items.length - 2}
                    </p>
                  )}
                </div>

                {(income > 0 || expense > 0) && (
                  <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between font-mono text-[9px] tabular-nums">
                    {income > 0 && (
                      <span className="text-success">
                        +{formatCurrency(income, true)}
                      </span>
                    )}
                    {expense > 0 && (
                      <span className="ml-auto text-destructive">
                        −{formatCurrency(expense, true)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <Legend color="bg-success" label="Entrada" />
          <Legend color="bg-destructive" label="Saída" />
          <span>· projetadas em cinza ·</span>
        </div>
      </section>

      {isCurrentMonth && (
        <TodayDetail
          date={today}
          transactions={
            byDate.get(formatISO(today, { representation: "date" })) ?? []
          }
        />
      )}
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
  const todays = transactions.filter((t) => isSameDay(new Date(t.date), date));

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
          Sem movimentações hoje. Perfeito dia pra economizar.
        </p>
      ) : (
        <ul className="border-t border-border">
          {todays.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between border-b border-border px-1 py-2.5 text-sm last:border-b-0"
            >
              <span className="truncate">{t.title}</span>
              <span
                className={cn(
                  "font-mono tabular-nums",
                  t.type === "income" ? "text-success" : "text-foreground",
                )}
              >
                {t.type === "income" ? "+" : "−"}
                {formatCurrency(t.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
