import { useEffect, useMemo, useState } from "react";
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
import { ChevronLeft, ChevronRight, MoveRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { TransactionModal } from "@/components/shared/TransactionModal";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { dsShadow } from "@/lib/designSystem";
import { toast } from "@/store/useToastStore";
import {
  isDateInRange,
  normalizeDateRange,
  summarizeSelectedRange,
  type SelectedRangeSummary,
} from "@/lib/calendarSelection";
import { isEditableElement } from "@/lib/keyboardShortcuts";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useProjection } from "@/hooks/useProjection";
import type { Transaction } from "@/types";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { dsHeroOverline, dsHeroValue } from "@/lib/designSystem";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

type Selection = {
  start: string;
  end: string;
};

export function CalendarPage() {
  const accounts = useFinanceStore(useShallow((s) => s.accounts));
  const transactions = useFinanceStore(useShallow((s) => s.transactions));
  const updateTransaction = useFinanceStore((s) => s.updateTransaction);
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
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  /** Lançamento "recortado" (X) aguardando o dia de destino (V). */
  const [moving, setMoving] = useState<Transaction | null>(null);

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

  function openEditTransaction(candidate: Transaction) {
    // Só lançamentos reais são editáveis — projeções vêm da recorrência.
    const real = transactions.find((t) => t.id === candidate.id);
    if (!real) {
      toast("Projeções não são editáveis — ajuste a recorrência de origem.");
      return;
    }
    setEditingTransaction(real);
  }

  /** X: recorta a linha focada do painel ou o primeiro lançamento real do dia. */
  function cutTransaction() {
    const el = document.activeElement;
    const panelId =
      el instanceof HTMLElement ? el.dataset.panelTxnId : undefined;
    const dayItems = byDate.get(selection.end) ?? [];
    const candidate = panelId
      ? [...transactions, ...dayItems].find((t) => t.id === panelId)
      : dayItems.find((t) => !t.isProjected);

    if (!candidate) {
      toast("Nenhum lançamento real neste dia para mover.");
      return;
    }
    const real = transactions.find((t) => t.id === candidate.id);
    if (!real) {
      toast("Projeções não podem ser movidas — ajuste a recorrência.");
      return;
    }
    setMoving(real);
  }

  /** V: solta o lançamento recortado no dia selecionado. */
  async function dropTransaction() {
    if (!moving) return;
    const targetDate = selection.end;
    if (targetDate === moving.date) {
      setMoving(null);
      return;
    }
    const previousDate = moving.date;
    const movedId = moving.id;
    const movedTitle = moving.title;
    await updateTransaction(movedId, { date: targetDate });
    setMoving(null);
    toast(
      `"${movedTitle}" movida para ${format(parseISO(targetDate), "dd MMM", {
        locale: ptBR,
      })}.`,
      {
        actionLabel: "Desfazer",
        onAction: () => updateTransaction(movedId, { date: previousDate }),
      },
    );
  }

  // Intensidade do heatmap (D2): movimento absoluto do dia vs pico do grid.
  const heatByDate = useMemo(() => {
    const totals = new Map<string, number>();
    for (const day of days) {
      const iso = formatISO(day, { representation: "date" });
      const net = (byDate.get(iso) ?? []).reduce((sum, t) => {
        if (t.type === "income") return sum + t.amount;
        if (t.type === "expense") return sum - t.amount;
        return sum;
      }, 0);
      totals.set(iso, net);
    }
    const peak = Math.max(...[...totals.values()].map(Math.abs), 1);
    const heat = new Map<string, string>();
    for (const [iso, net] of totals) {
      if (net === 0) continue;
      const ratio = Math.abs(net) / peak;
      const level = ratio > 0.66 ? 3 : ratio > 0.33 ? 2 : 1;
      heat.set(
        iso,
        net < 0
          ? ["bg-destructive/[0.04]", "bg-destructive/[0.09]", "bg-destructive/[0.16]"][level - 1]
          : ["bg-success/[0.05]", "bg-success/[0.10]", "bg-success/[0.17]"][level - 1],
      );
    }
    return heat;
  }, [days, byDate]);

  // Navegação por teclado: setas movem o cursor (fim da seleção),
  // Shift estende, Enter/N cria lançamento, T volta a hoje,
  // PageUp/PageDown trocam o mês; X recorta e V solta (mover lançamento).
  useEffect(() => {
    function moveCursor(days: number, extend: boolean) {
      setSelection((current) => {
        const nextIso = formatISO(addDays(parseISO(current.end), days), {
          representation: "date",
        });
        setViewMonth((month) =>
          isSameMonth(parseISO(nextIso), month)
            ? month
            : startOfMonth(parseISO(nextIso)),
        );
        return extend
          ? { start: current.start, end: nextIso }
          : { start: nextIso, end: nextIso };
      });
      setIsSelecting(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented) return;
      if (transactionModalOpen) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (isEditableElement(event.target)) return;
      if (
        event.target instanceof HTMLElement &&
        event.target.closest(
          '[role="dialog"], [data-radix-popper-content-wrapper], [data-picker-popover]',
        )
      ) {
        return;
      }

      switch (event.key) {
        case "ArrowLeft":
          moveCursor(-1, event.shiftKey);
          break;
        case "ArrowRight":
          moveCursor(1, event.shiftKey);
          break;
        case "ArrowUp":
          moveCursor(-7, event.shiftKey);
          break;
        case "ArrowDown":
          moveCursor(7, event.shiftKey);
          break;
        case "PageUp":
          setViewMonth((month) => subMonths(month, 1));
          break;
        case "PageDown":
          setViewMonth((month) => addMonths(month, 1));
          break;
        case "Enter":
          if (event.repeat) return;
          // Enter numa linha do painel é o clique nativo (editar).
          if (
            event.target instanceof HTMLElement &&
            event.target.closest("[data-panel-txn-id]")
          ) {
            return;
          }
          if (moving) {
            void dropTransaction();
            break;
          }
          openTransactionModal(selection.end);
          break;
        case "n":
        case "N":
          if (event.repeat) return;
          openTransactionModal(selection.end);
          break;
        case "x":
        case "X":
          if (event.repeat) return;
          cutTransaction();
          break;
        case "v":
        case "V":
          if (event.repeat) return;
          if (!moving) return;
          void dropTransaction();
          break;
        case "Escape":
          if (!moving) return;
          setMoving(null);
          break;
        case "t":
        case "T":
          if (event.repeat) return;
          setViewMonth(startOfMonth(startOfToday()));
          setSelection({ start: todayIso, end: todayIso });
          break;
        default:
          return;
      }

      event.preventDefault();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection.end, transactionModalOpen, todayIso, moving, byDate, transactions]);

  return (
    <div className="space-y-10">
      <section className="flex flex-col gap-6 border-b border-border pb-8 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-3">
          <p className={dsHeroOverline}>
            Projeção mensal
          </p>
          <h1 className={`capitalize ${dsHeroValue}`}>
            {format(viewMonth, "MMMM yyyy", { locale: ptBR })}
          </h1>
          <p className="font-mono text-xs text-muted-foreground">
            {projectedCount} lançamentos projetados no período
          </p>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="grid grid-cols-2 overflow-hidden border border-border bg-background font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
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

      {/* D1: grade + painel do período lado a lado em telas largas. */}
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
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
                  // Heatmap (D2): intensidade segue o movimento do dia.
                  heatByDate.get(iso),
                  !inMonth && "bg-muted/10",
                  dayIsToday && "bg-accent/30",
                  selected && "bg-muted/70 text-foreground ring-1 ring-inset ring-foreground/15 hover:bg-muted/80",
                  !selected && "hover:bg-accent/40",
                  moving?.date === iso &&
                    "ring-1 ring-inset ring-warning/60",
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
                            : transaction.type === "transfer"
                              ? "bg-muted-foreground"
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
          <Legend color="bg-muted-foreground" label="Transferência" />
          <span>·</span>
          <span>fundo = intensidade do dia</span>
          <span>·</span>
          <span className="normal-case tracking-normal text-muted-foreground/70">
            Setas movem o dia · Shift estende · Enter lança · X/V move · T hoje
          </span>
        </div>
        </section>

        <SelectionSummary
          summary={selectedSummary}
          movingId={moving?.id ?? null}
          onEditTransaction={openEditTransaction}
          className="xl:sticky xl:top-6 xl:self-start"
        />
      </div>

      {moving && (
        <div
          className={cn(
            "fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 border border-border bg-background px-4 py-2.5",
            dsShadow,
            "animate-in fade-in-0 slide-in-from-bottom-2 duration-150",
          )}
        >
          <MoveRight
            className="h-3.5 w-3.5 shrink-0 text-warning"
            strokeWidth={1.5}
          />
          <span className="max-w-64 truncate font-mono text-[11px] uppercase tracking-[0.14em]">
            Movendo "{moving.title}"
          </span>
          <span className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
            escolha o dia e <Kbd>V</Kbd> solta · <Kbd>Esc</Kbd> cancela
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            aria-label="Cancelar movimentação"
            onClick={() => setMoving(null)}
          >
            <X className="h-3.5 w-3.5" strokeWidth={1.5} />
          </Button>
        </div>
      )}

      <TransactionModal
        open={transactionModalOpen}
        onOpenChange={setTransactionModalOpen}
        initialDate={transactionDate}
      />
      <TransactionModal
        open={editingTransaction !== null}
        onOpenChange={(open) => {
          if (!open) setEditingTransaction(null);
        }}
        transaction={editingTransaction}
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
    <div className="min-w-[104px] border-r border-border bg-background px-3 py-2 last:border-r-0">
      <p>{label}</p>
      <p
        className={cn(
          "money mt-1 text-xs tabular-nums text-foreground",
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

function SelectionSummary({
  summary,
  movingId,
  onEditTransaction,
  className,
}: {
  summary: SelectedRangeSummary;
  /** Lançamento recortado (X) — destacado enquanto aguarda o destino. */
  movingId: string | null;
  onEditTransaction: (transaction: Transaction) => void;
  className?: string;
}) {
  const title =
    summary.start === summary.end
      ? format(parseISO(summary.start), "dd MMM yyyy", { locale: ptBR })
      : `${format(parseISO(summary.start), "dd MMM", {
          locale: ptBR,
        })} - ${format(parseISO(summary.end), "dd MMM yyyy", {
          locale: ptBR,
        })}`;

  return (
    <section className={cn("space-y-4", className)}>
      <SectionHeader label="Período selecionado" />

      <div className="grid grid-cols-2 gap-px overflow-hidden border border-border bg-background">
        <SelectionMetric
          label={summary.days === 1 ? "Data" : `${summary.days} dias`}
          value={title}
        />
        <SelectionMetric
          label="Saldo ao final"
          value={formatCurrency(summary.balance)}
          negative={summary.balance < 0}
          money
        />
        <SelectionMetric
          label="Entradas"
          value={`+${formatCurrency(summary.income)}`}
          accent="success"
          money
        />
        <SelectionMetric
          label="Saídas"
          value={`-${formatCurrency(summary.expense)}`}
          accent="destructive"
          money
        />
      </div>

      <div className="border-t border-border">
        {summary.transactions.length === 0 ? (
          <p className="py-4 font-mono text-xs text-muted-foreground">
            Nenhum lançamento nesse período.
          </p>
        ) : (
          summary.transactions.slice(0, 8).map((transaction) => (
            <button
              key={transaction.id}
              type="button"
              data-panel-txn-id={transaction.id}
              onClick={() => onEditTransaction(transaction)}
              className={cn(
                "flex w-full items-center justify-between gap-4 border-b border-border px-1 py-2.5 text-left text-sm transition-colors hover:bg-accent/30 ui-focus-ring-inset",
                movingId === transaction.id &&
                  "bg-warning/5 ring-1 ring-inset ring-warning/50",
              )}
            >
              <div className="min-w-0">
                <p className="selectable-text truncate">{transaction.title}</p>
                <p className="selectable-text font-mono text-[10px] text-muted-foreground">
                  {format(parseISO(transaction.date), "dd MMM", {
                    locale: ptBR,
                  })}
                  {transaction.isProjected && " · projetado"}
                  {movingId === transaction.id && " · movendo"}
                </p>
              </div>
              <span
                className={cn(
                  "selectable-text money font-mono tabular-nums",
                  transaction.type === "income"
                    ? "text-success"
                    : transaction.type === "transfer"
                      ? "text-muted-foreground"
                      : "text-foreground",
                )}
              >
                {transaction.type === "income"
                  ? "+"
                  : transaction.type === "transfer"
                    ? "⇄ "
                    : "-"}
                {formatCurrency(transaction.amount)}
              </span>
            </button>
          ))
        )}
        {summary.transactions.length > 8 && (
          <p className="py-3 font-mono text-[11px] text-muted-foreground">
            +{summary.transactions.length - 8} lançamentos no período.
          </p>
        )}
      </div>

      <p className="font-mono text-[10px] text-muted-foreground">
        Clique edita · X recorta o lançamento · V solta no dia selecionado
      </p>
    </section>
  );
}

function SelectionMetric({
  label,
  value,
  negative,
  accent,
  money = false,
}: {
  label: string;
  value: string;
  negative?: boolean;
  accent?: "success" | "destructive";
  money?: boolean;
}) {
  return (
    <div className="min-h-[88px] bg-background p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "selectable-text mt-2 truncate font-mono text-sm tabular-nums",
          money && "money",
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
