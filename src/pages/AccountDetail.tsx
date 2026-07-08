import { useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Pencil,
  Plus,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountModal } from "@/components/shared/AccountModal";
import { AnimatedCurrency } from "@/components/shared/AnimatedCurrency";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { StatCard } from "@/components/shared/StatCard";
import { TransactionModal } from "@/components/shared/TransactionModal";
import { TransactionRow } from "@/components/shared/TransactionRow";
import { FinanceIcon } from "@/components/shared/IconPicker";
import { getCurrentAccountBalance } from "@/lib/balance";
import { dsHeroOverline, dsHeroValue } from "@/lib/designSystem";
import { formatCurrency } from "@/lib/format";
import { getInvoiceSummary } from "@/lib/invoice";
import { getTodayIso, useFinanceStore } from "@/store/useFinanceStore";
import { usePaletteContext } from "@/store/usePaletteContextStore";
import { toast } from "@/store/useToastStore";
import type { Transaction } from "@/types";

const PAGE_SIZE = 30;

const typeLabels: Record<string, string> = {
  checking: "Conta corrente",
  savings: "Poupança",
  credit: "Cartão de crédito",
  cash: "Dinheiro",
  investment: "Investimento",
};

export function AccountDetailPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const accounts = useFinanceStore(useShallow((s) => s.accounts));
  const transactions = useFinanceStore(useShallow((s) => s.transactions));
  const updateAccount = useFinanceStore((s) => s.updateAccount);

  const account = accounts.find((a) => a.id === accountId);

  const [editOpen, setEditOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [newTransactionOpen, setNewTransactionOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const history = useMemo(
    () =>
      transactions
        .filter(
          (t) => t.accountId === accountId || t.transferAccountId === accountId,
        )
        .sort((a, b) => b.date.localeCompare(a.date)),
    [transactions, accountId],
  );

  const monthFlow = useMemo(() => {
    const todayIso = getTodayIso();
    const monthPrefix = todayIso.slice(0, 7);
    const inMonth = history.filter(
      (t) => t.date.startsWith(monthPrefix) && t.date <= todayIso,
    );
    const inflow = inMonth.reduce((sum, t) => {
      if (t.type === "income" && t.accountId === accountId)
        return sum + t.amount;
      if (t.type === "transfer" && t.transferAccountId === accountId)
        return sum + t.amount;
      return sum;
    }, 0);
    const outflow = inMonth.reduce((sum, t) => {
      if (t.type === "expense" && t.accountId === accountId)
        return sum + t.amount;
      if (t.type === "transfer" && t.accountId === accountId)
        return sum + t.amount;
      return sum;
    }, 0);
    return { inflow, outflow };
  }, [history, accountId]);

  usePaletteContext(
    useMemo(() => {
      if (!account) return [];
      return [
        {
          id: "account-detail-new-txn",
          label: "Lançar nesta conta",
          keywords: ["novo", "lançamento", account.name],
          run: () => setNewTransactionOpen(true),
        },
        {
          id: "account-detail-edit",
          label: "Editar conta",
          keywords: ["editar", account.name],
          run: () => setEditOpen(true),
        },
        {
          id: "account-detail-archive",
          label: account.archived ? "Reativar conta" : "Arquivar conta",
          keywords: ["arquivar", "reativar", account.name],
          run: () => void toggleArchived(),
        },
      ];
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [account?.id, account?.archived, account?.name]),
  );

  if (!account) {
    return <Navigate to="/contas" replace />;
  }

  const balance = getCurrentAccountBalance(account, transactions);
  const invoice = getInvoiceSummary(account, transactions);

  async function toggleArchived() {
    if (!account) return;
    const next = !account.archived;
    await updateAccount(account.id, { archived: next });
    toast(
      next
        ? `Conta "${account.name}" arquivada — fora dos totais.`
        : `Conta "${account.name}" reativada.`,
      {
        actionLabel: "Desfazer",
        onAction: () => updateAccount(account.id, { archived: !next }),
      },
    );
    if (next) navigate("/contas");
  }

  return (
    <div className="space-y-10">
      <section className="flex flex-col gap-6 border-b border-border pb-10 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <p className={dsHeroOverline}>
            <Link
              to="/contas"
              className="transition-colors hover:text-foreground ui-focus-ring"
            >
              Contas
            </Link>
            <span className="px-2">/</span>
            {typeLabels[account.type] ?? account.type}
            {account.excludedFromTotal && (
              <span className="px-2">· fora do saldo</span>
            )}
            {account.archived && <span className="px-2">· arquivada</span>}
          </p>
          <div className="flex items-center gap-4">
            <span
              className="grid h-11 w-11 shrink-0 place-items-center border border-border"
              style={{ backgroundColor: account.color }}
              aria-hidden
            >
              <FinanceIcon
                name={account.icon ?? "wallet"}
                className="h-5 w-5 text-background mix-blend-luminosity"
              />
            </span>
            <h1 className={`selectable-text ${dsHeroValue}`}>
              <AnimatedCurrency value={balance} />
            </h1>
          </div>
          <p className="font-mono text-xs text-muted-foreground">
            {account.name}
            <span className="px-2">·</span>
            {account.institution}
            {account.lastFour && (
              <>
                <span className="px-2">·</span>
                .... {account.lastFour}
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="gap-1.5 rounded-sm text-xs text-muted-foreground"
          >
            <Link to="/contas">
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
              Voltar
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-sm text-xs"
            onClick={() => void toggleArchived()}
          >
            {account.archived ? (
              <ArchiveRestore className="h-3.5 w-3.5" strokeWidth={1.5} />
            ) : (
              <Archive className="h-3.5 w-3.5" strokeWidth={1.5} />
            )}
            {account.archived ? "Reativar" : "Arquivar"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-sm text-xs"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
            Editar
          </Button>
          <Button
            size="sm"
            className="gap-1.5 rounded-sm text-xs"
            onClick={() => setNewTransactionOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            Lançar nesta conta
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-px overflow-hidden border border-border bg-transparent md:grid-cols-3">
        <div className="bg-background">
          <StatCard
            label="Entradas no mês"
            value={formatCurrency(monthFlow.inflow)}
            money
            icon={ArrowUpRight}
            accent="success"
          />
        </div>
        <div className="bg-background">
          <StatCard
            label="Saídas no mês"
            value={formatCurrency(monthFlow.outflow)}
            money
            icon={ArrowDownLeft}
            accent="destructive"
          />
        </div>
        <div className="bg-background">
          {invoice ? (
            <StatCard
              label={`Fatura fechada · vence ${format(
                parseISO(invoice.closed.dueDate),
                "dd MMM",
                { locale: ptBR },
              )}`}
              value={formatCurrency(invoice.closed.total)}
              money
              icon={Receipt}
              accent={invoice.closed.total > 0 ? "warning" : "neutral"}
            />
          ) : (
            <StatCard
              label="Lançamentos registrados"
              value={`${history.length}`}
              accent="neutral"
            />
          )}
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader label={`Extrato (${history.length})`} />

        {history.length === 0 ? (
          <div className="grid min-h-[200px] place-items-center border border-dashed border-border bg-accent/10 px-6 py-10 text-center">
            <div className="space-y-3">
              <p className="font-mono text-xs uppercase tracking-wider">
                Nenhum lançamento nesta conta
              </p>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 rounded-sm text-xs"
                onClick={() => setNewTransactionOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                Lançar nesta conta
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="border border-border bg-background">
              {history.slice(0, visibleCount).map((t) => (
                <TransactionRow
                  key={t.id}
                  transaction={t}
                  onClick={() => setEditingTransaction(t)}
                />
              ))}
            </div>
            {history.length > visibleCount && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                  className="border border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground ui-focus-ring"
                >
                  Mostrar mais ({history.length - visibleCount} restantes)
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <AccountModal
        open={editOpen}
        onOpenChange={setEditOpen}
        account={account}
      />
      <TransactionModal
        open={newTransactionOpen}
        onOpenChange={setNewTransactionOpen}
        initialDraft={{ accountId: account.id }}
      />
      <TransactionModal
        open={editingTransaction !== null}
        onOpenChange={(open) => {
          if (!open) setEditingTransaction(null);
        }}
        transaction={editingTransaction}
      />
    </div>
  );
}
