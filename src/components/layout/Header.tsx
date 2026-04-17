import { useLocation } from "react-router-dom";
import { Bell, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

const titles: Record<string, { title: string; subtitle: string }> = {
  "/": {
    title: "Visão Geral",
    subtitle: "Sua vida financeira num piscar de olhos.",
  },
  "/calendario": {
    title: "Projeção de Calendário",
    subtitle: "Veja como seu saldo evolui dia a dia.",
  },
  "/contas": {
    title: "Contas",
    subtitle: "Saldos, instituições e organização.",
  },
  "/transacoes": {
    title: "Transações",
    subtitle: "Histórico detalhado e lançamentos futuros.",
  },
  "/metas": {
    title: "Metas",
    subtitle: "Objetivos financeiros e progresso.",
  },
  "/configuracoes": {
    title: "Configurações",
    subtitle: "Preferências, categorias e conta.",
  },
};

export function Header() {
  const { pathname } = useLocation();
  const info = titles[pathname] ?? titles["/"];

  return (
    <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-border bg-background/70 px-8 py-4 backdrop-blur">
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-xl font-semibold tracking-tight">
          {info.title}
        </h1>
        <p className="truncate text-sm text-muted-foreground">
          {info.subtitle}
        </p>
      </div>

      <div className="hidden items-center gap-2 md:flex">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Buscar transação, conta..."
            className="h-9 w-72 rounded-md border border-border bg-card pl-9 pr-3 text-sm shadow-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
        </div>

        <Button variant="outline" size="icon" aria-label="Notificações">
          <Bell className="h-4 w-4" />
        </Button>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Nova transação
        </Button>
      </div>
    </header>
  );
}
