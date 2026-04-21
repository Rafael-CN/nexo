import { useLocation } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

const titles: Record<string, string> = {
  "/": "Visão Geral",
  "/calendario": "Calendário",
  "/contas": "Contas",
  "/transacoes": "Transações",
  "/metas": "Metas",
  "/configuracoes": "Configurações",
};

interface HeaderProps {
  onNewTransaction: () => void;
}

export function Header({ onNewTransaction }: HeaderProps) {
  const { pathname } = useLocation();
  const title = titles[pathname] ?? "Visão Geral";
  const today = format(new Date(), "dd MMM yyyy", { locale: ptBR });

  return (
    <header className="sticky top-0 z-20 flex h-12 items-center gap-4 border-b border-border bg-background px-6">
      <div className="flex min-w-0 flex-1 items-baseline gap-3">
        <h1 className="truncate text-sm font-medium tracking-tight">{title}</h1>
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          {today}
        </span>
      </div>

      <div className="hidden items-center gap-2 md:flex">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            strokeWidth={1.5}
          />
          <input
            type="search"
            placeholder="Buscar"
            className="h-8 w-64 rounded-sm border border-border bg-background pl-8 pr-3 font-mono text-xs outline-none transition focus:border-foreground/40"
          />
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 font-mono text-[10px] text-muted-foreground">
            Ctrl K
          </span>
        </div>

        <Button
          size="sm"
          className="gap-1.5 rounded-sm text-xs"
          onClick={onNewTransaction}
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          Nova transação
        </Button>
      </div>
    </header>
  );
}
