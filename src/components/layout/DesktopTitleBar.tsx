import { getCurrentWindow } from "@tauri-apps/api/window";
import type { ReactNode } from "react";
import { Minus, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import nexoIcon from "@/assets/nexo-icon.png";

export function DesktopTitleBar() {
  return (
    <div
      data-tauri-drag-region
      className="flex h-9 shrink-0 select-none items-center border-b border-border bg-background"
    >
      <div
        data-tauri-drag-region
        className="flex min-w-0 flex-1 items-center gap-2 px-3"
      >
        <img
          src={nexoIcon}
          alt=""
          aria-hidden
          className="h-4 w-4 rounded-[4px]"
          draggable={false}
        />
        <span className="truncate font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-foreground">
          Nexo
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Desktop
        </span>
      </div>

      <div className="flex h-full items-center">
        <WindowButton
          label="Minimizar"
          onClick={() => void withAppWindow((window) => window.minimize())}
        >
          <Minus className="h-3.5 w-3.5" strokeWidth={1.5} />
        </WindowButton>
        <WindowButton
          label="Maximizar"
          onClick={() => void withAppWindow((window) => window.toggleMaximize())}
        >
          <Square className="h-3 w-3" strokeWidth={1.5} />
        </WindowButton>
        <WindowButton
          label="Fechar"
          onClick={() => void withAppWindow((window) => window.close())}
          danger
        >
          <X className="h-3.5 w-3.5" strokeWidth={1.5} />
        </WindowButton>
      </div>
    </div>
  );
}

function WindowButton({
  children,
  danger,
  label,
  onClick,
}: {
  children: ReactNode;
  danger?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      aria-label={label}
      className={
        danger ? "hover:bg-destructive hover:text-destructive-foreground" : undefined
      }
      onClick={onClick}
      size="icon"
      type="button"
      variant="ghost"
    >
      {children}
    </Button>
  );
}

async function withAppWindow(
  action: (window: ReturnType<typeof getCurrentWindow>) => Promise<void>,
) {
  try {
    await action(getCurrentWindow());
  } catch {
    // Window controls are only available inside the Tauri runtime.
  }
}
