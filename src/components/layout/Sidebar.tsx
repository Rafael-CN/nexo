import { NavLink } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";
import { appRoutes } from "@/lib/navigation";
import { getProfileInitials, type LocalProfile } from "@/lib/profile";
import { cn } from "@/lib/utils";

type Item = (typeof appRoutes)[number];

const primary: Item[] = appRoutes.slice(0, 5);
const secondary: Item[] = appRoutes.slice(5);

export function Sidebar({
  profile,
  className,
}: {
  profile: LocalProfile | null;
  className?: string;
}) {
  const { theme, toggle } = useTheme();
  const profileName = profile?.name ?? "Usuário local";
  const profileSubtext = profile ? "perfil local" : "sem perfil";
  const initials = getProfileInitials(profileName);

  return (
    <aside
      className={cn(
        "flex h-full w-64 shrink-0 flex-col border-r border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90",
        className,
      )}
    >
      <div className="border-b border-border px-5 pb-4 pt-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Nexo
            </p>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="font-mono text-[15px] font-medium tracking-tight">
                Nexo
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">
                /v1
              </span>
            </div>
          </div>
          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2">
        <p className="px-2 pb-1.5 pt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Principal
        </p>
        <ul className="space-y-px">
          {primary.map((item) => (
            <SidebarItem key={item.path} item={item} />
          ))}
        </ul>

        <p className="px-2 pb-1.5 pt-5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Ferramentas
        </p>
        <ul className="space-y-px">
          {secondary.map((item) => (
            <SidebarItem key={item.path} item={item} />
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
        to={item.path}
        end={item.path === "/"}
        className={({ isActive }) =>
          cn(
            "group flex min-h-8 items-center gap-2.5 rounded-sm px-2 text-sm transition-colors ui-focus-ring-inset",
            isActive
              ? "bg-accent font-medium text-foreground"
              : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
          )
        }
      >
        <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
        <span className="flex-1 truncate">{item.label}</span>
        <span className="inline-flex h-4 min-w-4 items-center justify-center border border-border px-1 font-mono text-[10px] text-muted-foreground/70 group-hover:text-muted-foreground">
          {item.shortcut}
        </span>
      </NavLink>
    </li>
  );
}
