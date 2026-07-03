import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowRightLeft, Plus, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountModal } from "@/components/shared/AccountModal";
import { CategoryModal } from "@/components/shared/CategoryModal";
import { TransactionModal } from "@/components/shared/TransactionModal";
import { FinanceIcon } from "@/components/shared/IconPicker";
import {
  formatTransactionAmount,
  type TransactionModalFormState,
} from "@/components/shared/transactionModalUtils";
import { getCurrentAccountBalances } from "@/lib/balance";
import { formatCurrency } from "@/lib/format";
import { getInvoiceSummary, type InvoiceSummary } from "@/lib/invoice";
import { selectTotalBalance, useFinanceStore } from "@/store/useFinanceStore";
import type { Account, AccountType, Category } from "@/types";
import { cn } from "@/lib/utils";

const typeMeta: Record<AccountType, { label: string; fallbackIcon: string }> = {
  checking: { label: "Corrente", fallbackIcon: "wallet" },
  savings: { label: "Poupança", fallbackIcon: "piggy-bank" },
  credit: { label: "Crédito", fallbackIcon: "credit-card" },
  cash: { label: "Dinheiro", fallbackIcon: "banknote" },
  investment: { label: "Investimento", fallbackIcon: "trending-up" },
};

export function AccountsPage() {
  const accounts = useFinanceStore((s) => s.accounts);
  const categories = useFinanceStore((s) => s.categories);
  const transactions = useFinanceStore((s) => s.transactions);
  const totalBalance = useFinanceStore(selectTotalBalance);
  const accountBalances = useMemo(
    () => getCurrentAccountBalances(accounts, transactions),
    [accounts, transactions],
  );

  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [invoiceDraft, setInvoiceDraft] =
    useState<Partial<TransactionModalFormState> | null>(null);

  function openPayInvoice(account: Account, summary: InvoiceSummary) {
    const amount = summary.closed.total > 0 ? summary.closed.total : summary.open.total;
    const sourceAccount = accounts.find(
      (candidate) => candidate.type !== "credit" && candidate.id !== account.id,
    );
    setInvoiceDraft({
      type: "transfer",
      title: `Pagamento fatura ${account.name}`,
      amount: amount > 0 ? formatTransactionAmount(amount) : "",
      accountId: sourceAccount?.id ?? "",
      transferAccountId: account.id,
    });
  }

  const groupedCategories = useMemo(
    () => ({
      income: categories.filter((category) => category.kind === "income"),
      expense: categories.filter((category) => category.kind === "expense"),
    }),
    [categories],
  );

  function openNewAccount() {
    setEditingAccount(null);
    setAccountModalOpen(true);
  }

  function openEditAccount(account: Account) {
    setEditingAccount(account);
    setAccountModalOpen(true);
  }

  function openNewCategory() {
    setEditingCategory(null);
    setCategoryModalOpen(true);
  }

  function openEditCategory(category: Category) {
    setEditingCategory(category);
    setCategoryModalOpen(true);
  }

  return (
    <div className="space-y-10">
      <section className="flex flex-col gap-6 border-b border-border pb-10 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Saldo efetivo
          </p>
          <h1 className="selectable-text font-mono text-5xl font-light tracking-tight md:text-6xl">
            {formatCurrency(totalBalance)}
          </h1>
          <p className="font-mono text-xs text-muted-foreground">
            {accounts.length} contas cadastradas
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {accounts.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-sm text-xs"
              onClick={() => setTransferModalOpen(true)}
            >
              <ArrowRightLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
              Transferir
              <span className="font-mono text-[10px] uppercase text-muted-foreground">
                Ctrl/Cmd T
              </span>
            </Button>
          )}
          <Button size="sm" className="gap-1.5 rounded-sm text-xs" onClick={openNewAccount}>
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            Nova conta
          </Button>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Contas ({accounts.length})
          </p>
          <div className="h-px flex-1 bg-border" />
        </div>

        {accounts.length === 0 ? (
          <EmptyPanel
            title="Nenhuma conta cadastrada"
            description="Crie sua primeira conta para acompanhar saldos e lançamentos."
            actionLabel="Nova conta"
            onAction={openNewAccount}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-px overflow-hidden border border-border bg-transparent md:grid-cols-2 xl:grid-cols-3">
              {accounts.map((account) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  effectiveBalance={accountBalances.get(account.id) ?? account.balance}
                  invoice={getInvoiceSummary(account, transactions)}
                  onEdit={() => openEditAccount(account)}
                  onPayInvoice={(summary) => openPayInvoice(account, summary)}
                />
              ))}
            </div>

            <button
              className="group mt-px flex w-full items-center justify-center gap-2 border border-t-0 border-border bg-background py-4 text-muted-foreground transition-colors hover:bg-accent/30 hover:text-foreground"
              onClick={openNewAccount}
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span className="font-mono text-[11px] uppercase tracking-wider">
                Adicionar conta
              </span>
            </button>
          </>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Categorias ({categories.length})
          </p>
          <div className="h-px flex-1 bg-border" />
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-sm text-xs"
            onClick={openNewCategory}
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            Nova categoria
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <CategoryGroup
            title="Receitas"
            categories={groupedCategories.income}
            onEdit={openEditCategory}
          />
          <CategoryGroup
            title="Despesas"
            categories={groupedCategories.expense}
            onEdit={openEditCategory}
          />
        </div>
      </section>

      <AccountModal
        open={accountModalOpen}
        onOpenChange={setAccountModalOpen}
        account={editingAccount}
      />
      <CategoryModal
        open={categoryModalOpen}
        onOpenChange={setCategoryModalOpen}
        category={editingCategory}
      />
      <TransactionModal
        open={transferModalOpen}
        onOpenChange={setTransferModalOpen}
        initialType="transfer"
      />
      <TransactionModal
        open={invoiceDraft !== null}
        onOpenChange={(open) => {
          if (!open) setInvoiceDraft(null);
        }}
        initialType="transfer"
        initialDraft={invoiceDraft ?? undefined}
      />
    </div>
  );
}

function AccountCard({
  account,
  effectiveBalance,
  invoice,
  onEdit,
  onPayInvoice,
}: {
  account: Account;
  effectiveBalance: number;
  invoice: InvoiceSummary | null;
  onEdit: () => void;
  onPayInvoice: (summary: InvoiceSummary) => void;
}) {
  const meta = typeMeta[account.type];
  const isNegative = effectiveBalance < 0;

  return (
    <div
      role="button"
      tabIndex={0}
      className="group flex min-h-[180px] cursor-pointer flex-col gap-5 bg-background p-5 text-left transition-colors hover:bg-accent/30 ui-focus-ring-inset"
      onClick={onEdit}
      onKeyDown={(event) => {
        if (event.key === "Enter" && event.target === event.currentTarget) {
          onEdit();
        }
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <FinanceIcon
            name={account.icon ?? meta.fallbackIcon}
            className="h-4 w-4 shrink-0 text-muted-foreground"
          />
          <div className="min-w-0">
            <p className="selectable-text truncate text-sm font-medium">{account.name}</p>
            <p className="selectable-text truncate font-mono text-[11px] text-muted-foreground">
              {account.institution}
            </p>
          </div>
        </div>
        <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {meta.label}
        </span>
      </div>

      <div className="space-y-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Saldo efetivo
        </p>
        <p
          className={cn(
            "selectable-text font-mono text-2xl font-normal tabular-nums tracking-tight",
            isNegative && "text-destructive",
          )}
        >
          {isNegative && "-"}
          {formatCurrency(Math.abs(effectiveBalance))}
        </p>
      </div>

      {invoice ? (
        <div className="mt-auto space-y-2 border-t border-border pt-3">
          <div className="flex items-baseline justify-between gap-3 font-mono text-[11px]">
            <span className="text-muted-foreground">
              Aberta · fecha{" "}
              {format(parseISO(invoice.open.end), "dd MMM", { locale: ptBR })}
            </span>
            <span className="selectable-text tabular-nums">
              {formatCurrency(invoice.open.total)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 font-mono text-[11px]">
            <span className="text-muted-foreground">
              Fechada · vence{" "}
              {format(parseISO(invoice.closed.dueDate), "dd MMM", {
                locale: ptBR,
              })}
            </span>
            <span className="flex items-center gap-2">
              <span
                className={cn(
                  "selectable-text tabular-nums",
                  invoice.closed.total > 0 && "text-warning",
                )}
              >
                {formatCurrency(invoice.closed.total)}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-6 gap-1 rounded-sm px-2 text-[10px] uppercase tracking-wider"
                onClick={(event) => {
                  event.stopPropagation();
                  onPayInvoice(invoice);
                }}
              >
                <Receipt className="h-3 w-3" strokeWidth={1.5} />
                Pagar
              </Button>
            </span>
          </div>
        </div>
      ) : (
        <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
          <span className="flex items-center gap-2 font-mono text-[11px] tracking-wider text-muted-foreground">
            <FinanceIcon
              name={account.icon ?? meta.fallbackIcon}
              className="h-3.5 w-3.5"
            />
            {account.lastFour ? `.... ${account.lastFour}` : meta.label}
          </span>
          <span className="selectable-text font-mono text-[10px] uppercase tracking-wider text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
            Base {formatCurrency(account.balance, true)}
          </span>
        </div>
      )}
    </div>
  );
}

function CategoryGroup({
  title,
  categories,
  onEdit,
}: {
  title: string;
  categories: Category[];
  onEdit: (category: Category) => void;
}) {
  return (
    <div className="border border-border bg-background">
      <p className="border-b border-border px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </p>
      {categories.length === 0 ? (
        <div className="grid min-h-[120px] place-items-center px-4 py-6 text-center">
          <p className="font-mono text-[11px] text-muted-foreground">
            Nenhuma categoria cadastrada.
          </p>
        </div>
      ) : (
        categories.map((category) => (
          <button
            key={category.id}
            type="button"
            className="flex w-full items-center justify-between gap-4 border-b border-border px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-accent/30"
            onClick={() => onEdit(category)}
          >
            <span className="flex min-w-0 items-center gap-3">
              <span
                className="grid h-8 w-8 shrink-0 place-items-center border border-border"
                style={{ backgroundColor: category.color }}
              >
                <FinanceIcon
                  name={category.icon}
                  className="h-4 w-4 text-background mix-blend-luminosity"
                />
              </span>
              <span className="selectable-text truncate text-sm">{category.name}</span>
            </span>
            <FinanceIcon
              name={category.icon}
              className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
            />
          </button>
        ))
      )}
    </div>
  );
}

function EmptyPanel({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="grid min-h-[240px] place-items-center border border-dashed border-border bg-accent/10 px-6 py-12 text-center">
      <div className="max-w-sm space-y-3">
        <p className="font-mono text-xs uppercase tracking-wider">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
        <Button
          size="sm"
          variant="outline"
          className="mt-2 gap-1.5 rounded-sm text-xs"
          onClick={onAction}
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}
