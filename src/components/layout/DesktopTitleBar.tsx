import { getCurrentWindow } from "@tauri-apps/api/window";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import nexoMarkDark from "@/assets/nexo-mark-dark.png";
import nexoMarkLight from "@/assets/nexo-mark-light.png";

export function DesktopTitleBar() {
  return (
    <div className="flex h-9 shrink-0 select-none items-center border-b border-border bg-background">
      <div
        data-tauri-drag-region
        className="flex min-w-0 flex-1 items-center gap-2 px-3"
      >
        <img
          src={nexoMarkLight}
          alt=""
          aria-hidden
          className="h-4 w-4 rounded-[4px] dark:hidden"
          draggable={false}
        />
        <img
          src={nexoMarkDark}
          alt=""
          aria-hidden
          className="hidden h-4 w-4 rounded-[4px] dark:block"
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
          onClick={() => void getCurrentWindow().minimize()}
        >
          <WindowGlyph type="minimize" />
        </WindowButton>
        <WindowButton
          label="Maximizar"
          onClick={() => void getCurrentWindow().toggleMaximize()}
        >
          <WindowGlyph type="maximize" />
        </WindowButton>
        <WindowButton
          label="Fechar"
          onClick={() => void getCurrentWindow().close()}
          danger
        >
          <WindowGlyph type="close" />
        </WindowButton>
      </div>
    </div>
  );
}

function WindowGlyph({ type }: { type: "minimize" | "maximize" | "close" }) {
  const glyphs = {
    minimize: "\uE921",
    maximize: "\uE922",
    close: "\uE8BB",
  };

  return (
    <span
      aria-hidden
      className="grid h-4 w-4 place-items-center text-[10px] leading-none"
      style={{
        fontFamily:
          '"Segoe MDL2 Assets", "Segoe Fluent Icons", system-ui, sans-serif',
      }}
    >
      {glyphs[type]}
    </span>
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
        danger
          ? "h-9 w-11 rounded-none hover:bg-destructive hover:text-destructive-foreground"
          : "h-9 w-11 rounded-none"
      }
      onClick={onClick}
      onPointerDown={(event) => event.stopPropagation()}
      size="icon"
      type="button"
      variant="ghost"
    >
      <span className="grid h-4 w-4 place-items-center">{children}</span>
    </Button>
  );
}
