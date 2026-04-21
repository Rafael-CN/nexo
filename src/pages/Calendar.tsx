import { useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  format,
  formatISO,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfToday,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TransactionModal } from "@/components/shared/TransactionModal";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import {
  isDateInRange,
  normalizeDateRange,
  summarizeSelectedRange,
  type SelectedRangeSummary,
} from "@/lib/calendarSelection";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useProjection } from "@/hooks/useProjection";
import type { Transaction } from "@/types";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

type Selection = {
  start: string;
  end: string;
};

export function CalendarPage() {
  const accounts = useFinanceStore(useShallow((s) => s.accounts));
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
  const [selection, setSelection] = useState<Selection>(() => ({
    start: todayIso,
    end: todayIso,
  }));
  const [isSelecting, setIsSelecting] = useState(false);
  const [transactionDate, setTransactionDate] = useState(todayIso);
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);

  const isCurrentMonth = isSameMonth(today, viewMonth);

  const days = useMemo(() => {
    const gridStart = startOfWeek(viewMonth, { weekStartsOn: 0 });
    const gridEnd = addDays(gridStart, 41);
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [viewMonth]);

  const allTransactions = useMemo(
    () => [...transactions, ...expanded],
    [transactions, expanded],
  );

  const byDate = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const transaction of allTransactions) {
      const list = map.get(transaction.date) ?? [];
      list.push(transaction);
      map.set(transaction.date, list);
    }
    return map;
  }, [allTransactions]);

  const selectedRange = useMemo(
    () => normalizeDateRange(selection.start, selection.end),
    [selection],
  );

  const selectedSummary = useMemo(
    () =>
      summarizeSelectedRange({
        start: selectedRange.start,
        end: selectedRange.end,
        accounts,
        effectiveTransactions: transactions,
        timelineTransactions: allTransactions,
        dailyBalances,
        baseBalance,
        todayIso,
      }),
    [
      selectedRange,
      accounts,
      transactions,
      allTransactions,
      dailyBalances,
      baseBalance,
      todayIso,
    ],
  );

  const monthPrefix = format(viewMonth, "yyyy-MM");
  const projectedCount = useMemo(
    () =>
      allTransactions.filter(
        (transaction) =>
          transaction.isProjected && transaction.date.startsWith(monthPrefix),
      ).length,
    [allTransactions, monthPrefix],
  );

  function beginSelection(iso: string) {
    setSelection({ start: iso, end: iso });
    setIsSelecting(true);
  }

  function extendSelectionFromAnchor(iso: string) {
    setSelection((current) => ({ start: current.start, end: iso }));
    setIsSelecting(false);
  }

  function extendSelection(iso: string) {
    if (!isSelecting) return;
    setSelection((current) => ({ ...current, end: iso }));
  }

  function finishSelection(iso?: string) {
    if (iso) {
      setSelection((current) => ({ ...current, end: iso }));
    }
    setIsSelecting(false);
  }

  function openTransactionModal(iso: string) {
    setTransactionDate(iso);
    setSelection({ start: iso, end: iso });
    setIsSelecting(false);
    setTransactionModalOpen(true);
  }

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
          <div className="grid grid-cols-2 border border-border font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
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
        <div
          className="grid select-none grid-cols-7 border border-border"
          onPointerLeave={() => finishSelection()}
          onPointerUp={() => finishSelection()}
        >
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
            const selected = isDateInRange(
              iso,
              selectedRange.start,
              selectedRange.end,
            );
            const rangeStart = iso === selectedRange.start;
            const rangeEnd = iso === selectedRange.end;

            return (
              <button
                key={iso}
                type="button"
                onPointerDown={(event) => {
                  event.preventDefault();
                  if (event.shiftKey) {
                    extendSelectionFromAnchor(iso);
                    return;
                  }
                  beginSelection(iso);
                }}
                onPointerEnter={() => extendSelection(iso)}
                onPointerUp={() => finishSelection(iso)}
                onClick={(event) => {
                  if (event.shiftKey) {
                    extendSelectionFromAnchor(iso);
                    return;
                  }
                  setSelection({ start: iso, end: iso });
                }}
                onDoubleClick={(event) => {
                  event.preventDefault();
                  openTransactionModal(iso);
                }}
                className={cn(
                  "relative min-h-[110px] border-b border-r border-border p-2 text-left transition-colors",
                  (index + 1) % 7 === 0 && "border-r-0",
                  index >= days.length - 7 && "border-b-0",
                  !inMonth && "bg-muted/10",
                  dayIsToday && "bg-accent/30",
                  selected && "bg-muted/70 text-foreground ring-1 ring-inset ring-foreground/15 hover:bg-muted/80",
                  !selected && "hover:bg-accent/40",
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "font-mono text-[11px] tabular-nums",
                      !inMonth && !selected && "text-muted-foreground/40",
                      dayIsToday && "font-semibold",
                    )}
                  >
                    {format(day, "dd")}
                  </span>
                  {items.length > 0 && (
                    <span
                      className={cn(
                        "font-mono text-[9px]",
                        selected
                          ? "text-muted-foreground"
                          : "text-muted-foreground/60",
                      )}
                    >
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
                          selected
                            ? "text-foreground"
                            : transaction.isProjected
                              ? "text-muted-foreground/70"
                              : "text-foreground",
                        )}
                      >
                        {transaction.title}
                      </span>
                    </div>
                  ))}
                  {items.length > 2 && (
                    <p
                      className={cn(
                        "font-mono text-[9px]",
                        selected
                          ? "text-muted-foreground"
                          : "text-muted-foreground/60",
                      )}
                    >
                      +{items.length - 2}
                    </p>
                  )}
                </div>

                {selected && (
                  <span
                    className={cn(
                      "absolute bottom-1.5 h-px bg-foreground/30",
                      rangeStart ? "left-2" : "left-0",
                      rangeEnd ? "right-2" : "right-0",
                    )}
                    aria-hidden
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <Legend color="bg-success" label="Entrada" />
          <Legend color="bg-destructive" label="Saída" />
          <span>.</span>
          <span className="normal-case tracking-normal text-muted-foreground/70">
            Clique e arraste para selecionar um período
          </span>
        </div>
      </section>

      <SelectionSummary summary={selectedSummary} />
      <TransactionModal
        open={transactionModalOpen}
        onOpenChange={setTransactionModalOpen}
        initialDate={transactionDate}
      />
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

function SelectionSummary({ summary }: { summary: SelectedRangeSummary }) {
  const title =
    summary.start === summary.end
      ? format(parseISO(summary.start), "dd MMM yyyy", { locale: ptBR })
      : `${format(parseISO(summary.start), "dd MMM", {
          locale: ptBR,
        })} - ${format(parseISO(summary.end), "dd MMM yyyy", {
          locale: ptBR,
        })}`;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Período selecionado
        </p>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="grid grid-cols-1 gap-px overflow-hidden border border-border bg-border md:grid-cols-4">
        <SelectionMetric
          label={summary.days === 1 ? "Data" : `${summary.days} dias`}
          value={title}
        />
        <SelectionMetric
          label="Saldo ao final"
          value={formatCurrency(summary.balance)}
          negative={summary.balance < 0}
        />
        <SelectionMetric
          label="Entradas"
          value={`+${formatCurrency(summary.income)}`}
          accent="success"
        />
        <SelectionMetric
          label="Saídas"
          value={`-${formatCurrency(summary.expense)}`}
          accent="destructive"
        />
      </div>

      <div className="border-t border-border">
        {summary.transactions.length === 0 ? (
          <p className="py-4 font-mono text-xs text-muted-foreground">
            Nenhum lançamento nesse período.
          </p>
        ) : (
          summary.transactions.slice(0, 8).map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center justify-between gap-4 border-b border-border py-2.5 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate">{transaction.title}</p>
                <p className="font-mono text-[10px] text-muted-foreground">
                  {format(parseISO(transaction.date), "dd MMM", {
                    locale: ptBR,
                  })}
                  {transaction.isProjected && " · projetado"}
                </p>
              </div>
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
            </div>
          ))
        )}
        {summary.transactions.length > 8 && (
          <p className="py-3 font-mono text-[11px] text-muted-foreground">
            +{summary.transactions.length - 8} lançamentos no período.
          </p>
        )}
      </div>
    </section>
  );
}

function SelectionMetric({
  label,
  value,
  negative,
  accent,
}: {
  label: string;
  value: string;
  negative?: boolean;
  accent?: "success" | "destructive";
}) {
  return (
    <div className="bg-background p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 truncate font-mono text-sm tabular-nums",
          negative && "text-destructive",
          accent === "success" && "text-success",
          accent === "destructive" && "text-destructive",
        )}
      >
        {value}
      </p>
    </div>
  );
}
