import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  Eye,
  Sparkles,
  Wallet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "@/components/shared/StatCard";
import { TransactionRow } from "@/components/shared/TransactionRow";
import {
  selectMonthFlow,
  selectTotalBalance,
  selectUpcomingTransactions,
  useFinanceStore,
} from "@/store/useFinanceStore";
import { formatCurrency } from "@/lib/format";

export function DashboardPage() {
  const accounts = useFinanceStore(useShallow((s) => s.accounts));
  const transactions = useFinanceStore(useShallow((s) => s.transactions));
  const totalBalance = useFinanceStore(selectTotalBalance);
  const upcoming = useMemo(
    () =>
      selectUpcomingTransactions({ transactions } as Parameters<
        typeof selectUpcomingTransactions
      >[0], 6),
    [transactions],
  );
  const monthFlow = useMemo(
    () =>
      selectMonthFlow({ transactions } as Parameters<
        typeof selectMonthFlow
      >[0]),
    [transactions],
  );

  const savingsGoal = 20_000;
  const savings = accounts.find((a) => a.type === "savings")?.balance ?? 0;
  const savingsProgress = Math.min(100, Math.round((savings / savingsGoal) * 100));

  return (
    <div className="space-y-8">
      <HeroCard totalBalance={totalBalance} />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          label="Entradas do mês"
          value={formatCurrency(monthFlow.income)}
          delta={{ value: "+12,4% vs mês anterior", positive: true }}
          icon={ArrowUpRight}
          accent="success"
        />
        <StatCard
          label="Saídas do mês"
          value={formatCurrency(monthFlow.expense)}
          delta={{ value: "−3,1% vs mês anterior", positive: true }}
          icon={ArrowDownLeft}
          accent="destructive"
        />
        <StatCard
          label="Próximos 14 dias"
          value={`${upcoming.length} lançamentos`}
          delta={{ value: "Ver calendário", positive: true }}
          icon={CalendarClock}
          accent="warning"
        />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle>Próximas transações</CardTitle>
              <p className="text-sm text-muted-foreground">
                Lançamentos projetados e recorrências para as próximas 2
                semanas.
              </p>
            </div>
            <Button variant="ghost" size="sm" className="gap-1.5">
              <Eye className="h-4 w-4" />
              Ver tudo
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {upcoming.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="space-y-0.5">
                {upcoming.map((t) => (
                  <TransactionRow key={t.id} transaction={t} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-md bg-primary/10 text-primary">
                <Sparkles className="h-4 w-4" />
              </div>
              <CardTitle>Meta de reserva</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Reserva de emergência
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {formatCurrency(savings)}
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  / {formatCurrency(savingsGoal)}
                </span>
              </p>
            </div>

            <div className="space-y-1.5">
              <Progress value={savingsProgress} />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium">{savingsProgress}% atingido</span>
                <span className="tabular-nums">
                  faltam {formatCurrency(savingsGoal - savings)}
                </span>
              </div>
            </div>

            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Projeção: </span>
              no ritmo atual, você atinge a meta em aproximadamente
              <span className="font-medium text-foreground"> 7 meses</span>.
            </div>

            <Button variant="outline" size="sm" className="w-full gap-1.5">
              <Wallet className="h-4 w-4" />
              Ajustar meta
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function HeroCard({ totalBalance }: { totalBalance: number }) {
  const accounts = useFinanceStore((s) => s.accounts);

  return (
    <Card className="relative overflow-hidden border-0 gradient-primary text-primary-foreground shadow-float">
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background:
            "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.3) 0%, transparent 40%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.15) 0%, transparent 35%)",
        }}
      />
      <div className="relative flex flex-col gap-8 p-7 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-primary-foreground/80">
            <Sparkles className="h-3.5 w-3.5" />
            Saldo consolidado
          </p>
          <p className="mt-3 text-4xl font-semibold tabular-nums tracking-tight">
            {formatCurrency(totalBalance)}
          </p>
          <p className="mt-2 text-sm text-primary-foreground/80">
            somatório de contas não-crédito, atualizado agora.
          </p>
        </div>

        <div className="flex gap-3 md:flex-col lg:flex-row">
          {accounts
            .filter((a) => a.type !== "credit")
            .map((a) => (
              <div
                key={a.id}
                className="rounded-lg bg-white/10 px-4 py-3 backdrop-blur-sm"
              >
                <p className="text-[11px] font-medium uppercase tracking-wider text-primary-foreground/70">
                  {a.name}
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums">
                  {formatCurrency(a.balance)}
                </p>
              </div>
            ))}
        </div>
      </div>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="grid place-items-center rounded-lg border border-dashed border-border py-10 text-center">
      <CalendarClock className="h-6 w-6 text-muted-foreground" />
      <p className="mt-3 text-sm font-medium">Nada por aqui ainda</p>
      <p className="text-xs text-muted-foreground">
        Cadastre uma transação para começar.
      </p>
    </div>
  );
}
