import { useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { differenceInMonths, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowRightLeft, Flag, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedCurrency } from "@/components/shared/AnimatedCurrency";
import { GoalModal } from "@/components/shared/GoalModal";
import { TransactionModal } from "@/components/shared/TransactionModal";
import {
  formatTransactionAmount,
  type TransactionModalFormState,
} from "@/components/shared/transactionModalUtils";
import { useFinanceStore } from "@/store/useFinanceStore";
import { usePaletteContext } from "@/store/usePaletteContextStore";
import { formatCurrency } from "@/lib/format";
import { resolveGoals, type ResolvedGoal } from "@/lib/goals";
import { cn } from "@/lib/utils";
import type { Goal } from "@/types";
import type { ReactNode } from "react";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { dsHeroOverline, dsHeroValue } from "@/lib/designSystem";

export function GoalsPage() {
  const goals = useFinanceStore(useShallow((s) => s.goals));
  const accounts = useFinanceStore(useShallow((s) => s.accounts));
  const transactions = useFinanceStore(useShallow((s) => s.transactions));

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [contributionDraft, setContributionDraft] =
    useState<Partial<TransactionModalFormState> | null>(null);

  usePaletteContext(
    useMemo(
      () => [
        {
          id: "goals-new",
          label: "Nova meta",
          keywords: ["criar", "meta", "objetivo"],
          run: () => {
            setEditing(null);
            setModalOpen(true);
          },
        },
      ],
      [],
    ),
  );

  function openNew() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(goal: Goal) {
    setEditing(goal);
    setModalOpen(true);
  }

  function openContribution(goal: ResolvedGoal) {
    if (!goal.accountId) return;
    const sourceAccount = accounts.find(
      (candidate) =>
        candidate.type !== "credit" &&
        !candidate.archived &&
        candidate.id !== goal.accountId,
    );
    setContributionDraft({
      type: "transfer",
      title: `Aporte ${goal.name}`,
      amount: goal.monthlyContribution
        ? formatTransactionAmount(goal.monthlyContribution)
        : "",
      accountId: sourceAccount?.id ?? "",
      transferAccountId: goal.accountId,
    });
  }

  const resolved = useMemo(
    () => resolveGoals(goals, accounts, transactions),
    [goals, accounts, transactions],
  );

  const summary = useMemo(() => {
    const active = resolved.filter((goal) => goal.status === "active");
    return {
      count: active.length,
      totalCurrent: active.reduce((sum, goal) => sum + goal.currentAmount, 0),
      totalTarget: active.reduce((sum, goal) => sum + goal.targetAmount, 0),
    };
  }, [resolved]);

  const sorted = useMemo(
    () =>
      [...resolved].sort((a, b) => {
        if (a.deadline && b.deadline) {
          return a.deadline.localeCompare(b.deadline);
        }
        if (a.deadline) return -1;
        if (b.deadline) return 1;
        return a.currentAmount / a.targetAmount - b.currentAmount / b.targetAmount;
      }),
    [resolved],
  );

  const overallProgress =
    summary.totalTarget > 0
      ? Math.round((summary.totalCurrent / summary.totalTarget) * 100)
      : 0;

  return (
    <div className="space-y-10">
      <section className="flex flex-col gap-6 border-b border-border pb-10 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <p className={dsHeroOverline}>
            Metas financeiras ({summary.count})
          </p>
          <h1 className={`selectable-text ${dsHeroValue}`}>
            <AnimatedCurrency value={summary.totalCurrent} />
          </h1>
          <p className="font-mono text-xs text-muted-foreground">
            de{" "}
            <span className="selectable-text money tabular-nums">
              {formatCurrency(summary.totalTarget)}
            </span>{" "}
            total
            <span className="px-2">·</span>
            {overallProgress}% acumulado
          </p>
        </div>

        <Button size="sm" className="gap-1.5 rounded-sm text-xs" onClick={openNew}>
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          Nova meta
        </Button>
      </section>

      <section>
        <SectionHeader className="mb-4" label="Suas metas" />

        {sorted.length === 0 ? (
          <EmptyPanel
            title="Nenhuma meta cadastrada"
            description="Crie sua primeira meta financeira para começar."
            actionLabel="Nova meta"
            onAction={openNew}
            icon={<Flag className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-px overflow-hidden border border-border bg-transparent md:grid-cols-2">
              {sorted.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onEdit={() => openEdit(goals.find((g) => g.id === goal.id) ?? goal)}
                  onContribute={() => openContribution(goal)}
                />
              ))}
            </div>

            <button
              className="mt-px flex w-full items-center justify-center gap-2 border border-t-0 border-border bg-background py-4 text-muted-foreground transition-colors hover:bg-accent/30 hover:text-foreground"
              onClick={openNew}
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span className="font-mono text-[11px] uppercase tracking-wider">
                Adicionar meta
              </span>
            </button>
          </>
        )}
      </section>

      {sorted.length > 0 && <OverallProgress goals={sorted} />}

      <GoalModal open={modalOpen} onOpenChange={setModalOpen} goal={editing} />
      <TransactionModal
        open={contributionDraft !== null}
        onOpenChange={(open) => {
          if (!open) setContributionDraft(null);
        }}
        initialType="transfer"
        initialDraft={contributionDraft ?? undefined}
      />
    </div>
  );
}

function GoalCard({
  goal,
  onEdit,
  onContribute,
}: {
  goal: ResolvedGoal;
  onEdit: () => void;
  onContribute: () => void;
}) {
  const accounts = useFinanceStore(useShallow((s) => s.accounts));
  const account = accounts.find((a) => a.id === goal.accountId);

  const progress = Math.min(
    100,
    Math.round((goal.currentAmount / goal.targetAmount) * 100),
  );
  const remaining = goal.targetAmount - goal.currentAmount;

  const monthsToGoal = useMemo(() => {
    if (!goal.monthlyContribution || goal.monthlyContribution <= 0) return null;
    return Math.ceil(remaining / goal.monthlyContribution);
  }, [remaining, goal.monthlyContribution]);

  const deadlineInfo = useMemo(() => {
    if (!goal.deadline) return null;
    const parsed = parseISO(goal.deadline);
    const monthsLeft = differenceInMonths(parsed, new Date());
    return {
      label: format(parsed, "MMM yyyy", { locale: ptBR }),
      monthsLeft,
      tight: monthsToGoal !== null && monthsToGoal > monthsLeft,
    };
  }, [goal.deadline, monthsToGoal]);

  return (
    <div className="group relative flex min-h-[240px] flex-col gap-5 bg-background p-5 transition-colors hover:bg-accent/30">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Flag className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="selectable-text truncate text-sm font-medium leading-tight">
                {goal.name}
              </p>
              {goal.status === "paused" && (
                <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">
                  pausada
                </span>
              )}
            </div>
            {goal.description && (
              <p className="selectable-text mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                {goal.description}
              </p>
            )}
          </div>
        </div>
        <span
          className={cn(
            "font-mono text-[11px] tabular-nums",
            progress >= 100 ? "text-success" : "text-muted-foreground",
          )}
        >
          {progress}%
        </span>
      </div>

      <div className="space-y-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Acumulado
        </p>
        <p className="selectable-text money font-mono text-2xl font-normal tabular-nums tracking-tight">
          {formatCurrency(goal.currentAmount)}
        </p>
        <p className="selectable-text font-mono text-[11px] text-muted-foreground">
          meta <span className="money">{formatCurrency(goal.targetAmount)}</span>
        </p>
      </div>

      <div className="space-y-2">
        <div className="h-px w-full bg-border">
          <div
            className={cn(
              "h-px transition-all",
              progress >= 100 ? "bg-success" : "bg-foreground",
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-baseline justify-between font-mono text-[11px]">
          <span className="selectable-text tabular-nums text-muted-foreground">
            {progress}% atingido
          </span>
          <span className="selectable-text tabular-nums text-muted-foreground">
            faltam <span className="money">{formatCurrency(remaining)}</span>
          </span>
        </div>
      </div>

      <div className="space-y-2 border-t border-border pt-4">
        {deadlineInfo && (
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "h-1.5 w-1.5 shrink-0 rounded-full",
                deadlineInfo.tight ? "bg-destructive" : "bg-success",
              )}
              aria-hidden
            />
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Prazo · {deadlineInfo.label}
              <span className="normal-case tracking-normal">
                {" "}
                (
                {deadlineInfo.monthsLeft > 0
                  ? `${deadlineInfo.monthsLeft} meses`
                  : "vencido"}
                )
              </span>
            </p>
          </div>
        )}

        {monthsToGoal !== null && !deadlineInfo && (
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" aria-hidden />
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Projeção ·{" "}
              <span className="normal-case tracking-normal">
                {monthsToGoal} {monthsToGoal === 1 ? "mês" : "meses"} no ritmo atual
              </span>
            </p>
          </div>
        )}

        {deadlineInfo && monthsToGoal !== null && (
          <p className="selectable-text font-mono text-[10px] text-muted-foreground">
            {deadlineInfo.tight ? (
              <span className="text-destructive">
                Contribuição insuficiente — precisaria de{" "}
                <span className="money">
                  {formatCurrency(
                    Math.ceil(remaining / Math.max(deadlineInfo.monthsLeft, 1)),
                  )}
                </span>
                /mês
              </span>
            ) : (
              <span>
                No ritmo de{" "}
                <span className="money">
                  {formatCurrency(goal.monthlyContribution ?? 0)}
                </span>
                /mês, meta em {monthsToGoal} meses
              </span>
            )}
          </p>
        )}

        {account && (
          <p className="selectable-text font-mono text-[10px] text-muted-foreground">
            Conta vinculada · {account.name}
            {goal.isLive && (
              <span className="text-success"> · saldo ao vivo</span>
            )}
          </p>
        )}

        <ContributionHistory accountId={goal.accountId} />

        <div className="flex items-center justify-end gap-1 pt-1">
          {goal.accountId && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-2 font-mono text-[10px] uppercase tracking-wider opacity-0 transition-opacity group-hover:opacity-100"
              onClick={onContribute}
            >
              <ArrowRightLeft className="h-3 w-3" strokeWidth={1.5} />
              Aportar
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 font-mono text-[10px] uppercase tracking-wider opacity-0 transition-opacity group-hover:opacity-100"
            onClick={onEdit}
          >
            Ajustar meta →
          </Button>
        </div>
      </div>
    </div>
  );
}

/** G1: últimos aportes (transferências recebidas) da conta vinculada. */
function ContributionHistory({ accountId }: { accountId?: string }) {
  const transactions = useFinanceStore(useShallow((s) => s.transactions));

  const contributions = useMemo(() => {
    if (!accountId) return [];
    const todayIso = format(new Date(), "yyyy-MM-dd");
    return transactions
      .filter(
        (t) =>
          t.type === "transfer" &&
          t.transferAccountId === accountId &&
          t.date <= todayIso,
      )
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 3);
  }, [transactions, accountId]);

  if (contributions.length === 0) return null;

  return (
    <div className="space-y-1 border-t border-border pt-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        Últimos aportes
      </p>
      {contributions.map((t) => (
        <p
          key={t.id}
          className="flex items-baseline justify-between gap-3 font-mono text-[11px]"
        >
          <span className="selectable-text truncate text-muted-foreground">
            {format(parseISO(t.date), "dd MMM yyyy", { locale: ptBR })} ·{" "}
            {t.title}
          </span>
          <span className="selectable-text money shrink-0 tabular-nums text-success">
            +{formatCurrency(t.amount)}
          </span>
        </p>
      ))}
    </div>
  );
}

function OverallProgress({ goals }: { goals: Goal[] }) {
  const active = goals.filter((g) => g.status === "active");
  if (active.length === 0) return null;

  return (
    <section className="space-y-3">
      <SectionHeader label="Resumo por meta" />

      <div className="border-t border-border">
        {active.map((goal) => {
          const pct = Math.min(
            100,
            Math.round((goal.currentAmount / goal.targetAmount) * 100),
          );

          return (
            <div
              key={goal.id}
              className="grid items-center gap-4 border-b border-border py-3 [grid-template-columns:1fr_120px_60px]"
            >
              <p className="selectable-text truncate text-sm">{goal.name}</p>
              <div className="h-px bg-border">
                <div className="h-px bg-foreground" style={{ width: `${pct}%` }} />
              </div>
              <p className="selectable-text text-right font-mono text-[11px] tabular-nums text-muted-foreground">
                {pct}%
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function EmptyPanel({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  icon: ReactNode;
}) {
  return (
    <div className="grid min-h-[280px] place-items-center border border-dashed border-border bg-accent/10 px-6 py-14 text-center">
      <div className="max-w-sm space-y-3">
        <div className="mx-auto grid h-10 w-10 place-items-center border border-border bg-background">
          {icon}
        </div>
        <p className="font-mono text-xs uppercase tracking-wider">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
        <Button
          size="sm"
          variant="outline"
          className="mt-2 gap-1.5 rounded-sm text-xs"
          onClick={onAction}
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}
