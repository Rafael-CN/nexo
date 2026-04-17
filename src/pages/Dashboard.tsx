import { useMemo } from "react";
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
import {
  selectMonthFlow,
  selectTotalBalance,
  selectUpcomingTransactions,
  useFinanceStore,
} from "@/store/useFinanceStore";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export function DashboardPage() {
  const accounts = useFinanceStore(useShallow((s) => s.accounts));
  const transactions = useFinanceStore(useShallow((s) => s.transactions));
  const totalBalance = useFinanceStore(selectTotalBalance);
  const upcoming = useMemo(
    () =>
      selectUpcomingTransactions(
        { transactions } as Parameters<typeof selectUpcomingTransactions>[0],
        6,
      ),
    [transactions],
  );
  const monthFlow = useMemo(
    () =>
      selectMonthFlow(
        { transactions } as Parameters<typeof selectMonthFlow>[0],
      ),
    [transactions],
  );

  const savingsGoal = 20_000;
  const savings = accounts.find((a) => a.type === "savings")?.balance ?? 0;
  const savingsProgress = Math.min(
    100,
    Math.round((savings / savingsGoal) * 100),
  );

  const liquidAccounts = accounts.filter((a) => a.type !== "credit");

  return (
    <div className="space-y-10">
      <HeroBalance balance={totalBalance} accounts={liquidAccounts} />

      <SectionDivider label="Fluxo do mês" />

      <section className="grid grid-cols-1 gap-px overflow-hidden border border-border bg-border md:grid-cols-3">
        <div className="bg-background">
          <StatCard
            label="Entradas"
            value={formatCurrency(monthFlow.income)}
            delta={{ value: "+12,4% vs mês anterior", positive: true }}
            icon={ArrowUpRight}
            accent="success"
          />
        </div>
        <div className="bg-background">
          <StatCard
            label="Saídas"
            value={formatCurrency(monthFlow.expense)}
            delta={{ value: "−3,1% vs mês anterior", positive: true }}
            icon={ArrowDownLeft}
            accent="destructive"
          />
        </div>
        <div className="bg-background">
          <StatCard
            label="Próximos 14 dias"
            value={`${upcoming.length} lançamentos`}
            delta={{ value: "Ver calendário →", positive: true }}
            icon={CalendarClock}
            accent="warning"
          />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
        <UpcomingLedger transactions={upcoming} />
        <SavingsPanel
          current={savings}
          goal={savingsGoal}
          progress={savingsProgress}
        />
      </section>
    </div>
  );
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
          Saldo consolidado
        </p>
        <h1 className="font-mono text-5xl font-light tracking-tight md:text-6xl">
          {formatCurrency(balance)}
        </h1>
        <p className="font-mono text-xs text-muted-foreground">
          atualizado agora
          <span className="px-2">·</span>
          {accounts.length} contas líquidas
        </p>
      </div>

      <div className="flex divide-x divide-border overflow-hidden border border-border">
        {accounts.map((a) => (
          <div key={a.id} className="min-w-[140px] bg-background px-5 py-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {a.name}
            </p>
            <p className="mt-1 font-mono text-sm tabular-nums">
              {formatCurrency(a.balance)}
            </p>
          </div>
        ))}
      </div>
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

function UpcomingLedger({
  transactions,
}: {
  transactions: ReturnType<typeof selectUpcomingTransactions>;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <div className="flex items-center gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Próximos lançamentos
          </p>
          <div className="h-px w-12 bg-border" />
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          Ver todos →
        </Button>
      </div>

      {transactions.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="border-t border-border">
          {transactions.map((t) => (
            <TransactionRow key={t.id} transaction={t} />
          ))}
        </div>
      )}
    </div>
  );
}

function SavingsPanel({
  current,
  goal,
  progress,
}: {
  current: number;
  goal: number;
  progress: number;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Reserva de emergência
        </p>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="space-y-5 border border-border p-5">
        <div className="space-y-1">
          <p className="font-mono text-3xl font-light tabular-nums tracking-tight">
            {formatCurrency(current)}
          </p>
          <p className="font-mono text-[11px] text-muted-foreground">
            meta {formatCurrency(goal)}
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
              faltam {formatCurrency(goal - current)}
            </span>
          </div>
        </div>

        <div className="space-y-2 border-t border-border pt-4">
          <div className="flex items-center gap-2">
            <span
              className="h-1.5 w-1.5 rounded-full bg-success"
              aria-hidden
            />
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Projeção
            </p>
          </div>
          <p className="text-xs leading-relaxed">
            No ritmo atual, meta atingida em aproximadamente{" "}
            <span className={cn("font-mono tabular-nums")}>7 meses</span>.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5 rounded-sm text-xs"
        >
          <Target className="h-3.5 w-3.5" strokeWidth={1.5} />
          Ajustar meta
        </Button>
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
