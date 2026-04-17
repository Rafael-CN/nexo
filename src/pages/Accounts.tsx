import {
  CreditCard,
  Landmark,
  PiggyBank,
  Plus,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import {
  selectCreditOutstanding,
  selectTotalBalance,
  useFinanceStore,
} from "@/store/useFinanceStore";
import type { AccountType } from "@/types";
import { cn } from "@/lib/utils";

const typeMeta: Record<AccountType, { label: string; icon: LucideIcon }> = {
  checking: { label: "Corrente", icon: Wallet },
  savings: { label: "Poupança", icon: PiggyBank },
  credit: { label: "Crédito", icon: CreditCard },
  cash: { label: "Dinheiro", icon: Landmark },
  investment: { label: "Investimento", icon: TrendingUp },
};

export function AccountsPage() {
  const accounts = useFinanceStore((s) => s.accounts);
  const totalBalance = useFinanceStore(selectTotalBalance);
  const creditOutstanding = useFinanceStore(selectCreditOutstanding);

  return (
    <div className="space-y-10">
      <section className="flex flex-col gap-8 border-b border-border pb-10 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Saldo líquido
          </p>
          <h1 className="font-mono text-5xl font-light tracking-tight md:text-6xl">
            {formatCurrency(totalBalance)}
          </h1>
          <p className="font-mono text-xs text-muted-foreground">
            {accounts.filter((a) => a.type !== "credit").length} contas líquidas
            <span className="px-2">·</span>
            crédito em aberto{" "}
            <span className="tabular-nums">
              {formatCurrency(creditOutstanding)}
            </span>
          </p>
        </div>

        <Button size="sm" className="gap-1.5 rounded-sm text-xs">
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          Nova conta
        </Button>
      </section>

      <section>
        <div className="mb-4 flex items-center gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Contas ({accounts.length})
          </p>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="grid grid-cols-1 gap-px overflow-hidden border border-border bg-border md:grid-cols-2 xl:grid-cols-3">
          {accounts.map((acc) => {
            const meta = typeMeta[acc.type];
            const Icon = meta.icon;
            const isNegative = acc.balance < 0;

            return (
              <div
                key={acc.id}
                className="group flex flex-col gap-5 bg-background p-5 transition-colors hover:bg-accent/30"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Icon
                      className="h-4 w-4 text-muted-foreground"
                      strokeWidth={1.5}
                    />
                    <div>
                      <p className="text-sm font-medium">{acc.name}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">
                        {acc.institution}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {meta.label}
                  </span>
                </div>

                <div className="space-y-1">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    {acc.type === "credit"
                      ? "Fatura em aberto"
                      : "Saldo atual"}
                  </p>
                  <p
                    className={cn(
                      "font-mono text-2xl font-normal tabular-nums tracking-tight",
                      isNegative && "text-destructive",
                    )}
                  >
                    {isNegative && "−"}
                    {formatCurrency(Math.abs(acc.balance))}
                  </p>
                </div>

                {acc.lastFour && (
                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <span className="font-mono text-[11px] tracking-wider text-muted-foreground">
                      •••• {acc.lastFour}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 font-mono text-[10px] uppercase tracking-wider opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      Detalhes →
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button
          className="group mt-px flex w-full items-center justify-center gap-2 border border-t-0 border-border bg-background py-4 text-muted-foreground transition-colors hover:bg-accent/30 hover:text-foreground"
          onClick={() => {}}
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
          <span className="font-mono text-[11px] uppercase tracking-wider">
            Adicionar conta
          </span>
        </button>
      </section>
    </div>
  );
}
