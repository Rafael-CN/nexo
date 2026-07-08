import { describe, expect, it } from "vitest";
import { buildGoalPayload, type GoalFormState } from "./goalModalUtils";

function form(overrides: Partial<GoalFormState> = {}): GoalFormState {
  return {
    name: "Mudança",
    description: "",
    targetAmount: "R$ 10.000,00",
    currentAmount: "",
    deadline: "",
    accountId: "",
    monthlyContribution: "",
    paused: false,
    ...overrides,
  };
}

describe("buildGoalPayload", () => {
  it("builds a valid payload with linked account and empty accumulated (regressão IPC)", () => {
    // Cenário do bug: conta vinculada desabilita o Acumulado (vazio) e o
    // NaN resultante virava null no JSON — o serde do Tauri rejeitava.
    const result = buildGoalPayload(
      form({ accountId: "acc-1", deadline: "2026-09-01" }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.currentAmount).toBe(0);
    expect(Number.isFinite(result.payload.currentAmount)).toBe(true);
    expect(Number.isFinite(result.payload.targetAmount)).toBe(true);
    expect(result.payload.monthlyContribution).toBeUndefined();
    expect(result.payload.accountId).toBe("acc-1");
  });

  it("never emits NaN in any numeric field", () => {
    const result = buildGoalPayload(
      form({ currentAmount: "", monthlyContribution: "" }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const json = JSON.parse(JSON.stringify(result.payload));
    expect(json.currentAmount).toBe(0);
    expect("monthlyContribution" in json).toBe(false);
  });

  it("parses filled optional amounts", () => {
    const result = buildGoalPayload(
      form({ currentAmount: "R$ 1.500,00", monthlyContribution: "R$ 300,00" }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.currentAmount).toBe(1500);
    expect(result.payload.monthlyContribution).toBe(300);
  });

  it("rejects missing name and missing target", () => {
    expect(buildGoalPayload(form({ name: " " }))).toMatchObject({ ok: false });
    expect(buildGoalPayload(form({ targetAmount: "" }))).toMatchObject({
      ok: false,
    });
  });

  it("maps paused flag to status", () => {
    const result = buildGoalPayload(form({ paused: true }));
    expect(result.ok && result.payload.status).toBe("paused");
  });
});
