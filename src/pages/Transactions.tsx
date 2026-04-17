import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowDownUp, Filter, Plus } from "lucide-react";
import { TransactionRow } from "@/components/shared/TransactionRow";
import { Button } from "@/components/ui/button";
import { useFinanceStore } from "@/store/useFinanceStore";
import { formatCurrency } from "@/lib/format";
import type { Transaction } from "@/types";

export function TransactionsPage() {
  const transactions = useFinanceStore(useShallow((s) => s.transactions));

  const { groups, totals } = useMemo(() => {
    const sorted = [...transactions].sort((a, b) =>
      b.date.localeCompare(a.date),
    );
    const grouped = new Map<string, Transaction[]>();
    for (const t of sorted) {
      const list = grouped.get(t.date) ?? [];
      list.push(t);
      grouped.set(t.date, list);
    }
    const income = sorted
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + t.amount, 0);
    const expense = sorted
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + t.amount, 0);
    return {
      groups: Array.from(grouped.entries()),
      totals: { income, expense, net: income - expense, count: sorted.length },
    };
  }, [transactions]);

  return (
    <div className="space-y-10">
      <section className="flex flex-col gap-8 border-b border-border pb-10 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Transações ({totals.count})
          </p>
          <h1 className="font-mono text-4xl font-light tracking-tight md:text-5xl">
            {formatCurrency(totals.net)}
          </h1>
          <p className="font-mono text-xs text-muted-foreground">
            <span className="text-success">
              +{formatCurrency(totals.income)}
            </span>
            <span className="px-2">·</span>
            <span className="text-destructive">
              −{formatCurrency(totals.expense)}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-sm text-xs"
          >
            <Filter className="h-3.5 w-3.5" strokeWidth={1.5} />
            Filtros
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-sm text-xs"
          >
            <ArrowDownUp className="h-3.5 w-3.5" strokeWidth={1.5} />
            Ordenar
          </Button>
          <Button size="sm" className="gap-1.5 rounded-sm text-xs">
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            Nova
          </Button>
        </div>
      </section>

      <section className="space-y-8">
        {groups.map(([date, list]) => {
          const parsed = parseISO(date);
          const dayTotal = list.reduce(
            (s, t) => s + (t.type === "income" ? t.amount : -t.amount),
            0,
          );
          return (
            <div key={date} className="space-y-3">
              <div className="flex items-baseline gap-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  {format(parsed, "EEE, dd MMM yyyy", { locale: ptBR })}
                </p>
                <div className="h-px flex-1 bg-border" />
                <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                  {dayTotal >= 0 ? "+" : "−"}
                  {formatCurrency(Math.abs(dayTotal))}
                </span>
              </div>
              <div className="border-t border-border">
                {list.map((t) => (
                  <TransactionRow key={t.id} transaction={t} />
                ))}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
