import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  formatISO,
  parseISO,
} from "date-fns";
import type { RecurrenceRule, Transaction } from "@/types";

export const PROJECTION_DAYS = 90;

/**
 * Expands recurrence rules into synthetic future Transaction objects.
 *
 * Strategy: for each recurrenceId, find the latest existing occurrence in the
 * store (real or already-projected). Generate all subsequent occurrences from
 * nextDate = advance(latestDate) through the horizon. This guarantees zero
 * overlap with transactions already stored.
 */
export function expandRecurring(
  transactions: Transaction[],
  rules: RecurrenceRule[],
  horizonDays = PROJECTION_DAYS,
): Transaction[] {
  const todayIso = formatISO(new Date(), { representation: "date" });
  const horizonIso = formatISO(addDays(new Date(), horizonDays), {
    representation: "date",
  });

  const ruleMap = new Map(rules.map((r) => [r.id, r]));

  // Find the latest occurrence per recurrenceId to use as anchor
  const latestByRule = new Map<string, Transaction>();
  for (const t of transactions) {
    if (!t.recurrenceId) continue;
    const prev = latestByRule.get(t.recurrenceId);
    if (!prev || t.date > prev.date) latestByRule.set(t.recurrenceId, t);
  }

  const expanded: Transaction[] = [];

  for (const [ruleId, anchor] of latestByRule) {
    const rule = ruleMap.get(ruleId);
    if (!rule) continue;

    let next = advance(parseISO(anchor.date), rule);
    let guard = 0;

    while (formatISO(next, { representation: "date" }) <= horizonIso) {
      const isoDate = formatISO(next, { representation: "date" });
      if (rule.until && isoDate > rule.until)
        break;
      if (++guard > 120) break; // safety cap

      if (isoDate > todayIso) {
        expanded.push({
          ...anchor,
          id: `${ruleId}_exp_${isoDate}`,
          date: isoDate,
          isProjected: true,
        });
      }

      next = advance(next, rule);
    }
  }

  return expanded;
}

/**
 * Ocorrências recorrentes que já venceram sem serem materializadas:
 * ficam entre a última ocorrência registrada e hoje. São candidatas
 * a confirmação manual ("lançar") no painel inicial.
 */
export function findOverdueRecurrences(
  transactions: Transaction[],
  rules: RecurrenceRule[],
  todayIso = formatISO(new Date(), { representation: "date" }),
): Transaction[] {
  const ruleMap = new Map(rules.map((r) => [r.id, r]));

  const latestByRule = new Map<string, Transaction>();
  for (const t of transactions) {
    if (!t.recurrenceId) continue;
    const prev = latestByRule.get(t.recurrenceId);
    if (!prev || t.date > prev.date) latestByRule.set(t.recurrenceId, t);
  }

  const overdue: Transaction[] = [];

  for (const [ruleId, anchor] of latestByRule) {
    const rule = ruleMap.get(ruleId);
    if (!rule) continue;

    let next = advance(parseISO(anchor.date), rule);
    let guard = 0;

    while (true) {
      const isoDate = formatISO(next, { representation: "date" });
      if (isoDate > todayIso) break;
      if (rule.until && isoDate > rule.until) break;
      if (++guard > 120) break;

      overdue.push({
        ...anchor,
        id: `${ruleId}_due_${isoDate}`,
        date: isoDate,
        isProjected: false,
      });

      next = advance(next, rule);
    }
  }

  return overdue.sort((a, b) => a.date.localeCompare(b.date));
}

function advance(date: Date, rule: RecurrenceRule): Date {
  switch (rule.frequency) {
    case "daily":   return addDays(date, rule.interval);
    case "weekly":  return addWeeks(date, rule.interval);
    case "monthly": return addMonths(date, rule.interval);
    case "yearly":  return addYears(date, rule.interval);
  }
}

/**
 * Walks forward from tomorrow, accumulating net cash-flow from all future
 * transactions (store projected + expanded recurring). Returns a Map of
 * ISO-date → projected end-of-day liquid balance.
 *
 * baseBalance: total liquid balance as of end-of-today (from the store).
 * Credit card balances are excluded; transfers are ignored.
 */
export function computeDailyBalances(
  baseBalance: number,
  allTransactions: Transaction[],
  horizonDays = PROJECTION_DAYS,
): Map<string, number> {
  const todayIso = formatISO(new Date(), { representation: "date" });
  const horizonIso = formatISO(addDays(new Date(), horizonDays), {
    representation: "date",
  });

  // Index future transactions by date
  const byDate = new Map<string, Transaction[]>();
  for (const t of allTransactions) {
    if (t.date <= todayIso || t.date > horizonIso) continue;
    if (t.type === "transfer") continue;
    const list = byDate.get(t.date) ?? [];
    list.push(t);
    byDate.set(t.date, list);
  }

  const balances = new Map<string, number>();
  let running = baseBalance;
  let cursor = addDays(new Date(), 1);

  while (formatISO(cursor, { representation: "date" }) <= horizonIso) {
    const iso = formatISO(cursor, { representation: "date" });
    for (const t of byDate.get(iso) ?? []) {
      running += t.type === "income" ? t.amount : -t.amount;
    }
    balances.set(iso, running);
    cursor = addDays(cursor, 1);
  }

  return balances;
}
