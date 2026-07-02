import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ShortcutEntry = {
  keys: string[];
  label: string;
};

type ShortcutGroup = {
  title: string;
  entries: ShortcutEntry[];
};

const groups: ShortcutGroup[] = [
  {
    title: "Global",
    entries: [
      { keys: ["Ctrl/Cmd", "K"], label: "Busca e comandos" },
      { keys: ["Ctrl/Cmd", "N"], label: "Nova transação" },
      { keys: ["Ctrl/Cmd", "T"], label: "Nova transferência" },
      { keys: ["Ctrl/Cmd", "1–7"], label: "Navegar entre páginas" },
      { keys: ["Ctrl/Cmd", ","], label: "Configurações" },
      { keys: ["?"], label: "Esta ajuda" },
    ],
  },
  {
    title: "Modal de lançamento",
    entries: [
      { keys: ["Ctrl", "Tab"], label: "Alternar despesa / receita / transferência" },
      { keys: ["Ctrl/Cmd", "Enter"], label: "Salvar" },
      { keys: ["Tab"], label: "Avançar entre campos" },
      { keys: ["Esc"], label: "Fechar" },
    ],
  },
  {
    title: "Calendário",
    entries: [
      { keys: ["Setas"], label: "Mover o dia selecionado" },
      { keys: ["Shift", "Setas"], label: "Estender a seleção" },
      { keys: ["Enter"], label: "Novo lançamento no dia" },
      { keys: ["T"], label: "Voltar para hoje" },
      { keys: ["PgUp / PgDn"], label: "Mês anterior / seguinte" },
    ],
  },
  {
    title: "Transações",
    entries: [
      { keys: ["/"], label: "Buscar por título" },
      { keys: ["F"], label: "Mostrar / ocultar filtros" },
    ],
  },
  {
    title: "Relatórios",
    entries: [{ keys: ["[", "]"], label: "Período anterior / seguinte" }],
  },
];

export function ShortcutsHelp({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-6 py-5 pb-4">
          <DialogTitle>Atalhos de teclado</DialogTitle>
          <DialogDescription>
            Tudo no Nexo é acessível sem tocar no mouse.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[26rem]">
          <div className="space-y-6 px-6 py-5">
            {groups.map((group) => (
              <section key={group.title} className="space-y-2">
                <div className="flex items-center gap-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    {group.title}
                  </p>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="border border-border">
                  {group.entries.map((entry) => (
                    <div
                      key={entry.label}
                      className="flex items-center justify-between gap-4 border-b border-border px-4 py-2.5 last:border-b-0"
                    >
                      <p className="text-sm text-foreground">{entry.label}</p>
                      <span className="flex shrink-0 items-center gap-1">
                        {entry.keys.map((key) => (
                          <kbd
                            key={key}
                            className="inline-flex h-5 min-w-5 items-center justify-center border border-border bg-accent/40 px-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
                          >
                            {key}
                          </kbd>
                        ))}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
