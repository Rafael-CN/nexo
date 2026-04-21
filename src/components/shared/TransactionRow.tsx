import { Repeat } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Transaction } from "@/types";
import { useFinanceStore } from "@/store/useFinanceStore";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface TransactionRowProps {
  transaction: Transaction;
  onClick?: () => void;
}

export function TransactionRow({ transaction, onClick }: TransactionRowProps) {
  const categories = useFinanceStore((s) => s.categories);
  const accounts = useFinanceStore((s) => s.accounts);

  const cat = categories.find((c) => c.id === transaction.categoryId);
  const acc = accounts.find((a) => a.id === transaction.accountId);

  const isIncome = transaction.type === "income";
  const date = parseISO(transaction.date);
  const isProjected = transaction.date > format(new Date(), "yyyy-MM-dd");

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
      className={cn(
        "group grid grid-cols-[80px_1fr_auto] items-center gap-4 border-b border-border px-1 py-3 transition-colors last:border-b-0 hover:bg-accent/40",
        onClick && "cursor-pointer",
      )}
    >
      <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
        {format(date, "dd MMM", { locale: ptBR })}
      </span>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{transaction.title}</p>
          {isProjected && (
            <span className="font-mono text-[10px] uppercase tracking-wider text-warning">
              projetada
            </span>
          )}
          {transaction.recurrenceId && (
            <Repeat
              className="h-3 w-3 shrink-0 text-muted-foreground"
              strokeWidth={1.5}
            />
          )}
        </div>
        <p className="truncate font-mono text-[11px] text-muted-foreground">
          {acc?.name ?? "—"}
          <span className="px-1.5">·</span>
          {cat?.name ?? "—"}
        </p>
      </div>

      <p
        className={cn(
          "font-mono text-sm tabular-nums",
          isIncome ? "text-success" : "text-foreground",
        )}
      >
        {isIncome ? "+" : "−"} {formatCurrency(transaction.amount)}
      </p>
    </div>
  );
}
