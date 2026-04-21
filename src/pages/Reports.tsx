import { useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  PiggyBank,
  Scale,
  Sparkles,
} from "lucide-react";
import {
  CashflowBars,
  CategoryRanking,
  InsightList,
  PeriodSegmentedControl,
  ReportKpiGrid,
  type InsightItem,
  type ReportKpiItem,
} from "@/components/reports";
import { Button } from "@/components/ui/button";
import { useProjection } from "@/hooks/useProjection";
import { formatCurrency } from "@/lib/format";
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
  type ReportInsight,
  type ReportPeriodPreset,
} from "@/lib/reports";
import { getFinanceIconOption } from "@/components/shared/IconPicker";
import { useFinanceStore } from "@/store/useFinanceStore";

const DEFAULT_PRESET: ReportPeriodPreset = "current-month";

export function ReportsPage() {
  const [preset, setPreset] = useState<ReportPeriodPreset>(DEFAULT_PRESET);
  const transactions = useFinanceStore(useShallow((s) => s.transactions));
  const categories = useFinanceStore(useShallow((s) => s.categories));
  const accounts = useFinanceStore(useShallow((s) => s.accounts));
  const { expanded } = useProjection();

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
        kind: "expense",
      }),
    [categories, period, previousPeriod, reportTransactions],
  );
  const cashflow = useMemo(
    () => compactCashflowSeries(buildCashflowSeries(reportTransactions, period)),
    [period, reportTransactions],
  );
  const insights = useMemo(
    () => generateReportInsights({ transactions: reportTransactions, categories, period }),
    [categories, period, reportTransactions],
  );
  const periodTransactions = useMemo(
    () => filterTransactionsByPeriod(reportTransactions, period),
    [period, reportTransactions],
  );

  const hasData = periodTransactions.length > 0;
  const topCategory = categoryRanking[0];
  const kpis: ReportKpiItem[] = [
    {
      label: "Entradas",
      value: formatCurrency(summary.income),
      delta: buildDelta(comparison.incomeDeltaPct),
      icon: ArrowUpRight,
      tone: "positive" as const,
    },
    {
      label: "Saídas",
      value: formatCurrency(summary.expense),
      delta: buildDelta(comparison.expenseDeltaPct, true),
      icon: ArrowDownLeft,
      tone: summary.expense > comparison.previous.expense ? "negative" as const : "neutral" as const,
    },
    {
      label: "Líquido",
      value: formatCurrency(summary.net),
      delta: buildDelta(comparison.netDeltaPct),
      icon: Scale,
      tone: summary.net >= 0 ? "positive" as const : "negative" as const,
    },
    {
      label: "Economia",
      value: summary.savingsRate === null ? "Sem receita" : formatPercent(summary.savingsRate),
      note:
        summary.projectedCount > 0
          ? `${summary.projectedCount} previstos no período`
          : `${summary.count} lançamentos`,
      icon: PiggyBank,
      tone:
        summary.savingsRate !== null && summary.savingsRate >= 0.2
          ? "positive" as const
          : "neutral" as const,
    },
  ];

  return (
    <div className="space-y-10">
      <section className="flex flex-col gap-6 border-b border-border pb-8 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Relatórios e insights
          </p>
          <h1 className="max-w-3xl text-3xl font-medium tracking-tight md:text-4xl">
            Entenda o período e encontre onde agir.
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            {period.label}
            <span className="px-2">-</span>
            comparando com {previousPeriod.label.toLowerCase()}
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 xl:max-w-[420px] xl:items-end">
          <PeriodSegmentedControl
            value={preset}
            options={reportPeriodOptions.map((option) => ({
              ...option,
              shortLabel: option.label.replace("Mês ", ""),
            }))}
            onValueChange={(value) => setPreset(value as ReportPeriodPreset)}
          />
          <div className="flex flex-wrap gap-2 xl:justify-end">
            <SummaryChip label="Contas" value={`${accounts.length}`} />
            <SummaryChip label="Categorias" value={`${categories.length}`} />
            <SummaryChip
              label="Intervalo"
              value={period.label}
              className="xl:max-w-[220px]"
            />
          </div>
        </div>
      </section>

      {!hasData ? (
        <EmptyReportsState onUseCurrentMonth={() => setPreset("current-month")} />
      ) : (
        <>
          <ReportKpiGrid items={kpis} />

          <section className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
            <CashflowBars
              title="Fluxo do período"
              subtitle="Entradas acima, saídas abaixo"
              points={cashflow.map((point) => ({
                label: point.label,
                inflow: point.income,
                outflow: point.expense,
                value: point.net,
              }))}
            />

            <InsightList
              title="Leituras automáticas"
              items={insights.map(mapInsight)}
            />
          </section>

          <section className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
            <CategoryRanking
              title="Despesas por categoria"
              items={categoryRanking.slice(0, 8).map((item) => ({
                label: item.name,
                value: `${formatCurrency(item.total)} - ${formatPercent(item.percentage)}`,
                amount: item.total,
                share: item.percentage * 100,
                icon: getFinanceIconOption(item.icon).icon,
                tone:
                  item.delta > 0
                    ? "warning"
                    : item.delta < 0
                      ? "positive"
                      : "neutral",
              }))}
            />

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Ponto de atenção
                </p>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="space-y-5 border border-border bg-background p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">
                      {topCategory
                        ? `${topCategory.name} lidera as saídas`
                        : "Sem despesas no período"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {topCategory
                        ? "Use este bloco para abrir a composição mental do período: categoria, participação, recorrência e variação."
                        : "Quando houver saídas, este espaço destaca a categoria mais relevante."}
                    </p>
                  </div>
                  <Sparkles className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                </div>

                {topCategory && (
                  <div className="grid grid-cols-2 gap-px overflow-hidden border border-border bg-background">
                    <MiniMetric
                      label="Participação"
                      value={formatPercent(topCategory.percentage)}
                    />
                    <MiniMetric
                      label="Variação"
                      value={
                        topCategory.deltaPct === null
                          ? "Novo"
                          : formatPercent(topCategory.deltaPct)
                      }
                    />
                    <MiniMetric
                      label="Recorrente"
                      value={formatCurrency(topCategory.recurringTotal, true)}
                    />
                    <MiniMetric
                      label="Previsto"
                      value={formatCurrency(topCategory.projectedTotal, true)}
                    />
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5 rounded-sm text-xs"
                  type="button"
                >
                  <CalendarClock className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Abrir calendário do período
                </Button>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-h-[88px] bg-background p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 truncate font-mono text-sm tabular-nums">{value}</p>
    </div>
  );
}

function SummaryChip({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-[132px] flex-1 flex-col justify-between border border-border bg-background px-4 py-3",
        className,
      )}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 truncate font-mono text-sm tabular-nums">{value}</p>
    </div>
  );
}

function EmptyReportsState({ onUseCurrentMonth }: { onUseCurrentMonth: () => void }) {
  return (
    <section className="grid place-items-center border border-dashed border-border py-16 text-center">
      <Sparkles className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
      <p className="mt-4 font-mono text-xs uppercase tracking-wider">
        Ainda não há dados neste período
      </p>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        Registre transações, crie recorrências ou amplie o intervalo para liberar
        rankings, fluxo de caixa e insights automáticos.
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

function buildDelta(value: number | null, invertGood = false): ReportKpiItem["delta"] {
  if (value === null) return undefined;
  const direction: "up" | "down" | "flat" =
    value > 0 ? "up" : value < 0 ? "down" : "flat";
  const good = invertGood ? value <= 0 : value >= 0;
  return {
    value: `${good ? "" : ""}${formatPercent(Math.abs(value))} vs anterior`,
    direction,
  };
}

function mapInsight(insight: ReportInsight): InsightItem {
  return {
    title: insight.title,
    description: insight.description,
    meta: insight.value ?? insight.actionLabel,
    tone:
      insight.tone === "success"
        ? "positive"
        : insight.tone === "danger"
          ? "negative"
          : insight.tone,
  };
}

function compactCashflowSeries(points: CashflowPoint[], maxBuckets = 8) {
  if (points.length <= maxBuckets) return points;
  const size = Math.ceil(points.length / maxBuckets);
  const buckets: CashflowPoint[] = [];

  for (let index = 0; index < points.length; index += size) {
    const slice = points.slice(index, index + size);
    const first = slice[0];
    const last = slice[slice.length - 1];
    const income = slice.reduce((sum, point) => sum + point.income, 0);
    const expense = slice.reduce((sum, point) => sum + point.expense, 0);
    const net = income - expense;
    buckets.push({
      date: first.date,
      label: first.date === last.date ? first.label : `${first.label} - ${last.label}`,
      income,
      expense,
      net,
      runningNet: last.runningNet,
    });
  }

  return buckets;
}
