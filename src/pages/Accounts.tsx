import {
  CreditCard,
  Landmark,
  PiggyBank,
  Plus,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";
import {
  selectTotalBalance,
  useFinanceStore,
} from "@/store/useFinanceStore";
import type { AccountType } from "@/types";

const typeMeta: Record<
  AccountType,
  { label: string; icon: LucideIcon; badge: "default" | "secondary" | "warning" }
> = {
  checking: { label: "Corrente", icon: Wallet, badge: "default" },
  savings: { label: "Poupança", icon: PiggyBank, badge: "secondary" },
  credit: { label: "Crédito", icon: CreditCard, badge: "warning" },
  cash: { label: "Dinheiro", icon: Landmark, badge: "secondary" },
  investment: { label: "Investimento", icon: TrendingUp, badge: "secondary" },
};

export function AccountsPage() {
  const accounts = useFinanceStore((s) => s.accounts);
  const totalBalance = useFinanceStore(selectTotalBalance);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Saldo consolidado (excluindo crédito)
          </p>
          <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">
            {formatCurrency(totalBalance)}
          </p>
        </div>
        <Button className="gap-1.5">
          <Plus className="h-4 w-4" />
          Nova conta
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {accounts.map((acc) => {
          const meta = typeMeta[acc.type];
          const Icon = meta.icon;
          const isNegative = acc.balance < 0;

          return (
            <Card
              key={acc.id}
              className="group relative overflow-hidden transition-shadow hover:shadow-float"
            >
              <div
                className="absolute inset-x-0 top-0 h-1"
                style={{ backgroundColor: acc.color }}
              />
              <CardContent className="space-y-5 p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="grid h-11 w-11 place-items-center rounded-lg text-white shadow-sm"
                      style={{ backgroundColor: acc.color }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{acc.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {acc.institution}
                      </p>
                    </div>
                  </div>
                  <Badge variant={meta.badge}>{meta.label}</Badge>
                </div>

                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    {acc.type === "credit"
                      ? "Fatura em aberto"
                      : "Saldo atual"}
                  </p>
                  <p
                    className={
                      "mt-1.5 text-2xl font-semibold tabular-nums tracking-tight " +
                      (isNegative ? "text-destructive" : "text-foreground")
                    }
                  >
                    {formatCurrency(Math.abs(acc.balance))}
                  </p>
                </div>

                {acc.lastFour && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-mono tracking-wider">
                      •••• •••• •••• {acc.lastFour}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      Detalhes
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        <button
          className="group grid min-h-[220px] place-items-center rounded-xl border-2 border-dashed border-border bg-transparent transition-colors hover:border-primary/60 hover:bg-primary/5"
          onClick={() => {}}
        >
          <div className="flex flex-col items-center gap-2 text-muted-foreground transition-colors group-hover:text-primary">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-muted transition-colors group-hover:bg-primary/10">
              <Plus className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium">Adicionar conta</p>
            <p className="max-w-[200px] text-center text-xs">
              Corrente, poupança, cartão, investimento ou dinheiro em espécie.
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
