import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowDownUp, Filter, Plus, RotateCcw, Search } from "lucide-react";
import { AnimatedCurrency } from "@/components/shared/AnimatedCurrency";
import { TransactionRow } from "@/components/shared/TransactionRow";
import { TransactionModal } from "@/components/shared/TransactionModal";
import { DatePicker } from "@/components/shared/DatePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFinanceStore } from "@/store/useFinanceStore";
import { formatCurrency } from "@/lib/format";
import {
  calculateTransactionTotals,
  filterTransactions,
  groupTransactionsByDate,
  hasActiveTransactionFilters,
  sortTransactions,
  type TransactionFilters,
  type TransactionSort,
  type TransactionTypeFilter,
} from "@/lib/transactionFilters";
import { isEditableElement } from "@/lib/keyboardShortcuts";
import type { Transaction } from "@/types";
import { dsHeroOverline, dsHeroValue } from "@/lib/designSystem";

const defaultFilters: TransactionFilters = {
  query: "",
  type: "all",
  categoryId: "",
  accountId: "",
  startDate: "",
  endDate: "",
  sort: "date-desc",
};

/** Filtros pré-aplicados por navegação (ex.: drill-down dos relatórios). */
export type TransactionsPageState = Partial<
  Pick<
    TransactionFilters,
    "categoryId" | "accountId" | "startDate" | "endDate" | "type"
  >
>;

export function TransactionsPage() {
  const transactions = useFinanceStore(useShallow((s) => s.transactions));
  const categories = useFinanceStore(useShallow((s) => s.categories));
  const accounts = useFinanceStore(useShallow((s) => s.accounts));
  const location = useLocation();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);

  const incomingState = (location.state ?? null) as TransactionsPageState | null;
  const hasIncomingFilters =
    !!incomingState && Object.values(incomingState).some(Boolean);
  const [filtersOpen, setFiltersOpen] = useState(hasIncomingFilters);
  const [filters, setFilters] = useState<TransactionFilters>(() =>
    hasIncomingFilters ? { ...defaultFilters, ...incomingState } : defaultFilters,
  );

  // Navegações subsequentes para a mesma rota (drill-down) reaplicam filtros.
  useEffect(() => {
    if (!hasIncomingFilters || !incomingState) return;
    setFilters({ ...defaultFilters, ...incomingState });
    setFiltersOpen(true);
  }, [location.key]);
  const searchRef = useRef<HTMLInputElement>(null);

  // Teclado: "/" foca a busca (abrindo os filtros se preciso),
  // F alterna os filtros e as setas percorrem as linhas da lista.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented) return;
      if (modalOpen) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (isEditableElement(event.target)) return;
      if (
        event.target instanceof HTMLElement &&
        event.target.closest(
          '[role="dialog"], [data-radix-popper-content-wrapper], [data-picker-popover]',
        )
      ) {
        return;
      }

      if (event.key === "/" && !event.repeat) {
        event.preventDefault();
        setFiltersOpen(true);
        window.requestAnimationFrame(() => {
          searchRef.current?.focus();
          searchRef.current?.select();
        });
        return;
      }

      if ((event.key === "f" || event.key === "F") && !event.repeat) {
        event.preventDefault();
        setFiltersOpen((open) => !open);
        return;
      }

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        const rows = Array.from(
          document.querySelectorAll<HTMLElement>("[data-txn-row]"),
        );
        if (rows.length === 0) return;

        event.preventDefault();
        const currentIndex = rows.indexOf(
          document.activeElement as HTMLElement,
        );
        const next =
          currentIndex === -1
            ? event.key === "ArrowDown"
              ? 0
              : rows.length - 1
            : Math.min(
                Math.max(
                  currentIndex + (event.key === "ArrowDown" ? 1 : -1),
                  0,
                ),
                rows.length - 1,
              );
        rows[next]?.focus();
        rows[next]?.scrollIntoView({ block: "nearest" });
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalOpen]);

  function openNew() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(t: Transaction) {
    setEditing(t);
    setModalOpen(true);
  }

  function updateFilters(patch: Partial<TransactionFilters>) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  const activeFilters = hasActiveTransactionFilters(filters);

  const { groups, totals } = useMemo(() => {
    const filtered = filterTransactions(transactions, filters);
    const sorted = sortTransactions(filtered, filters.sort);

    return {
      groups: groupTransactionsByDate(sorted),
      totals: calculateTransactionTotals(filtered),
    };
  }, [transactions, filters]);

  return (
    <div className="space-y-10">
      <section className="flex flex-col gap-6 border-b border-border pb-10 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <p className={dsHeroOverline}>
            Transações ({totals.count})
          </p>
          <h1 className={`selectable-text ${dsHeroValue}`}>
            <AnimatedCurrency value={totals.net} />
          </h1>
          <p className="font-mono text-xs text-muted-foreground">
            <span className="selectable-text money text-success">
              +{formatCurrency(totals.income)}
            </span>
            <span className="px-2">·</span>
            <span className="selectable-text money text-destructive">
              −{formatCurrency(totals.expense)}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={filtersOpen || activeFilters ? "default" : "outline"}
            size="sm"
            className="gap-1.5 rounded-sm text-xs"
            onClick={() => setFiltersOpen((open) => !open)}
          >
            <Filter className="h-3.5 w-3.5" strokeWidth={1.5} />
            Filtros
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-sm text-xs"
            onClick={() =>
              updateFilters({
                sort: filters.sort === "date-desc" ? "date-asc" : "date-desc",
              })
            }
          >
            <ArrowDownUp className="h-3.5 w-3.5" strokeWidth={1.5} />
            {filters.sort === "date-desc" ? "Recentes" : "Antigas"}
          </Button>
          <Button size="sm" className="gap-1.5 rounded-sm text-xs" onClick={openNew}>
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            Nova
          </Button>
        </div>
      </section>

      {filtersOpen && (
        <section className="space-y-3 border-b border-border pb-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.5fr_150px_170px_170px]">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                strokeWidth={1.5}
              />
              <Input
                ref={searchRef}
                value={filters.query}
                onChange={(event) => updateFilters({ query: event.target.value })}
                placeholder="Buscar título ( / )"
                className="pl-8 font-mono text-xs"
              />
            </div>

            <Select
              value={filters.type}
              onValueChange={(value) =>
                updateFilters({ type: value as TransactionTypeFilter })
              }
            >
              <SelectTrigger className="font-mono text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="income">Receitas</SelectItem>
                <SelectItem value="expense">Despesas</SelectItem>
                <SelectItem value="transfer">Transferências</SelectItem>
                <SelectItem value="projected">Projetadas</SelectItem>
                <SelectItem value="recurring">Recorrentes</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.categoryId || "_all"}
              onValueChange={(value) =>
                updateFilters({ categoryId: value === "_all" ? "" : value })
              }
            >
              <SelectTrigger
                className="font-mono text-xs"
                aria-label="Filtrar por categoria"
              >
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Toda categoria</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.accountId || "_all"}
              onValueChange={(value) =>
                updateFilters({ accountId: value === "_all" ? "" : value })
              }
            >
              <SelectTrigger
                className="font-mono text-xs"
                aria-label="Filtrar por conta"
              >
                <SelectValue placeholder="Conta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Toda conta</SelectItem>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-[170px_170px_170px_auto] md:items-center">
            <DatePicker
              value={filters.startDate}
              onChange={(value) => updateFilters({ startDate: value })}
              className="font-mono text-xs"
              aria-label="Data inicial"
            />
            <DatePicker
              value={filters.endDate}
              onChange={(value) => updateFilters({ endDate: value })}
              className="font-mono text-xs"
              aria-label="Data final"
            />

            <Select
              value={filters.sort}
              onValueChange={(value) =>
                updateFilters({ sort: value as TransactionSort })
              }
            >
              <SelectTrigger className="font-mono text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Mais recentes</SelectItem>
                <SelectItem value="date-asc">Mais antigas</SelectItem>
                <SelectItem value="amount-desc">Maior valor</SelectItem>
                <SelectItem value="amount-asc">Menor valor</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              size="sm"
              className="justify-self-start gap-1.5 rounded-sm text-xs"
              onClick={() => setFilters(defaultFilters)}
              disabled={!activeFilters}
            >
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
              Limpar
            </Button>
          </div>
        </section>
      )}

      <section className="space-y-8">
        {groups.length === 0 ? (
          <EmptyTransactions filtered={activeFilters} onNew={openNew} />
        ) : (
          groups.map(([date, list]) => {
            const parsed = parseISO(date);
            const dayTotal = list.reduce((s, t) => {
              if (t.type === "income") return s + t.amount;
              if (t.type === "expense") return s - t.amount;
              return s;
            }, 0);

            return (
              <div key={date} className="space-y-3">
                <div className="flex items-baseline gap-3">
                  <p className={dsHeroOverline}>
                    {format(parsed, "EEE, dd MMM yyyy", { locale: ptBR })}
                  </p>
                  <div className="h-px flex-1 bg-border" />
                  <span className="selectable-text money font-mono text-[11px] tabular-nums text-muted-foreground">
                    {dayTotal >= 0 ? "+" : "−"}
                    {formatCurrency(Math.abs(dayTotal))}
                  </span>
                </div>
                <div className="border border-border bg-background">
                  {list.map((t) => (
                    <TransactionRow
                      key={t.id}
                      transaction={t}
                      onClick={() => openEdit(t)}
                    />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </section>

      <TransactionModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        transaction={editing}
      />
    </div>
  );
}

function EmptyTransactions({
  filtered,
  onNew,
}: {
  filtered: boolean;
  onNew: () => void;
}) {
  return (
    <div className="grid min-h-[280px] place-items-center border border-dashed border-border bg-accent/10 px-6 py-14 text-center">
      <div className="max-w-sm space-y-3">
        <p className="font-mono text-xs uppercase tracking-wider">
          {filtered ? "Nenhum resultado encontrado" : "Nenhuma transação"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {filtered
            ? "Ajuste os filtros para ampliar a busca."
            : "Cadastre sua primeira movimentação para começar."}
        </p>
        {!filtered && (
          <Button
            size="sm"
            variant="outline"
            className="mt-4 gap-1.5 rounded-sm text-xs"
            onClick={onNew}
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            Nova transação
          </Button>
        )}
      </div>
    </div>
  );
}
