import { useLocation } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getRouteTitle } from "@/lib/navigation";

interface HeaderProps {
  onOpenCommandPalette: () => void;
  onNewTransaction: () => void;
}

export function Header({ onOpenCommandPalette, onNewTransaction }: HeaderProps) {
  const { pathname } = useLocation();
  const title = getRouteTitle(pathname);
  const today = format(new Date(), "dd MMM yyyy", { locale: ptBR });

  return (
    <header className="sticky top-0 z-20 flex min-h-14 items-center gap-4 border-b border-border bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Nexo
        </p>
        <div className="flex min-w-0 items-baseline gap-3">
          <h1 className="truncate text-sm font-medium tracking-tight">{title}</h1>
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            {today}
          </span>
        </div>
      </div>

      <div className="hidden items-center gap-2 md:flex">
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenCommandPalette}
          className="h-8 w-64 justify-between rounded-sm px-3 font-normal text-muted-foreground hover:text-foreground"
          aria-label="Abrir busca e comandos"
        >
          <span className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
            <span className="font-mono text-xs">Buscar</span>
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">
            Ctrl/Cmd K
          </span>
        </Button>

        <Button
          size="sm"
          className="gap-2 rounded-sm text-xs"
          onClick={onNewTransaction}
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          <span>Nova transação</span>
          <span className="font-mono text-[10px] uppercase text-muted-foreground">
            Ctrl/Cmd N
          </span>
        </Button>
      </div>
    </header>
  );
}
