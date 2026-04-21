import { NavLink } from "react-router-dom";
import {
  ArrowLeftRight,
  CalendarDays,
  LayoutDashboard,
  Moon,
  Settings,
  Sun,
  Target,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";
import { getProfileInitials, type LocalProfile } from "@/lib/profile";
import { cn } from "@/lib/utils";

type Item = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  shortcut?: string;
};

const primary: Item[] = [
  { to: "/", label: "Visão Geral", icon: LayoutDashboard, shortcut: "G" },
  { to: "/calendario", label: "Calendário", icon: CalendarDays, shortcut: "C" },
  { to: "/contas", label: "Contas", icon: Wallet, shortcut: "A" },
  { to: "/transacoes", label: "Transações", icon: ArrowLeftRight, shortcut: "T" },
];

const secondary: Item[] = [
  { to: "/metas", label: "Metas", icon: Target },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

export function Sidebar({ profile }: { profile: LocalProfile | null }) {
  const { theme, toggle } = useTheme();
  const profileName = profile?.name ?? "Usuário local";
  const profileSubtext = profile ? "perfil local" : "sem perfil";
  const initials = getProfileInitials(profileName);

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border bg-background">
      <div className="flex items-center justify-between px-5 pb-5 pt-6">
        <div className="flex items-baseline gap-1.5">
          <span className="font-mono text-[15px] font-medium tracking-tight">
            financeiro
          </span>
          <span className="font-mono text-[11px] text-muted-foreground">
            /v1
          </span>
        </div>
        <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2">
        <p className="px-2 pb-1.5 pt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Principal
        </p>
        <ul className="space-y-px">
          {primary.map((item) => (
            <SidebarItem key={item.to} item={item} />
          ))}
        </ul>

        <p className="px-2 pb-1.5 pt-5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Ferramentas
        </p>
        <ul className="space-y-px">
          {secondary.map((item) => (
            <SidebarItem key={item.to} item={item} />
          ))}
        </ul>
      </nav>

      <div className="border-t border-border">
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="grid h-7 w-7 shrink-0 place-items-center border border-border text-[11px] font-medium">
              {initials}
            </div>
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-xs font-medium">{profileName}</span>
              <span className="truncate font-mono text-[10px] text-muted-foreground">
                {profileSubtext}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            className="h-7 w-7"
            aria-label={
              theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"
            }
          >
            {theme === "dark" ? (
              <Sun className="h-3.5 w-3.5" strokeWidth={1.5} />
            ) : (
              <Moon className="h-3.5 w-3.5" strokeWidth={1.5} />
            )}
          </Button>
        </div>
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
            "group flex items-center gap-2.5 rounded-sm px-2 py-1.5 text-sm transition-colors",
            isActive
              ? "bg-accent font-medium text-foreground"
              : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
          )
        }
      >
        <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
        <span className="flex-1 truncate">{item.label}</span>
        {item.shortcut && (
          <span className="font-mono text-[10px] text-muted-foreground/60 group-hover:text-muted-foreground">
            {item.shortcut}
          </span>
        )}
      </NavLink>
    </li>
  );
}
