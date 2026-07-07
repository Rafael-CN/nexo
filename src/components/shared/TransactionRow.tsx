import { ArrowRightLeft, Repeat, StickyNote } from "lucide-react";
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
  const destination = accounts.find(
    (a) => a.id === transaction.transferAccountId,
  );

  const isIncome = transaction.type === "income";
  const isTransfer = transaction.type === "transfer";
  const date = parseISO(transaction.date);
  const isProjected = transaction.date > format(new Date(), "yyyy-MM-dd");

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      data-txn-row={onClick ? "" : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
      className={cn(
        "group grid grid-cols-[88px_minmax(0,1fr)_auto] items-center gap-4 border-b border-border px-3 py-3 transition-colors last:border-b-0 hover:bg-accent/30 ui-focus-ring-inset",
        onClick && "cursor-pointer",
      )}
    >
      <div className="space-y-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {format(date, "EEE", { locale: ptBR })}
        </p>
        <p className="font-mono text-xs uppercase tracking-wider text-foreground/80">
          {format(date, "dd MMM", { locale: ptBR })}
        </p>
      </div>

      <div className="min-w-0 space-y-1">
        <div className="flex min-w-0 items-center gap-2">
          <p className="selectable-text truncate text-sm font-medium leading-tight">
            {transaction.title}
          </p>
          {isProjected && (
            <span className="shrink-0 border border-warning/30 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-warning">
              projetada
            </span>
          )}
          {transaction.recurrenceId && (
            <Repeat
              className="h-3 w-3 shrink-0 text-muted-foreground"
              strokeWidth={1.5}
            />
          )}
          {transaction.notes && (
            <StickyNote
              className="h-3 w-3 shrink-0 text-muted-foreground"
              strokeWidth={1.5}
              aria-label={`Nota: ${transaction.notes}`}
            >
              <title>{transaction.notes}</title>
            </StickyNote>
          )}
        </div>
        <p className="selectable-text truncate font-mono text-[11px] text-muted-foreground">
          {isTransfer ? (
            <>
              {acc?.name ?? "—"}
              <span className="px-1.5 text-muted-foreground/60">→</span>
              {destination?.name ?? "—"}
            </>
          ) : (
            <>
              {acc?.name ?? "—"}
              <span className="px-1.5 text-muted-foreground/60">·</span>
              {cat?.name ?? "—"}
            </>
          )}
        </p>
      </div>

      <p
        className={cn(
          "selectable-text money flex min-w-[112px] items-center justify-end gap-1.5 text-right font-mono text-sm tabular-nums",
          isIncome
            ? "text-success"
            : isTransfer
              ? "text-muted-foreground"
              : "text-foreground",
        )}
      >
        {isTransfer ? (
          <ArrowRightLeft
            className="h-3 w-3 shrink-0"
            strokeWidth={1.5}
            aria-label="Transferência"
          />
        ) : isIncome ? (
          "+"
        ) : (
          "−"
        )}{" "}
        {formatCurrency(transaction.amount)}
      </p>
    </div>
  );
}
