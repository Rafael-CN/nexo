import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountModal } from "@/components/shared/AccountModal";
import { CategoryModal } from "@/components/shared/CategoryModal";
import { FinanceIcon } from "@/components/shared/IconPicker";
import { getCurrentAccountBalances } from "@/lib/balance";
import { formatCurrency } from "@/lib/format";
import {
  selectTotalBalance,
  useFinanceStore,
} from "@/store/useFinanceStore";
import type { Account, AccountType, Category } from "@/types";
import { cn } from "@/lib/utils";

const typeMeta: Record<AccountType, { label: string; fallbackIcon: string }> = {
  checking: { label: "Corrente", fallbackIcon: "wallet" },
  savings: { label: "Poupanca", fallbackIcon: "piggy-bank" },
  credit: { label: "Credito", fallbackIcon: "credit-card" },
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
      <section className="flex flex-col gap-8 border-b border-border pb-10 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Saldo efetivo
          </p>
          <h1 className="font-mono text-5xl font-light tracking-tight md:text-6xl">
            {formatCurrency(totalBalance)}
          </h1>
          <p className="font-mono text-xs text-muted-foreground">
            {accounts.length} contas cadastradas
          </p>
        </div>

        <Button
          size="sm"
          className="gap-1.5 rounded-sm text-xs"
          onClick={openNewAccount}
        >
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
          {accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              effectiveBalance={
                accountBalances.get(account.id) ?? account.balance
              }
              onEdit={() => openEditAccount(account)}
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
    </div>
  );
}

function AccountCard({
  account,
  effectiveBalance,
  onEdit,
}: {
  account: Account;
  effectiveBalance: number;
  onEdit: () => void;
}) {
  const meta = typeMeta[account.type];
  const isNegative = effectiveBalance < 0;

  return (
    <button
      type="button"
      className="group flex flex-col gap-5 bg-background p-5 text-left transition-colors hover:bg-accent/30"
      onClick={onEdit}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <FinanceIcon
            name={account.icon ?? meta.fallbackIcon}
            className="h-4 w-4 text-muted-foreground"
          />
          <div>
            <p className="text-sm font-medium">{account.name}</p>
            <p className="font-mono text-[11px] text-muted-foreground">
              {account.institution}
            </p>
          </div>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {meta.label}
        </span>
      </div>

      <div className="space-y-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Saldo efetivo
        </p>
        <p
          className={cn(
            "font-mono text-2xl font-normal tabular-nums tracking-tight",
            isNegative && "text-destructive",
          )}
        >
          {isNegative && "-"}
          {formatCurrency(Math.abs(effectiveBalance))}
        </p>
      </div>

      <div className="flex items-center justify-between border-t border-border pt-3">
        <span className="flex items-center gap-2 font-mono text-[11px] tracking-wider text-muted-foreground">
          <FinanceIcon name={account.icon ?? meta.fallbackIcon} className="h-3.5 w-3.5" />
          {account.lastFour ? `.... ${account.lastFour}` : meta.label}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
          Base {formatCurrency(account.balance, true)}
        </span>
      </div>
    </button>
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
    <div className="border-t border-border">
      <p className="border-b border-border py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </p>
      {categories.length === 0 ? (
        <p className="py-4 font-mono text-xs text-muted-foreground">
          Nenhuma categoria cadastrada.
        </p>
      ) : (
        categories.map((category) => (
          <button
            key={category.id}
            type="button"
            className="flex w-full items-center justify-between gap-4 border-b border-border py-3 text-left transition-colors hover:bg-accent/30"
            onClick={() => onEdit(category)}
          >
            <span className="flex min-w-0 items-center gap-3">
              <span
                className="grid h-6 w-6 shrink-0 place-items-center border border-border"
                style={{ backgroundColor: category.color }}
              >
                <FinanceIcon
                  name={category.icon}
                  className="h-3.5 w-3.5 text-background mix-blend-luminosity"
                />
              </span>
              <span className="truncate text-sm">{category.name}</span>
            </span>
            <FinanceIcon
              name={category.icon}
              className="h-3.5 w-3.5 text-muted-foreground"
            />
          </button>
        ))
      )}
    </div>
  );
}
