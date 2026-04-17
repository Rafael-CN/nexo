import {
  Briefcase,
  Car,
  CreditCard,
  Film,
  HeartPulse,
  Home,
  Repeat,
  Sparkles,
  TrendingUp,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Transaction } from "@/types";
import { useFinanceStore } from "@/store/useFinanceStore";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const iconMap: Record<string, LucideIcon> = {
  briefcase: Briefcase,
  sparkles: Sparkles,
  "trending-up": TrendingUp,
  home: Home,
  utensils: Utensils,
  car: Car,
  film: Film,
  "heart-pulse": HeartPulse,
  repeat: Repeat,
  "credit-card": CreditCard,
};

interface TransactionRowProps {
  transaction: Transaction;
}

export function TransactionRow({ transaction }: TransactionRowProps) {
  const categories = useFinanceStore((s) => s.categories);
  const accounts = useFinanceStore((s) => s.accounts);

  const cat = categories.find((c) => c.id === transaction.categoryId);
  const acc = accounts.find((a) => a.id === transaction.accountId);
  const Icon = iconMap[cat?.icon ?? "repeat"] ?? Repeat;

  const isIncome = transaction.type === "income";
  const date = parseISO(transaction.date);

  return (
    <div className="group flex items-center gap-4 rounded-lg px-3 py-2.5 transition-colors hover:bg-accent/60">
      <div
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-white shadow-sm"
        style={{ backgroundColor: cat?.color ?? "#64748B" }}
      >
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{transaction.title}</p>
          {transaction.isProjected && (
            <Badge variant="warning" className="shrink-0 text-[10px]">
              projetada
            </Badge>
          )}
          {transaction.recurrenceId && (
            <Repeat className="h-3 w-3 shrink-0 text-muted-foreground" />
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {format(date, "d 'de' MMM", { locale: ptBR })} •{" "}
          {acc?.name ?? "—"} • {cat?.name ?? "—"}
        </p>
      </div>

      <p
        className={cn(
          "text-sm font-semibold tabular-nums",
          isIncome ? "text-success" : "text-foreground",
        )}
      >
        {isIncome ? "+" : "−"} {formatCurrency(transaction.amount)}
      </p>
    </div>
  );
}
