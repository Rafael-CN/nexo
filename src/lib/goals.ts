import { getCurrentAccountBalance } from "@/lib/balance";
import type { Account, Goal, Transaction } from "@/types";

export interface ResolvedGoal extends Goal {
  /** true quando o acumulado vem do saldo da conta vinculada. */
  isLive: boolean;
}

/**
 * Metas vivas: quando a meta tem conta vinculada, o acumulado é o
 * saldo efetivo da conta — sempre atual, sem digitação manual.
 * Sem conta vinculada, vale o valor manual da meta.
 */
export function resolveGoal(
  goal: Goal,
  accounts: Account[],
  transactions: Transaction[],
): ResolvedGoal {
  if (goal.accountId) {
    const account = accounts.find((candidate) => candidate.id === goal.accountId);
    if (account) {
      const balance = getCurrentAccountBalance(account, transactions);
      return { ...goal, currentAmount: Math.max(0, balance), isLive: true };
    }
  }
  return { ...goal, isLive: false };
}

export function resolveGoals(
  goals: Goal[],
  accounts: Account[],
  transactions: Transaction[],
): ResolvedGoal[] {
  return goals.map((goal) => resolveGoal(goal, accounts, transactions));
}
