import { ArrowDownToLine, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UpdateInfo } from "@/lib/updates";

interface Props {
  info: UpdateInfo;
  onDownload: () => void;
  onDismiss: () => void;
}

/** Aviso discreto de versão nova, no canto inferior direito. */
export function UpdateBanner({ info, onDownload, onDismiss }: Props) {
  return (
    <div
      role="status"
      className="fixed bottom-5 right-5 z-40 w-80 border border-border bg-background shadow-[0_24px_56px_-30px_rgba(0,0,0,0.85)] animate-fade-in"
    >
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Atualização disponível
          </p>
          <p className="mt-1 text-sm font-medium">Nexo v{info.version}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          aria-label="Dispensar aviso"
          onClick={onDismiss}
        >
          <X className="h-3.5 w-3.5" strokeWidth={1.5} />
        </Button>
      </div>

      <div className="space-y-3 px-4 py-3">
        <p className="text-xs leading-5 text-muted-foreground">
          Baixe o instalador da nova versão e execute — seus dados locais são
          preservados.
        </p>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="gap-1.5 rounded-sm text-xs"
            onClick={onDownload}
          >
            <ArrowDownToLine className="h-3.5 w-3.5" strokeWidth={1.5} />
            Baixar v{info.version}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-sm text-xs"
            onClick={onDismiss}
          >
            Depois
          </Button>
        </div>
      </div>
    </div>
  );
}
