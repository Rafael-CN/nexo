import { useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { format, parseISO, differenceInMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Flag, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GoalModal } from "@/components/shared/GoalModal";
import {
  selectGoalsSummary,
  useFinanceStore,
} from "@/store/useFinanceStore";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Goal } from "@/types";

export function GoalsPage() {
  const goals = useFinanceStore(useShallow((s) => s.goals));
  const summary = useFinanceStore(useShallow(selectGoalsSummary));

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);

  function openNew() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(goal: Goal) {
    setEditing(goal);
    setModalOpen(true);
  }

  const sorted = useMemo(
    () =>
      [...goals].sort((a, b) => {
        if (a.deadline && b.deadline)
          return a.deadline.localeCompare(b.deadline);
        if (a.deadline) return -1;
        if (b.deadline) return 1;
        return (
          a.currentAmount / a.targetAmount -
          b.currentAmount / b.targetAmount
        );
      }),
    [goals],
  );

  const overallProgress =
    summary.totalTarget > 0
      ? Math.round((summary.totalCurrent / summary.totalTarget) * 100)
      : 0;

  return (
    <div className="space-y-10">
      <section className="flex flex-col gap-8 border-b border-border pb-10 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Metas financeiras ({summary.count})
          </p>
          <h1 className="font-mono text-5xl font-light tracking-tight md:text-6xl">
            {formatCurrency(summary.totalCurrent)}
          </h1>
          <p className="font-mono text-xs text-muted-foreground">
            de{" "}
            <span className="tabular-nums">
              {formatCurrency(summary.totalTarget)}
            </span>{" "}
            total
            <span className="px-2">·</span>
            {overallProgress}% acumulado
          </p>
        </div>

        <Button
          size="sm"
          className="gap-1.5 rounded-sm text-xs"
          onClick={openNew}
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          Nova meta
        </Button>
      </section>

      <section>
        <div className="mb-4 flex items-center gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Suas metas
          </p>
          <div className="h-px flex-1 bg-border" />
        </div>

        {sorted.length === 0 ? (
          <div className="grid place-items-center gap-3 border border-dashed border-border py-12 text-center">
            <Flag className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
            <p className="font-mono text-[11px] uppercase tracking-wider">
              Nenhuma meta cadastrada
            </p>
            <p className="text-xs text-muted-foreground">
              Crie sua primeira meta financeira para começar.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-1 gap-1.5 rounded-sm text-xs"
              onClick={openNew}
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2} />
              Nova meta
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-px overflow-hidden border border-border bg-border md:grid-cols-2">
              {sorted.map((goal) => (
                <GoalCard key={goal.id} goal={goal} onEdit={() => openEdit(goal)} />
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

      <GoalModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        goal={editing}
      />
    </div>
  );
}

function GoalCard({
  goal,
  onEdit,
}: {
  goal: Goal;
  onEdit: () => void;
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
    <div className="group relative flex flex-col gap-5 bg-background p-5 transition-colors hover:bg-accent/30">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Flag
            className="h-4 w-4 shrink-0 text-muted-foreground"
            strokeWidth={1.5}
          />
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium leading-tight">{goal.name}</p>
              {goal.status === "paused" && (
                <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">
                  pausada
                </span>
              )}
            </div>
            {goal.description && (
              <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
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
        <p className="font-mono text-2xl font-normal tabular-nums tracking-tight">
          {formatCurrency(goal.currentAmount)}
        </p>
        <p className="font-mono text-[11px] text-muted-foreground">
          meta {formatCurrency(goal.targetAmount)}
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
          <span className="tabular-nums text-muted-foreground">
            {progress}% atingido
          </span>
          <span className="tabular-nums text-muted-foreground">
            faltam {formatCurrency(remaining)}
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
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-success"
              aria-hidden
            />
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Projeção ·{" "}
              <span className="normal-case tracking-normal">
                {monthsToGoal} {monthsToGoal === 1 ? "mês" : "meses"} no ritmo
                atual
              </span>
            </p>
          </div>
        )}

        {deadlineInfo && monthsToGoal !== null && (
          <p className="font-mono text-[10px] text-muted-foreground">
            {deadlineInfo.tight ? (
              <span className="text-destructive">
                Contribuição insuficiente — precisaria de{" "}
                {formatCurrency(
                  Math.ceil(remaining / Math.max(deadlineInfo.monthsLeft, 1)),
                )}
                /mês
              </span>
            ) : (
              <span>
                No ritmo de {formatCurrency(goal.monthlyContribution ?? 0)}/mês,
                meta em {monthsToGoal} meses
              </span>
            )}
          </p>
        )}

        {account && (
          <p className="font-mono text-[10px] text-muted-foreground">
            Conta vinculada · {account.name}
          </p>
        )}

        <div className="flex justify-end pt-1">
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

function OverallProgress({ goals }: { goals: Goal[] }) {
  const active = goals.filter((g) => g.status === "active");
  if (active.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Resumo por meta
        </p>
        <div className="h-px flex-1 bg-border" />
      </div>

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
              <p className="truncate text-sm">{goal.name}</p>
              <div className="h-px bg-border">
                <div
                  className="h-px bg-foreground"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-right font-mono text-[11px] tabular-nums text-muted-foreground">
                {pct}%
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
