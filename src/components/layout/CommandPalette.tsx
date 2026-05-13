import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Plus, RefreshCw, Search, Settings } from "lucide-react";
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
import { formatShortcut } from "@/lib/keyboardShortcuts";
import { appRoutes } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { useFinanceStore } from "@/store/useFinanceStore";

type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNewTransaction: () => void;
};

type PaletteAction = {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  shortcut?: string;
  keywords?: string[];
  group: "Navegação" | "Ações";
  run: () => void;
};

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
}: CommandPaletteProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

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
    [navigate, onNewTransaction],
  );

  const filteredActions = useMemo(() => {
    const term = normalize(query);
    if (!term) return actions;

    return actions.filter((action) => {
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
  }, [actions, query]);

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
              placeholder="Buscar rota ou ação"
              className="h-9 border-0 bg-transparent pl-9 pr-3 font-mono text-xs ui-focus-ring-inset"
            />
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            <span>Esc fecha</span>
            <span>Ctrl/Cmd N nova transação</span>
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
                            <Icon className="h-4 w-4" strokeWidth={1.5} />
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
                            <p className="truncate font-mono text-[11px] text-muted-foreground">
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
