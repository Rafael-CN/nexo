import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
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
    const todayIso = new Date().toISOString().slice(0, 10);
    return [...transactions, ...expanded]
      .filter((t) => t.date >= todayIso)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [transactions, expanded]);

  return { expanded, dailyBalances, allUpcoming, baseBalance };
}
