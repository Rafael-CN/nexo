import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  PiggyBank,
  Repeat,
  Sparkles,
} from "lucide-react";
import {
  CashflowChart,
  CategoryRanking,
  InsightList,
  PeriodSegmentedControl,
  ReportKpiGrid,
  type CashflowChartPoint,
  type CategoryRankingItem,
  type InsightItem,
  type ReportKpiItem,
} from "@/components/reports";
import { Button } from "@/components/ui/button";
import { useProjection } from "@/hooks/useProjection";
import { formatCurrency } from "@/lib/format";
import { isEditableElement } from "@/lib/keyboardShortcuts";
import { cn } from "@/lib/utils";
import {
  aggregateTransactionsByCategory,
  buildCashflowSeries,
  compareCashFlow,
  filterTransactionsByPeriod,
  formatPercent,
  generateReportInsights,
  getPreviousPeriod,
  reportPeriodOptions,
  resolveReportPeriod,
  summarizePeriodCashFlow,
  type CashflowPoint,
  type CategoryReportItem,
  type ReportInsight,
  type ReportPeriodPreset,
} from "@/lib/reports";
import { getFinanceIconOption } from "@/components/shared/IconPicker";
import { useFinanceStore } from "@/store/useFinanceStore";

const DEFAULT_PRESET: ReportPeriodPreset = "current-month";
const RANKING_LIMIT = 6;

type RankingKind = "expense" | "income";

export function ReportsPage() {
  const [preset, setPreset] = useState<ReportPeriodPreset>(DEFAULT_PRESET);
  const [rankingKind, setRankingKind] = useState<RankingKind>("expense");
  const navigate = useNavigate();
  const transactions = useFinanceStore(useShallow((s) => s.transactions));
  const categories = useFinanceStore(useShallow((s) => s.categories));
  const { expanded } = useProjection();

  // [ e ] percorrem os períodos sem depender do foco no controle segmentado.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key !== "[" && event.key !== "]") return;
      if (isEditableElement(event.target)) return;
      if (
        event.target instanceof HTMLElement &&
        event.target.closest('[role="dialog"]')
      ) {
        return;
      }

      event.preventDefault();
      const step = event.key === "]" ? 1 : reportPeriodOptions.length - 1;
      setPreset((current) => {
        const index = reportPeriodOptions.findIndex(
          (option) => option.value === current,
        );
        return reportPeriodOptions[
          (Math.max(index, 0) + step) % reportPeriodOptions.length
        ].value;
      });
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const period = useMemo(() => resolveReportPeriod(preset), [preset]);
  const previousPeriod = useMemo(() => getPreviousPeriod(period), [period]);
  const reportTransactions = useMemo(
    () => [...transactions, ...expanded],
    [transactions, expanded],
  );
  const summary = useMemo(
    () => summarizePeriodCashFlow(reportTransactions, period),
    [reportTransactions, period],
  );
  const comparison = useMemo(
    () => compareCashFlow(reportTransactions, period),
    [reportTransactions, period],
  );
  const categoryRanking = useMemo(
    () =>
      aggregateTransactionsByCategory({
        transactions: reportTransactions,
        categories,
        period,
        previousPeriod,
        kind: rankingKind,
      }),
    [categories, period, previousPeriod, rankingKind, reportTransactions],
  );
  const expenseRanking = useMemo(
    () =>
      rankingKind === "expense"
        ? categoryRanking
        : aggregateTransactionsByCategory({
            transactions: reportTransactions,
            categories,
            period,
            previousPeriod,
            kind: "expense",
          }),
    [categoryRanking, categories, period, previousPeriod, rankingKind, reportTransactions],
  );
  const cashflow = useMemo(
    () => bucketCashflowSeries(buildCashflowSeries(reportTransactions, period)),
    [period, reportTransactions],
  );
  const insights = useMemo(
    () =>
      generateReportInsights({
        transactions: reportTransactions,
        categories,
        period,
      }),
    [categories, period, reportTransactions],
  );
  const periodTransactions = useMemo(
    () => filterTransactionsByPeriod(reportTransactions, period),
    [period, reportTransactions],
  );

  const hasData = periodTransactions.some(
    (transaction) => transaction.type !== "transfer",
  );
  const topExpense = expenseRanking[0];
  const recurringExpense = useMemo(
    () =>
      periodTransactions
        .filter(
          (transaction) =>
            transaction.type === "expense" && transaction.recurrenceId,
        )
        .reduce((sum, transaction) => sum + transaction.amount, 0),
    [periodTransactions],
  );

  const kpis: ReportKpiItem[] = [
    {
      label: "Entradas",
      value: formatCurrency(summary.income),
      delta: buildDelta(comparison.incomeDeltaPct),
      icon: ArrowUpRight,
      tone: "positive",
    },
    {
      label: "Saídas",
      value: formatCurrency(summary.expense),
      delta: buildDelta(comparison.expenseDeltaPct),
      icon: ArrowDownLeft,
      tone:
        summary.expense > comparison.previous.expense ? "negative" : "neutral",
    },
    {
      label: "Economia",
      value:
        summary.savingsRate === null
          ? "—"
          : formatPercent(summary.savingsRate),
      note:
        summary.savingsRate === null
          ? "Sem receita no período"
          : "das entradas ficou em caixa",
      icon: PiggyBank,
      tone:
        summary.savingsRate !== null && summary.savingsRate >= 0.2
          ? "positive"
          : "neutral",
    },
    {
      label: "Recorrentes",
      value: formatCurrency(recurringExpense),
      note:
        summary.expense > 0
          ? `${formatPercent(recurringExpense / summary.expense)} das saídas`
          : "sem saídas no período",
      icon: Repeat,
      tone:
        summary.expense > 0 && recurringExpense / summary.expense >= 0.45
          ? "warning"
          : "neutral",
    },
  ];

  return (
    <div className="space-y-10">
      <section className="flex flex-col gap-6 border-b border-border pb-10 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Resultado do período
          </p>
          <h1
            className={cn(
              "selectable-text font-mono text-4xl font-light tracking-tight md:text-5xl",
              summary.net < 0 && "text-destructive",
            )}
          >
            {formatCurrency(summary.net)}
          </h1>
          <p className="font-mono text-xs text-muted-foreground">
            {period.label}
            <span className="px-2">·</span>
            comparando com {previousPeriod.label.toLowerCase()}
          </p>
        </div>

        <div className="flex flex-col gap-2 xl:items-end">
          <PeriodSegmentedControl
            value={preset}
            options={reportPeriodOptions.map((option) => ({
              ...option,
              shortLabel: option.label.replace("Mês ", ""),
            }))}
            onValueChange={(value) => setPreset(value as ReportPeriodPreset)}
          />
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
            [ e ] trocam o período
          </p>
        </div>
      </section>

      {!hasData ? (
        <EmptyReportsState onUseCurrentMonth={() => setPreset(DEFAULT_PRESET)} />
      ) : (
        <>
          <ReportKpiGrid items={kpis} />

          <section className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
            <CashflowChart title="Fluxo do período" points={cashflow} />
            <InsightList
              title="Leituras do período"
              items={insights.slice(0, 3).map(mapInsight)}
            />
          </section>

          <section className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
            <CategoryRanking
              title="Categorias"
              items={buildRankingItems(
                categoryRanking,
                rankingKind,
                preset === "current-month" || preset === "last-month",
              )}
              emptyLabel={
                rankingKind === "expense"
                  ? "Sem despesas no período."
                  : "Sem receitas no período."
              }
              headerSlot={
                <KindToggle value={rankingKind} onChange={setRankingKind} />
              }
            />

            <TopCategoryPanel
              item={topExpense}
              onOpenCalendar={() => navigate("/calendario")}
            />
          </section>
        </>
      )}
    </div>
  );
}

function KindToggle({
  value,
  onChange,
}: {
  value: RankingKind;
  onChange: (value: RankingKind) => void;
}) {
  return (
    <div className="inline-flex border border-border bg-transparent p-px">
      {(
        [
          { value: "expense", label: "Despesas" },
          { value: "income", label: "Receitas" },
        ] as const
      ).map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={option.value === value}
          className={cn(
            "px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors ui-focus-ring-inset",
            option.value === value
              ? "bg-background text-foreground"
              : "bg-muted/30 text-muted-foreground hover:bg-accent/60 hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function TopCategoryPanel({
  item,
  onOpenCalendar,
}: {
  item?: CategoryReportItem;
  onOpenCalendar: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Maior saída
        </p>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="space-y-5 border border-border bg-background p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {item ? item.name : "Sem despesas no período"}
            </p>
            {item && (
              <p className="selectable-text mt-1 font-mono text-2xl font-light tabular-nums tracking-tight">
                {formatCurrency(item.total)}
              </p>
            )}
          </div>
          <Sparkles
            className="h-4 w-4 shrink-0 text-muted-foreground"
            strokeWidth={1.5}
          />
        </div>

        {item && (
          <div className="grid grid-cols-2 gap-px overflow-hidden border border-border bg-border">
            <MiniMetric
              label="Participação"
              value={formatPercent(item.percentage)}
            />
            <MiniMetric
              label="Variação"
              value={
                item.deltaPct === null ? "Novo" : formatPercent(item.deltaPct)
              }
            />
            <MiniMetric
              label="Recorrente"
              value={formatCurrency(item.recurringTotal, true)}
            />
            <MiniMetric
              label="Previsto"
              value={formatCurrency(item.projectedTotal, true)}
            />
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5 rounded-sm text-xs"
          type="button"
          onClick={onOpenCalendar}
        >
          <CalendarClock className="h-3.5 w-3.5" strokeWidth={1.5} />
          Abrir calendário do período
        </Button>
      </div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-h-[72px] bg-background p-3.5">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="selectable-text mt-1 truncate font-mono text-sm tabular-nums">
        {value}
      </p>
    </div>
  );
}

function EmptyReportsState({
  onUseCurrentMonth,
}: {
  onUseCurrentMonth: () => void;
}) {
  return (
    <section className="grid place-items-center border border-dashed border-border py-16 text-center">
      <Sparkles className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
      <p className="mt-4 font-mono text-xs uppercase tracking-wider">
        Ainda não há dados neste período
      </p>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        Registre transações, crie recorrências ou amplie o intervalo para
        liberar o fluxo de caixa e as leituras automáticas.
      </p>
      <Button
        className="mt-5 rounded-sm text-xs"
        variant="outline"
        size="sm"
        onClick={onUseCurrentMonth}
      >
        Ver mês atual
      </Button>
    </section>
  );
}

function buildRankingItems(
  ranking: CategoryReportItem[],
  kind: RankingKind,
  budgetApplies: boolean,
): CategoryRankingItem[] {
  const visible = ranking.slice(0, RANKING_LIMIT);
  const rest = ranking.slice(RANKING_LIMIT);
  const items: CategoryRankingItem[] = visible.map((item) => {
    const budgetUsage =
      budgetApplies && kind === "expense" && item.monthlyBudget
        ? item.total / item.monthlyBudget
        : null;

    return {
      label: item.name,
      amount: item.total,
      share: item.percentage * 100,
      meta:
        budgetUsage !== null
          ? `${formatPercent(budgetUsage)} do orçamento`
          : item.deltaPct === null
            ? "novo"
            : item.deltaPct === 0
              ? undefined
              : `${item.deltaPct > 0 ? "+" : ""}${formatPercent(item.deltaPct)}`,
      icon: getFinanceIconOption(item.icon).icon,
      tone:
        budgetUsage !== null
          ? budgetUsage >= 1
            ? "negative"
            : budgetUsage >= 0.85
              ? "warning"
              : "positive"
          : rankingTone(item, kind),
    };
  });

  if (rest.length > 0) {
    const restTotal = rest.reduce((sum, item) => sum + item.total, 0);
    const restShare = rest.reduce((sum, item) => sum + item.percentage, 0);
    items.push({
      label: `Outras (${rest.length})`,
      amount: restTotal,
      share: restShare * 100,
      meta: undefined,
      icon: undefined,
      tone: "neutral",
    });
  }

  return items;
}

function rankingTone(
  item: CategoryReportItem,
  kind: RankingKind,
): CategoryRankingItem["tone"] {
  if (item.delta === 0) return "neutral";
  const grew = item.delta > 0;
  if (kind === "expense") return grew ? "warning" : "positive";
  return grew ? "positive" : "warning";
}

function buildDelta(value: number | null): ReportKpiItem["delta"] {
  if (value === null) return undefined;
  const direction: "up" | "down" | "flat" =
    value > 0 ? "up" : value < 0 ? "down" : "flat";
  return {
    value: `${formatPercent(Math.abs(value))} vs anterior`,
    direction,
  };
}

function mapInsight(insight: ReportInsight): InsightItem {
  return {
    title: insight.title,
    description: insight.description,
    meta: insight.value,
    tone:
      insight.tone === "success"
        ? "positive"
        : insight.tone === "danger"
          ? "negative"
          : insight.tone,
  };
}

/**
 * Reduz a série diária para uma granularidade legível:
 * até 31 dias mantém diário, até ~4 meses agrupa por semana,
 * acima disso agrupa por mês.
 */
function bucketCashflowSeries(points: CashflowPoint[]): CashflowChartPoint[] {
  if (points.length <= 31) {
    return points.map((point) => ({
      label: point.label,
      inflow: point.income,
      outflow: point.expense,
    }));
  }

  const byMonth = points.length > 120;
  const buckets = new Map<string, CashflowChartPoint>();

  for (const point of points) {
    const date = parseISO(point.date);
    const key = byMonth
      ? format(date, "yyyy-MM")
      : `${format(date, "RRRR")}-${format(date, "II")}`;
    const entry = buckets.get(key) ?? {
      label: byMonth
        ? format(date, "MMM", { locale: ptBR })
        : `sem. ${point.label}`,
      inflow: 0,
      outflow: 0,
    };
    entry.inflow += point.income;
    entry.outflow += point.expense;
    buckets.set(key, entry);
  }

  return Array.from(buckets.values());
}
