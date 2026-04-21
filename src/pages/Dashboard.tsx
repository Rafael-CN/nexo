import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  Target,
} from "lucide-react";
import { StatCard } from "@/components/shared/StatCard";
import { TransactionRow } from "@/components/shared/TransactionRow";
import { Button } from "@/components/ui/button";
import { getCurrentAccountBalances } from "@/lib/balance";
import {
  getTodayIso,
  selectMonthFlow,
  selectTotalBalance,
  useFinanceStore,
} from "@/store/useFinanceStore";
import { useProjection } from "@/hooks/useProjection";
import { formatCurrency } from "@/lib/format";
import type { Goal, Transaction } from "@/types";

const UPCOMING_LIMIT = 8;
const DAYS_14 = 14;

export function DashboardPage() {
  const accounts = useFinanceStore(useShallow((s) => s.accounts));
  const transactions = useFinanceStore(useShallow((s) => s.transactions));
  const goals = useFinanceStore(useShallow((s) => s.goals));
  const totalBalance = useFinanceStore(selectTotalBalance);
  const accountBalances = useMemo(
    () => getCurrentAccountBalances(accounts, transactions),
    [accounts, transactions],
  );
  const { allUpcoming } = useProjection();

  const upcoming = useMemo(
    () => allUpcoming.slice(0, UPCOMING_LIMIT),
    [allUpcoming],
  );

  const upcoming14Count = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + DAYS_14);
    const cutoffIso = cutoff.toISOString().slice(0, 10);
    return allUpcoming.filter((t) => t.date <= cutoffIso).length;
  }, [allUpcoming]);

  const monthFlow = useMemo(
    () =>
      selectMonthFlow(
        { transactions } as Parameters<typeof selectMonthFlow>[0],
      ),
    [transactions],
  );

  const previousMonthFlow = useMemo(
    () => getMonthFlow(transactions, -1),
    [transactions],
  );

  const primaryGoal = useMemo(() => selectPrimaryGoal(goals), [goals]);
  const accountSummaries = accounts.map((account) => ({
    ...account,
    balance: accountBalances.get(account.id) ?? account.balance,
  }));

  return (
    <div className="space-y-10">
      <HeroBalance balance={totalBalance} accounts={accountSummaries} />

      <SectionDivider label="Fluxo do mês" />

      <section className="grid grid-cols-1 gap-px overflow-hidden border border-border bg-transparent md:grid-cols-3">
        <div className="bg-background">
          <StatCard
            label="Entradas"
            value={formatCurrency(monthFlow.income)}
            delta={buildMonthlyDelta(
              monthFlow.income,
              previousMonthFlow.income,
              "income",
            )}
            icon={ArrowUpRight}
            accent="success"
          />
        </div>
        <div className="bg-background">
          <StatCard
            label="Saídas"
            value={formatCurrency(monthFlow.expense)}
            delta={buildMonthlyDelta(
              monthFlow.expense,
              previousMonthFlow.expense,
              "expense",
            )}
            icon={ArrowDownLeft}
            accent="destructive"
          />
        </div>
        <div className="bg-background">
          <StatCard
            label="Próximos 14 dias"
            value={`${upcoming14Count} lançamentos`}
            icon={CalendarClock}
            accent="warning"
          />
        </div>
      </section>

      <section
        className={
          primaryGoal
            ? "grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]"
            : "grid grid-cols-1 gap-8"
        }
      >
        <UpcomingLedger transactions={upcoming} />
        {primaryGoal && <GoalPanel goal={primaryGoal} />}
      </section>
    </div>
  );
}

function getMonthFlow(transactions: Transaction[], monthOffset: number) {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const monthPrefix = `${target.getFullYear()}-${String(
    target.getMonth() + 1,
  ).padStart(2, "0")}`;
  const todayIso = getTodayIso();
  const inMonth = transactions.filter(
    (t) => t.date.startsWith(monthPrefix) && t.date <= todayIso,
  );
  const income = inMonth
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const expense = inMonth
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  return { income, expense };
}

function buildMonthlyDelta(
  current: number,
  previous: number,
  kind: "income" | "expense",
) {
  if (current <= 0 || previous <= 0) return undefined;

  const change = ((current - previous) / previous) * 100;
  const formatted = new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(Math.abs(change));
  const sign = change >= 0 ? "+" : "-";

  return {
    value: `${sign}${formatted}% vs mês anterior`,
    positive: kind === "income" ? change >= 0 : change <= 0,
  };
}

function selectPrimaryGoal(goals: Goal[]) {
  const active = goals.filter((goal) => goal.status === "active");
  if (active.length === 0) return null;

  return [...active].sort((a, b) => {
    if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
    if (a.deadline) return -1;
    if (b.deadline) return 1;
    return b.targetAmount - a.targetAmount;
  })[0];
}

function HeroBalance({
  balance,
  accounts,
}: {
  balance: number;
  accounts: { id: string; name: string; balance: number }[];
}) {
  return (
    <section className="flex flex-col gap-8 border-b border-border pb-10 md:flex-row md:items-end md:justify-between">
      <div className="space-y-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Saldo efetivo
        </p>
        <h1 className="font-mono text-5xl font-light tracking-tight md:text-6xl">
          {formatCurrency(balance)}
        </h1>
        <p className="font-mono text-xs text-muted-foreground">
          até hoje
          <span className="px-2">-</span>
          {accounts.length} contas
        </p>
      </div>

      {accounts.length > 0 && (
        <div className="flex flex-wrap gap-px border border-border bg-background">
          {accounts.map((a) => (
            <div
              key={a.id}
              className="min-w-[160px] flex-1 basis-[180px] bg-background px-4 py-3"
            >
              <p className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {a.name}
              </p>
              <p className="mt-1 font-mono text-sm tabular-nums">
                {formatCurrency(a.balance)}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function UpcomingLedger({ transactions }: { transactions: Transaction[] }) {
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex h-7 items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Próximos lançamentos
          </p>
          <div className="h-px w-12 bg-border" />
        </div>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          <Link to="/calendario">Ver todos</Link>
        </Button>
      </div>

      {transactions.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex-1 border-t border-border">
          {transactions.map((t) => (
            <TransactionRow key={t.id} transaction={t} />
          ))}
        </div>
      )}
    </div>
  );
}

function GoalPanel({ goal }: { goal: Goal }) {
  const progress = Math.min(
    100,
    Math.round((goal.currentAmount / goal.targetAmount) * 100),
  );
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
  const monthsToGoal =
    remaining > 0 && goal.monthlyContribution && goal.monthlyContribution > 0
      ? Math.ceil(remaining / goal.monthlyContribution)
      : null;

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex h-7 items-center gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Meta principal
        </p>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="flex flex-1 flex-col gap-5 border border-border p-5">
        <div className="space-y-1">
          <p className="text-sm font-medium leading-tight">{goal.name}</p>
          <p className="font-mono text-3xl font-light tabular-nums tracking-tight">
            {formatCurrency(goal.currentAmount)}
          </p>
          <p className="font-mono text-[11px] text-muted-foreground">
            meta {formatCurrency(goal.targetAmount)}
          </p>
        </div>

        <div className="space-y-2">
          <div className="h-px w-full bg-border">
            <div
              className="h-px bg-foreground"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-baseline justify-between font-mono text-[11px]">
            <span className="tabular-nums">{progress}% atingido</span>
            <span className="tabular-nums text-muted-foreground">
              faltam {formatCurrency(remaining)}
            </span>
          </div>
        </div>

        {(goal.deadline || monthsToGoal !== null || progress >= 100) && (
          <div className="space-y-2 border-t border-border pt-4">
            <div className="flex items-center gap-2">
              <span
                className="h-1.5 w-1.5 rounded-full bg-success"
                aria-hidden
              />
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Status
              </p>
            </div>
            {progress >= 100 ? (
              <p className="text-xs leading-relaxed">Meta atingida.</p>
            ) : monthsToGoal !== null ? (
              <p className="text-xs leading-relaxed">
                No ritmo cadastrado, faltam{" "}
                <span className="font-mono tabular-nums">
                  {monthsToGoal} {monthsToGoal === 1 ? "mês" : "meses"}
                </span>
                .
              </p>
            ) : goal.deadline ? (
              <p className="font-mono text-[11px] text-muted-foreground">
                prazo {goal.deadline}
              </p>
            ) : null}
          </div>
        )}

        <div className="mt-auto">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="w-full gap-1.5 rounded-sm text-xs"
          >
            <Link to="/metas">
              <Target className="h-3.5 w-3.5" strokeWidth={1.5} />
              Ajustar meta
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="grid place-items-center border border-dashed border-border py-10 text-center">
      <CalendarClock
        className="h-5 w-5 text-muted-foreground"
        strokeWidth={1.5}
      />
      <p className="mt-3 font-mono text-xs uppercase tracking-wider">
        Nada por aqui ainda
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Cadastre uma transação para começar.
      </p>
    </div>
  );
}
