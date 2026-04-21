import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { format, parseISO } from "date-fns";
import {
  computeDailyBalances,
  expandRecurring,
  PROJECTION_DAYS,
} from "@/lib/projection";
import { selectTotalBalance, useFinanceStore } from "@/store/useFinanceStore";

export function useProjection() {
  const transactions = useFinanceStore(useShallow((s) => s.transactions));
  const rules = useFinanceStore(useShallow((s) => s.recurrenceRules));
  const baseBalance = useFinanceStore(selectTotalBalance);

  const expanded = useMemo(
    () => expandRecurring(transactions, rules, PROJECTION_DAYS),
    [transactions, rules],
  );

  const dailyBalances = useMemo(
    () =>
      computeDailyBalances(
        baseBalance,
        [...transactions, ...expanded],
        PROJECTION_DAYS,
      ),
    [baseBalance, transactions, expanded],
  );

  // All upcoming occurrences (store + expanded), sorted chronologically
  const allUpcoming = useMemo(() => {
    const todayIso = format(new Date(), "yyyy-MM-dd");
    return [...transactions, ...expanded]
      .filter((t) => t.date >= todayIso)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [transactions, expanded]);

  const weeklyBalances = useMemo(
    () => summarizeBalances(dailyBalances, "week"),
    [dailyBalances],
  );

  const monthlyBalances = useMemo(
    () => summarizeBalances(dailyBalances, "month"),
    [dailyBalances],
  );

  return {
    expanded,
    dailyBalances,
    weeklyBalances,
    monthlyBalances,
    allUpcoming,
    baseBalance,
  };
}

function summarizeBalances(
  dailyBalances: Map<string, number>,
  period: "week" | "month",
) {
  const snapshots = new Map<string, { date: string; balance: number }>();

  for (const [date, balance] of dailyBalances) {
    const parsed = parseISO(date);
    const key =
      period === "week"
        ? `${format(parsed, "RRRR")}-W${format(parsed, "II")}`
        : format(parsed, "yyyy-MM");
    snapshots.set(key, { date, balance });
  }

  return Array.from(snapshots.entries()).map(([periodKey, snapshot]) => ({
    periodKey,
    ...snapshot,
  }));
}
