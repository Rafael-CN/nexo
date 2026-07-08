import { parseCurrencyInputValue } from "@/components/shared/transactionModalUtils";
import type { Goal } from "@/types";

export interface GoalFormState {
  name: string;
  description: string;
  targetAmount: string;
  currentAmount: string;
  deadline: string;
  accountId: string;
  monthlyContribution: string;
  paused: boolean;
}

export type GoalPayloadResult =
  | { ok: true; payload: Omit<Goal, "id"> }
  | { ok: false; error: string };

/**
 * Monta o payload da meta a partir do formulário. Puro e testado —
 * todo número sai finito (nunca NaN/null onde o backend espera f64).
 */
export function buildGoalPayload(form: GoalFormState): GoalPayloadResult {
  if (!form.name.trim()) return { ok: false, error: "Informe o nome da meta." };

  const target = parseCurrencyInputValue(form.targetAmount);
  if (!target || target <= 0) {
    return { ok: false, error: "Informe a meta em R$." };
  }

  const current = parseCurrencyInputValue(form.currentAmount) ?? 0;
  const contribution = parseCurrencyInputValue(form.monthlyContribution);

  return {
    ok: true,
    payload: {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      targetAmount: target,
      currentAmount: Math.max(0, current),
      deadline: form.deadline || undefined,
      accountId: form.accountId || undefined,
      monthlyContribution:
        contribution && contribution > 0 ? contribution : undefined,
      status: form.paused ? "paused" : "active",
    },
  };
}
