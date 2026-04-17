import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarDays,
  Wallet,
  ArrowLeftRight,
  Target,
  Settings,
  Moon,
  Sun,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "@/hooks/useTheme";

type Item = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: string;
};

const primary: Item[] = [
  { to: "/", label: "Visão Geral", icon: LayoutDashboard },
  { to: "/calendario", label: "Calendário", icon: CalendarDays, badge: "novo" },
  { to: "/contas", label: "Contas", icon: Wallet },
  { to: "/transacoes", label: "Transações", icon: ArrowLeftRight },
];

const secondary: Item[] = [
  { to: "/metas", label: "Metas", icon: Target },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

export function Sidebar() {
  const { theme, toggle } = useTheme();

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-border bg-card/60 backdrop-blur-sm">
      <div className="flex items-center gap-2.5 px-5 pb-5 pt-6">
        <div className="grid h-9 w-9 place-items-center rounded-lg gradient-primary shadow-sm">
          <Sparkles className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-[15px] font-semibold tracking-tight">
            Financeiro
          </span>
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Projeção Inteligente
          </span>
        </div>
      </div>

      <Separator />

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="px-3 pb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Principal
        </p>
        <ul className="space-y-0.5">
          {primary.map((item) => (
            <SidebarItem key={item.to} item={item} />
          ))}
        </ul>

        <p className="px-3 pb-2 pt-6 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Ferramentas
        </p>
        <ul className="space-y-0.5">
          {secondary.map((item) => (
            <SidebarItem key={item.to} item={item} />
          ))}
        </ul>
      </nav>

      <Separator />

      <div className="flex items-center justify-between gap-2 px-4 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-[13px] font-semibold text-white">
            SS
          </div>
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-sm font-medium">Steve Souza</span>
            <span className="truncate text-xs text-muted-foreground">
              stecsouza26@gmail.com
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          aria-label={
            theme === "dark"
              ? "Ativar modo claro"
              : "Ativar modo escuro"
          }
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>
      </div>
    </aside>
  );
}

function SidebarItem({ item }: { item: Item }) {
  const Icon = item.icon;
  return (
    <li>
      <NavLink
        to={item.to}
        end={item.to === "/"}
        className={({ isActive }) =>
          cn(
            "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            isActive
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
          )
        }
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate">{item.label}</span>
        {item.badge && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
            {item.badge}
          </span>
        )}
      </NavLink>
    </li>
  );
}
