import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  BadgePercent,
  Banknote,
  BookOpen,
  BriefcaseBusiness,
  BusFront,
  Calculator,
  Car,
  Check,
  ChevronDown,
  CircleDollarSign,
  Coins,
  CreditCard,
  FileText,
  Fuel,
  Gamepad2,
  HandCoins,
  HeartPulse,
  Home,
  Landmark,
  Search,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Store,
  Tag,
  Target,
  Ticket,
  DollarSign,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
  ReceiptText,
  Repeat,
  RefreshCw,
  Plane,
  PiggyBank,
  PieChart,
  Receipt,
  Scale,
  Utensils,
  Wallet,
  Building2,
  Film,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type FinanceIconGroup =
  | "base"
  | "controle"
  | "investimentos"
  | "negocios"
  | "vida";

const financeIconGroupLabels: Record<FinanceIconGroup, string> = {
  base: "Base",
  controle: "Controle",
  investimentos: "Investimentos",
  negocios: "Negócios",
  vida: "Vida",
};

const financeIconGroupOrder: FinanceIconGroup[] = [
  "base",
  "controle",
  "investimentos",
  "negocios",
  "vida",
];

const pickerGroups: Array<{ value: FinanceIconGroup | "all"; label: string }> = [
  { value: "all", label: "Todas" },
  ...financeIconGroupOrder.map((value) => ({
    value,
    label: financeIconGroupLabels[value],
  })),
];

export interface IconOption {
  value: string;
  label: string;
  icon: LucideIcon;
  group: FinanceIconGroup;
  keywords: string[];
}

export const financeIconOptions: IconOption[] = [
  {
    value: "wallet",
    label: "Carteira",
    icon: Wallet,
    group: "base",
    keywords: ["carteira", "saldo", "bolso"],
  },
  {
    value: "landmark",
    label: "Banco",
    icon: Landmark,
    group: "base",
    keywords: ["banco", "instituição", "conta", "financeira"],
  },
  {
    value: "piggy-bank",
    label: "Poupança",
    icon: PiggyBank,
    group: "base",
    keywords: ["poupança", "reserva", "guardado", "cofrinho"],
  },
  {
    value: "credit-card",
    label: "Cartão",
    icon: CreditCard,
    group: "base",
    keywords: ["cartão", "débito", "crédito", "plástico"],
  },
  {
    value: "banknote",
    label: "Dinheiro",
    icon: Banknote,
    group: "base",
    keywords: ["dinheiro", "caixa", "nota", "espécie"],
  },
  {
    value: "coins",
    label: "Moedas",
    icon: Coins,
    group: "base",
    keywords: ["moedas", "troco", "centavos", "cash"],
  },
  {
    value: "circle-dollar-sign",
    label: "Preço",
    icon: CircleDollarSign,
    group: "base",
    keywords: ["preço", "custo", "valor", "dólar"],
  },
  {
    value: "badge-percent",
    label: "Juros",
    icon: BadgePercent,
    group: "base",
    keywords: ["juros", "taxa", "desconto", "percentual"],
  },
  {
    value: "tag",
    label: "Categoria",
    icon: Tag,
    group: "base",
    keywords: ["categoria", "rótulo", "tag", "label"],
  },
  {
    value: "receipt-text",
    label: "Recibo",
    icon: ReceiptText,
    group: "controle",
    keywords: ["recibo", "nota", "comprovante", "fiscal"],
  },
  {
    value: "file-text",
    label: "Documento",
    icon: FileText,
    group: "controle",
    keywords: ["documento", "texto", "anotação", "arquivo"],
  },
  {
    value: "calculator",
    label: "Cálculo",
    icon: Calculator,
    group: "controle",
    keywords: ["cálculo", "planilha", "conta", "soma"],
  },
  {
    value: "shield-check",
    label: "Segurança",
    icon: ShieldCheck,
    group: "controle",
    keywords: ["segurança", "proteção", "verificado", "garantia"],
  },
  {
    value: "hand-coins",
    label: "Reembolso",
    icon: HandCoins,
    group: "controle",
    keywords: ["reembolso", "devolução", "estorno", "retorno"],
  },
  {
    value: "repeat",
    label: "Recorrente",
    icon: Repeat,
    group: "controle",
    keywords: ["recorrente", "mensal", "assinatura", "repetir"],
  },
  {
    value: "refresh-cw",
    label: "Ajuste",
    icon: RefreshCw,
    group: "controle",
    keywords: ["ajuste", "correção", "revisão", "atualizar"],
  },
  {
    value: "target",
    label: "Meta",
    icon: Target,
    group: "controle",
    keywords: ["meta", "objetivo", "alvo", "plano"],
  },
  {
    value: "trending-up",
    label: "Investir",
    icon: TrendingUp,
    group: "investimentos",
    keywords: ["investir", "crescimento", "alta", "retorno"],
  },
  {
    value: "trending-down",
    label: "Queda",
    icon: TrendingDown,
    group: "investimentos",
    keywords: ["queda", "desvalorização", "baixa", "risco"],
  },
  {
    value: "pie-chart",
    label: "Portfólio",
    icon: PieChart,
    group: "investimentos",
    keywords: ["portfólio", "diversificação", "ações", "fundos"],
  },
  {
    value: "dollar-sign",
    label: "Renda",
    icon: DollarSign,
    group: "investimentos",
    keywords: ["renda", "fluxo", "caixa", "entrada"],
  },
  {
    value: "home",
    label: "Moradia",
    icon: Home,
    group: "vida",
    keywords: ["moradia", "casa", "aluguel", "lar"],
  },
  {
    value: "car",
    label: "Carro",
    icon: Car,
    group: "vida",
    keywords: ["carro", "automóvel", "veículo", "garagem"],
  },
  {
    value: "bus-front",
    label: "Transporte",
    icon: BusFront,
    group: "vida",
    keywords: ["transporte", "ônibus", "metrô", "mobilidade"],
  },
  {
    value: "fuel",
    label: "Combustível",
    icon: Fuel,
    group: "vida",
    keywords: ["combustível", "gasolina", "etanol", "posto"],
  },
  {
    value: "plane",
    label: "Viagem",
    icon: Plane,
    group: "vida",
    keywords: ["viagem", "passagem", "férias", "avião"],
  },
  {
    value: "utensils",
    label: "Alimentação",
    icon: Utensils,
    group: "vida",
    keywords: ["alimentação", "mercado", "restaurante", "comida"],
  },
  {
    value: "heart-pulse",
    label: "Saúde",
    icon: HeartPulse,
    group: "vida",
    keywords: ["saúde", "médico", "farmácia", "plano"],
  },
  {
    value: "book-open",
    label: "Educação",
    icon: BookOpen,
    group: "vida",
    keywords: ["educação", "curso", "estudo", "livro"],
  },
  {
    value: "film",
    label: "Lazer",
    icon: Film,
    group: "vida",
    keywords: ["lazer", "cinema", "filme", "diversão"],
  },
  {
    value: "gamepad-2",
    label: "Extra",
    icon: Gamepad2,
    group: "vida",
    keywords: ["extra", "jogo", "hobby", "diversão"],
  },
  {
    value: "store",
    label: "Compras",
    icon: Store,
    group: "vida",
    keywords: ["compras", "loja", "varejo", "shopping"],
  },
  {
    value: "shopping-cart",
    label: "Carrinho",
    icon: ShoppingCart,
    group: "vida",
    keywords: ["carrinho", "compras", "pedido", "checkout"],
  },
  {
    value: "receipt",
    label: "Impostos",
    icon: Receipt,
    group: "vida",
    keywords: ["impostos", "taxa", "tributo", "guia"],
  },
  {
    value: "scale",
    label: "Tributo",
    icon: Scale,
    group: "vida",
    keywords: ["tributo", "balança", "justiça", "taxação"],
  },
  {
    value: "sparkles",
    label: "Extra",
    icon: Sparkles,
    group: "vida",
    keywords: ["extra", "outros", "diverso", "especial"],
  },
  {
    value: "building-2",
    label: "Empresa",
    icon: Building2,
    group: "negocios",
    keywords: ["empresa", "corporativo", "escritório", "estrutura"],
  },
  {
    value: "briefcase-business",
    label: "Negócio",
    icon: BriefcaseBusiness,
    group: "negocios",
    keywords: ["negócio", "freela", "serviço", "projeto"],
  },
  {
    value: "ticket",
    label: "Assinatura",
    icon: Ticket,
    group: "negocios",
    keywords: ["assinatura", "ingresso", "bilhete", "plano"],
  },
];

const iconMap = new Map(
  financeIconOptions.map((option) => [option.value, option]),
);

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function groupIcons(options: IconOption[]) {
  const grouped = new Map<FinanceIconGroup, IconOption[]>();

  for (const option of options) {
    const current = grouped.get(option.group) ?? [];
    current.push(option);
    grouped.set(option.group, current);
  }

  return financeIconGroupOrder
    .map((group) => ({
      group,
      label: financeIconGroupLabels[group],
      options: grouped.get(group) ?? [],
    }))
    .filter((entry) => entry.options.length > 0);
}

export function getFinanceIconOption(value?: string | null) {
  return iconMap.get(value ?? "") ?? iconMap.get("tag")!;
}

export function FinanceIcon({
  name,
  className,
  strokeWidth = 1.5,
}: {
  name?: string | null;
  className?: string;
  strokeWidth?: number;
}) {
  const Icon = getFinanceIconOption(name).icon;
  return <Icon className={className} strokeWidth={strokeWidth} />;
}

export function IconPicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState<FinanceIconGroup | "all">("all");
  const [activeIndex, setActiveIndex] = useState(0);
  const [placement, setPlacement] = useState<"bottom" | "top">("bottom");
  const [panelMaxHeight, setPanelMaxHeight] = useState(420);

  const selectedOption = getFinanceIconOption(value);
  const SelectedIcon = selectedOption.icon;

  const filteredOptions = useMemo(() => {
    const term = normalize(query);

    return financeIconOptions.filter((option) => {
      if (activeGroup !== "all" && option.group !== activeGroup) {
        return false;
      }

      if (!term) {
        return true;
      }

      const haystack = normalize(
        [
          option.label,
          financeIconGroupLabels[option.group],
          ...option.keywords,
          option.value,
        ].join(" "),
      );

      return haystack.includes(term);
    });
  }, [activeGroup, query]);

  const groupedOptions = useMemo(
    () => groupIcons(filteredOptions),
    [filteredOptions],
  );

  const flatOptions = filteredOptions;

  useEffect(() => {
    if (!open) return;

    setQuery("");
    setActiveGroup("all");
    setActiveIndex(Math.max(financeIconOptions.findIndex((item) => item.value === value), 0));

    const frame = window.requestAnimationFrame(() => {
      searchRef.current?.focus();
      searchRef.current?.select();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    if (flatOptions.length === 0) {
      setActiveIndex(0);
      return;
    }

    setActiveIndex((current) => Math.min(current, flatOptions.length - 1));
  }, [flatOptions.length, open]);

  useEffect(() => {
    if (!open) return;

    const updatePanelPosition = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;

      const margin = 20;
      const below = window.innerHeight - rect.bottom - margin;
      const above = rect.top - margin;
      const nextPlacement = below < 360 && above > below ? "top" : "bottom";
      const available = nextPlacement === "top" ? above : below;

      setPlacement(nextPlacement);
      setPanelMaxHeight(Math.min(420, Math.max(260, available)));
    };

    updatePanelPosition();
    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);

    return () => {
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  function closePicker() {
    setOpen(false);
  }

  function selectIcon(option: IconOption) {
    onChange(option.value);
    setOpen(false);
  }

  function openPicker() {
    if (disabled) return;

    const rect = rootRef.current?.getBoundingClientRect();
    if (rect) {
      const margin = 20;
      const below = window.innerHeight - rect.bottom - margin;
      const above = rect.top - margin;
      const nextPlacement = below < 360 && above > below ? "top" : "bottom";
      const available = nextPlacement === "top" ? above : below;

      setPlacement(nextPlacement);
      setPanelMaxHeight(Math.min(420, Math.max(260, available)));
    }

    setOpen(true);
  }

  function togglePicker() {
    if (open) {
      setOpen(false);
      return;
    }

    openPicker();
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      openPicker();
    }
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closePicker();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) =>
        flatOptions.length === 0 ? 0 : Math.min(current + 1, flatOptions.length - 1),
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(Math.max(flatOptions.length - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const option = flatOptions[activeIndex];
      if (option) {
        selectIcon(option);
      }
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={togglePicker}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Selecionar ícone. Atual: ${selectedOption.label}`}
        className={cn(
          "flex h-9 w-full items-center gap-2.5 border border-border bg-transparent px-3 text-left text-sm transition-colors ui-focus-ring disabled:cursor-not-allowed disabled:opacity-50",
          open && "border-foreground",
        )}
      >
        <span className="grid h-5 w-5 shrink-0 place-items-center text-muted-foreground">
          <SelectedIcon className="h-4 w-4" strokeWidth={1.5} />
        </span>

        <span className="min-w-0 flex-1 truncate font-mono text-xs uppercase tracking-[0.12em]">
          {selectedOption.label}
        </span>

        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
          strokeWidth={1.5}
        />
      </button>

      {open && !disabled && (
        <div
          className={cn(
            "absolute left-0 z-50 flex w-full min-w-[360px] flex-col overflow-hidden border border-border bg-background shadow-xl",
            placement === "top"
              ? "bottom-[calc(100%+6px)]"
              : "top-[calc(100%+6px)]",
          )}
          style={{ maxHeight: panelMaxHeight }}
        >
          <div className="shrink-0 border-b border-border px-3 py-3">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                strokeWidth={1.5}
              />
              <Input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Buscar ícone"
                className="h-9 border-border bg-background pl-9 pr-3 font-mono text-xs ui-focus-ring-inset"
              />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-1">
              {pickerGroups.map((group) => {
                const active = activeGroup === group.value;
                return (
                  <button
                    key={group.value}
                    type="button"
                    onClick={() => setActiveGroup(group.value)}
                    className={cn(
                      "h-7 min-w-0 truncate border px-2 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors ui-focus-ring-inset",
                      active
                        ? "border-foreground/40 bg-background text-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                    )}
                  >
                    {group.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className="min-h-0 flex-1 overflow-y-auto"
            style={{ maxHeight: Math.max(180, panelMaxHeight - 184) }}
          >
            <div className="p-2">
              {flatOptions.length === 0 ? (
                <div className="px-3 py-10 text-center">
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    Nenhum ícone encontrado
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Tente outro nome ou troque a categoria.
                  </p>
                </div>
              ) : (
                groupedOptions.map((group) => (
                  <div key={group.group} className="pb-3 last:pb-0">
                    <div className="px-1 pb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      {group.label}
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5">
                      {group.options.map((option) => {
                        const Icon = option.icon;
                        const active = option.value === value;
                        const focused =
                          flatOptions[activeIndex]?.value === option.value;

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => selectIcon(option)}
                            onMouseEnter={() =>
                              setActiveIndex(
                                flatOptions.findIndex(
                                  (candidate) => candidate.value === option.value,
                                ),
                              )
                            }
                            className={cn(
                              "group relative flex flex-col items-center gap-1 border border-transparent px-2 py-2 text-center transition-colors ui-focus-ring-inset",
                              focused && "border-border bg-background",
                              active &&
                                "border-foreground/40 bg-background text-foreground hover:bg-background",
                              !active &&
                                !focused &&
                                "bg-background hover:border-border hover:bg-background",
                            )}
                          >
                            <span
                              className={cn(
                                "grid h-9 w-9 place-items-center border border-border bg-background transition-colors",
                                active && "border-foreground/30 bg-background text-foreground",
                                focused &&
                                  !active &&
                                  "border-border bg-accent text-accent-foreground",
                              )}
                            >
                              <Icon className="h-4 w-4" strokeWidth={1.5} />
                            </span>

                            <span className="w-full truncate font-mono text-[10px] leading-4">
                              {option.label}
                            </span>

                            {active && (
                              <Check className="absolute right-1 top-1 h-3.5 w-3.5" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
