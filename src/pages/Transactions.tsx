import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowDownUp,
  Filter,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { AnimatedCurrency } from "@/components/shared/AnimatedCurrency";
import { TransactionRow } from "@/components/shared/TransactionRow";
import { TransactionModal } from "@/components/shared/TransactionModal";
import { DatePicker } from "@/components/shared/DatePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
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
import { sortActiveAccounts } from "@/lib/balance";
import { isEditableElement } from "@/lib/keyboardShortcuts";
import { toast } from "@/store/useToastStore";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/types";
import { dsHeroOverline, dsHeroValue, dsShadow } from "@/lib/designSystem";

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

/** Grupos de dias renderizados por página (a lista cresce sob demanda). */
const GROUPS_PAGE_SIZE = 12;

export function TransactionsPage() {
  const transactions = useFinanceStore(useShallow((s) => s.transactions));
  const categories = useFinanceStore(useShallow((s) => s.categories));
  const accounts = useFinanceStore(useShallow((s) => s.accounts));
  const addTransaction = useFinanceStore((s) => s.addTransaction);
  const removeTransaction = useFinanceStore((s) => s.removeTransaction);
  const updateTransaction = useFinanceStore((s) => s.updateTransaction);
  const location = useLocation();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  // Refs espelham o estado para o listener global de teclado não re-vincular.
  const flatRef = useRef<Transaction[]>([]);
  const selectedIdsRef = useRef<ReadonlySet<string>>(new Set());
  const deleteWithUndoRef = useRef<(items: Transaction[]) => Promise<void>>(
    async () => {},
  );

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
  // F alterna os filtros, setas percorrem as linhas e, com uma linha
  // focada: Espaço seleciona, E edita, Delete exclui (com desfazer).
  useEffect(() => {
    function focusedTxnId(): string | null {
      const el = document.activeElement;
      if (!(el instanceof HTMLElement)) return null;
      return el.dataset.txnId ?? null;
    }

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

      // Espaço alterna a seleção da linha focada (C1).
      if (event.key === " ") {
        const id = focusedTxnId();
        if (!id) return;
        event.preventDefault();
        toggleSelect(id);
        return;
      }

      // E edita a linha focada (C5).
      if ((event.key === "e" || event.key === "E") && !event.repeat) {
        const id = focusedTxnId();
        const target = id ? flatRef.current.find((t) => t.id === id) : null;
        if (!target) return;
        event.preventDefault();
        openEdit(target);
        return;
      }

      // Delete/Backspace exclui a seleção — ou a linha focada (C5).
      if (event.key === "Delete" || event.key === "Backspace") {
        const selected = flatRef.current.filter((t) =>
          selectedIdsRef.current.has(t.id),
        );
        if (selected.length > 0) {
          event.preventDefault();
          void deleteWithUndoRef.current(selected);
          return;
        }
        const id = focusedTxnId();
        const target = id ? flatRef.current.find((t) => t.id === id) : null;
        if (!target) return;
        event.preventDefault();
        void deleteWithUndoRef.current([target]);
        return;
      }

      // Esc limpa a seleção ativa.
      if (event.key === "Escape" && selectedIdsRef.current.size > 0) {
        event.preventDefault();
        setSelectedIds(new Set());
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

  const { groups, totals, flat } = useMemo(() => {
    const filtered = filterTransactions(transactions, filters);
    const sorted = sortTransactions(filtered, filters.sort);

    return {
      groups: groupTransactionsByDate(sorted),
      totals: calculateTransactionTotals(filtered),
      flat: sorted,
    };
  }, [transactions, filters]);

  // Seleção só vale para linhas visíveis: poda ids que saíram do filtro.
  useEffect(() => {
    setSelectedIds((current) => {
      if (current.size === 0) return current;
      const visible = new Set(flat.map((t) => t.id));
      const next = new Set([...current].filter((id) => visible.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [flat]);

  function toggleSelect(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedTransactions = useMemo(
    () => flat.filter((t) => selectedIds.has(t.id)),
    [flat, selectedIds],
  );

  flatRef.current = flat;
  selectedIdsRef.current = selectedIds;

  async function deleteWithUndo(items: Transaction[]) {
    if (items.length === 0) return;
    const snapshots = items.map((t) => ({ ...t }));
    for (const t of snapshots) await removeTransaction(t.id);
    setSelectedIds(new Set());
    toast(
      snapshots.length === 1
        ? `"${snapshots[0].title}" excluída.`
        : `${snapshots.length} transações excluídas.`,
      {
        actionLabel: "Desfazer",
        onAction: async () => {
          for (const snapshot of snapshots) await addTransaction(snapshot);
        },
      },
    );
  }

  deleteWithUndoRef.current = deleteWithUndo;

  async function applyBatchPatch(
    patch: Pick<Partial<Transaction>, "categoryId" | "accountId">,
  ) {
    // Categoria não se aplica a transferências.
    const targets =
      patch.categoryId !== undefined
        ? selectedTransactions.filter((t) => t.type !== "transfer")
        : selectedTransactions;
    if (targets.length === 0) return;

    const snapshots = targets.map((t) => ({ ...t }));
    for (const t of targets) await updateTransaction(t.id, patch);
    setSelectedIds(new Set());
    toast(
      `${targets.length} ${targets.length === 1 ? "transação atualizada" : "transações atualizadas"}.`,
      {
        actionLabel: "Desfazer",
        onAction: async () => {
          for (const snapshot of snapshots) {
            await updateTransaction(snapshot.id, snapshot);
          }
        },
      },
    );
  }

  // Lista cresce sob demanda (C6): grupos extras entram quando a
  // sentinela fica visível — mantém a página leve com milhares de linhas.
  const [visibleGroupCount, setVisibleGroupCount] = useState(GROUPS_PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibleGroupCount(GROUPS_PAGE_SIZE);
  }, [filters]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisibleGroupCount((count) => count + GROUPS_PAGE_SIZE);
      }
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [groups.length, visibleGroupCount]);

  const visibleGroups = useMemo(
    () => groups.slice(0, visibleGroupCount),
    [groups, visibleGroupCount],
  );
  const hiddenGroupCount = Math.max(0, groups.length - visibleGroupCount);

  // Chips dos filtros ativos (C3): visíveis mesmo com o painel fechado.
  const filterChips = useMemo(() => {
    const typeLabels: Record<TransactionTypeFilter, string> = {
      all: "",
      income: "Receitas",
      expense: "Despesas",
      transfer: "Transferências",
      projected: "Projetadas",
      recurring: "Recorrentes",
    };
    const chips: { key: string; label: string; clear: () => void }[] = [];

    if (filters.query.trim()) {
      chips.push({
        key: "query",
        label: `busca: ${filters.query.trim()}`,
        clear: () => updateFilters({ query: "" }),
      });
    }
    if (filters.type !== "all") {
      chips.push({
        key: "type",
        label: typeLabels[filters.type],
        clear: () => updateFilters({ type: "all" }),
      });
    }
    if (filters.categoryId) {
      chips.push({
        key: "category",
        label:
          categories.find((c) => c.id === filters.categoryId)?.name ??
          "Categoria",
        clear: () => updateFilters({ categoryId: "" }),
      });
    }
    if (filters.accountId) {
      chips.push({
        key: "account",
        label:
          accounts.find((a) => a.id === filters.accountId)?.name ?? "Conta",
        clear: () => updateFilters({ accountId: "" }),
      });
    }
    if (filters.startDate) {
      chips.push({
        key: "start",
        label: `de ${format(parseISO(filters.startDate), "dd/MM/yyyy")}`,
        clear: () => updateFilters({ startDate: "" }),
      });
    }
    if (filters.endDate) {
      chips.push({
        key: "end",
        label: `até ${format(parseISO(filters.endDate), "dd/MM/yyyy")}`,
        clear: () => updateFilters({ endDate: "" }),
      });
    }

    return chips;
  }, [filters, categories, accounts]);

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

      {filterChips.length > 0 && (
        <section className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Filtrando
          </span>
          {filterChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.clear}
              title="Remover filtro"
              className="flex items-center gap-1.5 border border-border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-foreground transition-colors hover:border-foreground/40 hover:bg-accent/40 ui-focus-ring"
            >
              {chip.label}
              <X className="h-3 w-3 text-muted-foreground" strokeWidth={1.5} />
            </button>
          ))}
          <button
            type="button"
            onClick={() => setFilters(defaultFilters)}
            className="px-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground ui-focus-ring"
          >
            limpar tudo
          </button>
        </section>
      )}

      <section className="space-y-8">
        {groups.length === 0 ? (
          <EmptyTransactions filtered={activeFilters} onNew={openNew} />
        ) : (
          visibleGroups.map(([date, list]) => {
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
                      selected={selectedIds.has(t.id)}
                      onToggleSelect={() => toggleSelect(t.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })
        )}

        {hiddenGroupCount > 0 && (
          <div ref={sentinelRef} className="flex justify-center py-2">
            <button
              type="button"
              onClick={() =>
                setVisibleGroupCount((count) => count + GROUPS_PAGE_SIZE)
              }
              className="border border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground ui-focus-ring"
            >
              Mostrar mais dias ({hiddenGroupCount} restantes)
            </button>
          </div>
        )}
      </section>

      {selectedTransactions.length > 0 && (
        <div
          className={cn(
            "fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 flex-wrap items-center gap-2 border border-border bg-background px-4 py-2.5",
            dsShadow,
            "animate-in fade-in-0 slide-in-from-bottom-2 duration-150",
          )}
        >
          <span className="font-mono text-[11px] uppercase tracking-[0.14em]">
            {selectedTransactions.length}{" "}
            {selectedTransactions.length === 1 ? "selecionada" : "selecionadas"}
          </span>
          <div className="h-4 w-px bg-border" aria-hidden />

          <Select
            value=""
            onValueChange={(value) => void applyBatchPatch({ categoryId: value })}
          >
            <SelectTrigger
              className="h-7 w-40 font-mono text-[11px]"
              aria-label="Mover seleção para categoria"
            >
              <SelectValue placeholder="Categoria →" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value=""
            onValueChange={(value) => void applyBatchPatch({ accountId: value })}
          >
            <SelectTrigger
              className="h-7 w-40 font-mono text-[11px]"
              aria-label="Mover seleção para conta"
            >
              <SelectValue placeholder="Conta →" />
            </SelectTrigger>
            <SelectContent>
              {sortActiveAccounts(accounts).map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 rounded-sm px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => void deleteWithUndo(selectedTransactions)}
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
            Excluir
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 rounded-sm px-2 text-xs text-muted-foreground"
            onClick={() => setSelectedIds(new Set())}
          >
            Limpar
            <Kbd>Esc</Kbd>
          </Button>
        </div>
      )}

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
