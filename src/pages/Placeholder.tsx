import { Construction } from "lucide-react";

export function PlaceholderPage({ label }: { label: string }) {
  return (
    <div className="grid place-items-center gap-3 border border-dashed border-border py-16 text-center">
      <Construction
        className="h-5 w-5 text-muted-foreground"
        strokeWidth={1.5}
      />
      <p className="font-mono text-[11px] uppercase tracking-wider">
        {label}
      </p>
      <p className="max-w-sm text-xs text-muted-foreground">
        Esta seção ainda não foi construída. Voltaremos aqui nas próximas
        iterações.
      </p>
    </div>
  );
}
