import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowRightLeft,
  Check,
  EyeOff,
  FileUp,
  Flag,
  Keyboard,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FinanceIcon, getFinanceIconOption } from "@/components/shared/IconPicker";
import {
  formatTransactionAmount,
  type TransactionModalFormState,
} from "@/components/shared/transactionModalUtils";
import { formatCurrency } from "@/lib/format";
import { formatShortcut } from "@/lib/keyboardShortcuts";
import { parseNaturalEntry } from "@/lib/naturalEntry";
import { appRoutes } from "@/lib/navigation";
import { suggestCategory } from "@/lib/statement";
import { cn } from "@/lib/utils";
import { useFinanceStore } from "@/store/useFinanceStore";
import { usePrivacyStore } from "@/store/usePrivacyStore";
import type { Transaction } from "@/types";

type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNewTransaction: () => void;
  onNewTransfer: () => void;
  onOpenHelp: () => void;
  onImportStatement: () => void;
  onQuickCreate: (draft: Partial<TransactionModalFormState>) => void;
  onEditTransaction: (transaction: Transaction) => void;
};

type PaletteGroup =
  | "Criar"
  | "Transações"
  | "Contas"
  | "Categorias"
  | "Metas"
  | "Navegação"
  | "Ações";

type PaletteAction = {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  iconName?: string;
  shortcut?: string;
  keywords?: string[];
  group: PaletteGroup;
  run: () => void;
};

const SEARCH_LIMITS = { transactions: 5, accounts: 3, categories: 3, goals: 3 };

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

export function CommandPalette({
  open,
  onOpenChange,
  onNewTransaction,
  onNewTransfer,
  onOpenHelp,
  onImportStatement,
  onQuickCreate,
  onEditTransaction,
}: CommandPaletteProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const transactions = useFinanceStore(useShallow((s) => s.transactions));
  const accounts = useFinanceStore(useShallow((s) => s.accounts));
  const categories = useFinanceStore(useShallow((s) => s.categories));
  const goals = useFinanceStore(useShallow((s) => s.goals));

  const actions = useMemo<PaletteAction[]>(
    () => [
      ...appRoutes
        .filter((route) => route.path !== "/configuracoes")
        .map((route) => ({
          id: route.path,
          label: route.label,
          description:
            route.path === "/"
              ? "Abrir painel inicial"
              : `Abrir ${route.title.toLowerCase()}`,
          icon: route.icon,
          shortcut: route.shortcut,
          keywords: route.keywords,
          group: "Navegação" as const,
          run: () => navigate(route.path),
        })),
      {
        id: "nova-transacao",
        label: "Nova transação",
        description: "Abrir modal de criação",
        icon: Plus,
        shortcut: "N",
        keywords: ["novo", "lançamento", "movimentação"],
        group: "Ações" as const,
        run: onNewTransaction,
      },
      {
        id: "nova-transferencia",
        label: "Nova transferência",
        description: "Mover dinheiro entre contas",
        icon: ArrowRightLeft,
        shortcut: "T",
        keywords: ["transferir", "mover", "entre contas"],
        group: "Ações" as const,
        run: onNewTransfer,
      },
      {
        id: "importar-extrato",
        label: "Importar extrato",
        description: "Trazer OFX ou CSV do banco com conciliação",
        icon: FileUp,
        keywords: ["ofx", "csv", "banco", "extrato", "conciliar"],
        group: "Ações" as const,
        run: onImportStatement,
      },
      {
        id: "atalhos",
        label: "Atalhos de teclado",
        description: "Ver todos os atalhos disponíveis",
        icon: Keyboard,
        keywords: ["ajuda", "teclado", "shortcuts"],
        group: "Ações" as const,
        run: onOpenHelp,
      },
      {
        id: "modo-sigilo",
        label: "Alternar modo sigilo",
        description: "Borrar/revelar valores monetários",
        icon: EyeOff,
        shortcut: "H",
        keywords: ["privacidade", "esconder", "borrar", "valores", "sigilo"],
        group: "Ações" as const,
        run: () => usePrivacyStore.getState().toggle(),
      },
      {
        id: "configuracoes",
        label: "Configurações",
        description: "Abrir preferências do aplicativo",
        icon: Settings,
        shortcut: ",",
        keywords: ["tema", "preferências", "ajustes"],
        group: "Ações" as const,
        run: () => navigate("/configuracoes"),
      },
      {
        id: "recarregar-dados",
        label: "Recarregar dados",
        description: "Sincronizar novamente o estado local com a base ativa",
        icon: RefreshCw,
        keywords: ["atualizar", "recarregar", "sincronizar"],
        group: "Ações" as const,
        run: () => void useFinanceStore.getState().initialize(),
      },
    ],
    [navigate, onNewTransaction, onNewTransfer, onOpenHelp, onImportStatement],
  );

  // Ação de criação rápida a partir de linguagem natural ("mercado 54,90 ontem").
  const quickCreateAction = useMemo<PaletteAction | null>(() => {
    const parsed = parseNaturalEntry(query);
    if (!parsed) return null;

    const suggested = suggestCategory(parsed.title);
    const category = categories.find(
      (candidate) =>
        candidate.id === suggested && candidate.kind === parsed.type,
    );

    const dateLabel = format(parseISO(parsed.date), "dd MMM", { locale: ptBR });
    return {
      id: "quick-create",
      label: `${parsed.type === "income" ? "Nova receita" : "Nova despesa"}: ${parsed.title}`,
      description: [
        formatCurrency(parsed.amount),
        dateLabel,
        category?.name,
      ]
        .filter(Boolean)
        .join(" · "),
      icon: Sparkles,
      group: "Criar",
      run: () =>
        onQuickCreate({
          type: parsed.type,
          title: parsed.title,
          amount: formatTransactionAmount(parsed.amount),
          date: parsed.date,
          categoryId: category?.id ?? "",
        }),
    };
  }, [query, categories, onQuickCreate]);

  // Busca global: transações, contas, categorias e metas.
  const searchActions = useMemo<PaletteAction[]>(() => {
    const term = normalize(query);
    if (!term) return [];

    const results: PaletteAction[] = [];

    const matchedTransactions = transactions
      .filter((transaction) => normalize(transaction.title).includes(term))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, SEARCH_LIMITS.transactions);
    for (const transaction of matchedTransactions) {
      const sign =
        transaction.type === "income"
          ? "+"
          : transaction.type === "transfer"
            ? "⇄"
            : "−";
      results.push({
        id: `txn-${transaction.id}`,
        label: transaction.title,
        description: `${format(parseISO(transaction.date), "dd MMM yyyy", {
          locale: ptBR,
        })} · ${sign} ${formatCurrency(transaction.amount)}`,
        icon: ArrowRightLeft,
        group: "Transações",
        run: () => onEditTransaction(transaction),
      });
    }

    for (const account of accounts
      .filter((account) =>
        normalize(`${account.name} ${account.institution}`).includes(term),
      )
      .slice(0, SEARCH_LIMITS.accounts)) {
      results.push({
        id: `acc-${account.id}`,
        label: account.name,
        description: `Conta · ${account.institution}${account.archived ? " · arquivada" : ""}`,
        icon: Wallet,
        iconName: account.icon,
        group: "Contas",
        run: () => navigate(`/contas/${account.id}`),
      });
    }

    for (const category of categories
      .filter((category) => normalize(category.name).includes(term))
      .slice(0, SEARCH_LIMITS.categories)) {
      results.push({
        id: `cat-${category.id}`,
        label: category.name,
        description:
          category.kind === "expense"
            ? "Categoria de despesa — ver transações"
            : "Categoria de receita — ver transações",
        icon: getFinanceIconOption(category.icon).icon,
        group: "Categorias",
        run: () =>
          navigate("/transacoes", { state: { categoryId: category.id } }),
      });
    }

    for (const goal of goals
      .filter((goal) => normalize(goal.name).includes(term))
      .slice(0, SEARCH_LIMITS.goals)) {
      results.push({
        id: `goal-${goal.id}`,
        label: goal.name,
        description: `Meta · ${formatCurrency(goal.targetAmount)}`,
        icon: Flag,
        group: "Metas",
        run: () => navigate("/metas"),
      });
    }

    return results;
  }, [query, transactions, accounts, categories, goals, navigate, onEditTransaction]);

  const filteredActions = useMemo(() => {
    const term = normalize(query);
    if (!term) return actions;

    const matchedStatic = actions.filter((action) => {
      const haystack = normalize(
        [
          action.label,
          action.description,
          action.shortcut ?? "",
          ...(action.keywords ?? []),
        ].join(" "),
      );
      return haystack.includes(term);
    });

    return [
      ...(quickCreateAction ? [quickCreateAction] : []),
      ...searchActions,
      ...matchedStatic,
    ];
  }, [actions, query, quickCreateAction, searchActions]);

  useEffect(() => {
    if (!open) return;

    setQuery("");
    setSelectedIndex(0);

    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    setSelectedIndex((current) =>
      filteredActions.length === 0
        ? 0
        : Math.min(current, filteredActions.length - 1),
    );
  }, [filteredActions.length]);

  function runAction(index: number) {
    const action = filteredActions[index];
    if (!action) return;

    onOpenChange(false);
    action.run();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((current) =>
        filteredActions.length === 0
          ? 0
          : (current + 1) % filteredActions.length,
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((current) =>
        filteredActions.length === 0
          ? 0
          : (current - 1 + filteredActions.length) % filteredActions.length,
      );
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      setSelectedIndex(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      setSelectedIndex(Math.max(filteredActions.length - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      runAction(selectedIndex);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-border px-4 py-4">
          <DialogTitle className="sr-only">Command palette</DialogTitle>
          <DialogDescription className="sr-only">
            Busque rotas e ações rápidas.
          </DialogDescription>

          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              strokeWidth={1.5}
            />
            <Input
              ref={inputRef}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Buscar tudo — ou digite “mercado 54,90 ontem”"
              className="h-9 border-0 bg-transparent pl-9 pr-3 font-mono text-xs ui-focus-ring-inset"
            />
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            <span>Esc fecha</span>
            <span>valor + data criam lançamento</span>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[22rem]">
          <div className="p-2">
            {filteredActions.length === 0 ? (
              <div className="px-3 py-8 text-center">
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Nenhum resultado
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Tente outro termo ou use os atalhos numéricos.
                </p>
              </div>
            ) : (
              groupActions(filteredActions).map(([group, items]) => (
                <div key={group} className="pb-2 last:pb-0">
                  <p className="px-3 pb-2 pt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    {group}
                  </p>
                  <div className="space-y-1">
                    {items.map((action) => {
                      const index = filteredActions.findIndex(
                        (candidate) => candidate.id === action.id,
                      );
                      const Icon = action.icon;
                      const active = index === selectedIndex;

                      return (
                        <button
                          key={action.id}
                          type="button"
                          onClick={() => runAction(index)}
                          onMouseEnter={() => setSelectedIndex(index)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-sm border border-transparent px-3 py-2 text-left transition-colors ui-focus-ring-inset",
                            active
                              ? "border-border bg-accent text-foreground"
                              : "hover:border-border hover:bg-accent/60",
                          )}
                        >
                          <span className="grid h-8 w-8 shrink-0 place-items-center border border-border bg-background">
                            {action.iconName ? (
                              <FinanceIcon
                                name={action.iconName}
                                className="h-4 w-4"
                                strokeWidth={1.5}
                              />
                            ) : (
                              <Icon className="h-4 w-4" strokeWidth={1.5} />
                            )}
                          </span>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-sm font-medium tracking-tight">
                                {action.label}
                              </span>
                              {action.shortcut && (
                                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                                  {formatShortcut(`mod+${action.shortcut}`)}
                                </span>
                              )}
                            </div>
                            <p
                              className={cn(
                                "truncate font-mono text-[11px] text-muted-foreground",
                                // Resultados com valores monetários respeitam o modo sigilo.
                                (group === "Transações" ||
                                  group === "Metas" ||
                                  group === "Criar") &&
                                  "money",
                              )}
                            >
                              {action.description}
                            </p>
                          </div>

                          {active && (
                            <Check className="h-4 w-4 shrink-0 text-foreground" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function groupActions(actions: PaletteAction[]) {
  const grouped = new Map<PaletteAction["group"], PaletteAction[]>();
  for (const action of actions) {
    const list = grouped.get(action.group) ?? [];
    list.push(action);
    grouped.set(action.group, list);
  }
  return Array.from(grouped.entries());
}
