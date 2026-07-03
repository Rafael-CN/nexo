import { useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarClock, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { findOverdueRecurrences } from "@/lib/projection";
import { formatCurrency } from "@/lib/format";
import { useFinanceStore } from "@/store/useFinanceStore";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/types";

const DISMISSED_KEY = "nexo.dismissedOccurrences.v1";
const MAX_VISIBLE = 4;

function occurrenceKey(txn: Transaction) {
  return `${txn.recurrenceId}|${txn.date}`;
}

function readDismissed(): Set<string> {
  try {
    const raw = window.localStorage.getItem(DISMISSED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function writeDismissed(keys: Set<string>) {
  try {
    // Mantém a lista pequena: só as dispensas mais recentes.
    window.localStorage.setItem(
      DISMISSED_KEY,
      JSON.stringify([...keys].slice(-200)),
    );
  } catch {
    // indisponível: a dispensa vale só para a sessão
  }
}

/**
 * Ocorrências recorrentes vencidas e não lançadas — o usuário decide:
 * lançar (vira transação real) ou dispensar (some do aviso).
 */
export function OverdueRecurrences() {
  const transactions = useFinanceStore(useShallow((s) => s.transactions));
  const rules = useFinanceStore(useShallow((s) => s.recurrenceRules));
  const addTransaction = useFinanceStore((s) => s.addTransaction);
  const [dismissed, setDismissed] = useState<Set<string>>(() => readDismissed());
  const [busy, setBusy] = useState(false);

  const overdue = useMemo(
    () =>
      findOverdueRecurrences(transactions, rules).filter(
        (txn) => !dismissed.has(occurrenceKey(txn)),
      ),
    [transactions, rules, dismissed],
  );

  if (overdue.length === 0) return null;

  async function confirmOccurrence(txn: Transaction) {
    try {
      setBusy(true);
      await addTransaction({ ...txn, id: crypto.randomUUID() });
    } finally {
      setBusy(false);
    }
  }

  async function confirmAll() {
    try {
      setBusy(true);
      for (const txn of overdue) {
        await addTransaction({ ...txn, id: crypto.randomUUID() });
      }
    } finally {
      setBusy(false);
    }
  }

  function dismissOccurrence(txn: Transaction) {
    setDismissed((current) => {
      const next = new Set(current);
      next.add(occurrenceKey(txn));
      writeDismissed(next);
      return next;
    });
  }

  return (
    <section className="border border-warning/40 bg-warning/5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-warning/20 px-4 py-3">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-warning" strokeWidth={1.5} />
          <p className="font-mono text-[11px] uppercase tracking-[0.14em]">
            {overdue.length === 1
              ? "1 lançamento previsto venceu sem registro"
              : `${overdue.length} lançamentos previstos venceram sem registro`}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1.5 rounded-sm text-xs"
          onClick={confirmAll}
          disabled={busy}
        >
          <Check className="h-3.5 w-3.5" strokeWidth={1.5} />
          Lançar todos
        </Button>
      </div>

      <div>
        {overdue.slice(0, MAX_VISIBLE).map((txn) => (
          <div
            key={txn.id}
            className="flex items-center justify-between gap-4 border-b border-warning/10 px-4 py-2.5 last:border-b-0"
          >
            <div className="min-w-0">
              <p className="selectable-text truncate text-sm">{txn.title}</p>
              <p className="font-mono text-[10px] text-muted-foreground">
                {format(parseISO(txn.date), "dd MMM yyyy", { locale: ptBR })}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span
                className={cn(
                  "selectable-text font-mono text-xs tabular-nums",
                  txn.type === "income" ? "text-success" : "text-foreground",
                )}
              >
                {txn.type === "income" ? "+" : "−"}
                {formatCurrency(txn.amount)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 font-mono text-[10px] uppercase tracking-wider"
                onClick={() => confirmOccurrence(txn)}
                disabled={busy}
              >
                Lançar
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                aria-label="Dispensar"
                onClick={() => dismissOccurrence(txn)}
                disabled={busy}
              >
                <X className="h-3.5 w-3.5" strokeWidth={1.5} />
              </Button>
            </div>
          </div>
        ))}
        {overdue.length > MAX_VISIBLE && (
          <p className="px-4 py-2 font-mono text-[10px] text-muted-foreground">
            +{overdue.length - MAX_VISIBLE} ocorrências — use "Lançar todos" ou
            trate uma a uma.
          </p>
        )}
      </div>
    </section>
  );
}
