import { Moon, Sun, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";
import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "@/lib/db";

export function SettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-10">
      <section className="border-b border-border pb-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Configurações
        </p>
        <h1 className="mt-3 font-mono text-4xl font-light tracking-tight md:text-5xl">
          Preferências
        </h1>
        <p className="mt-2 font-mono text-xs text-muted-foreground">
          Ajustes locais — salvos no dispositivo
        </p>
      </section>

      {/* Aparência */}
      <SettingsSection label="Aparência">
        <SettingRow
          label="Tema"
          description="Alterna entre modo claro e escuro. Salvo automaticamente."
        >
          <div className="flex items-center border border-border">
            <ThemeButton
              active={theme === "light"}
              onClick={() => setTheme("light")}
              className="border-r border-border"
            >
              <Sun className="h-3.5 w-3.5" strokeWidth={1.5} />
              Claro
            </ThemeButton>
            <ThemeButton
              active={theme === "dark"}
              onClick={() => setTheme("dark")}
            >
              <Moon className="h-3.5 w-3.5" strokeWidth={1.5} />
              Escuro
            </ThemeButton>
          </div>
        </SettingRow>
      </SettingsSection>

      {/* Formato */}
      <SettingsSection label="Formato">
        <SettingRow
          label="Moeda"
          description="Moeda usada em todos os valores do aplicativo."
        >
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm tabular-nums">
              BRL — Real Brasileiro (R$)
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/60">
              padrão
            </span>
          </div>
        </SettingRow>

        <SettingRow
          label="Idioma e datas"
          description="Formato de datas e números usado na interface."
        >
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm">
              pt-BR — Português Brasil
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/60">
              padrão
            </span>
          </div>
        </SettingRow>

        <SettingRow
          label="Fuso horário"
          description="Usado para calcular datas de vencimento e projeções."
        >
          <span className="font-mono text-sm text-muted-foreground">
            {Intl.DateTimeFormat().resolvedOptions().timeZone}
          </span>
        </SettingRow>
      </SettingsSection>

      {/* Sincronização */}
      <SettingsSection label="Sincronização">
        <SettingRow
          label="Importar extrato"
          description="Importe transações a partir de arquivo OFX ou CSV exportado pelo seu banco."
        >
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-sm text-xs"
            disabled
          >
            <Upload className="h-3.5 w-3.5" strokeWidth={1.5} />
            Importar OFX / CSV
          </Button>
        </SettingRow>

        <SettingRow
          label="Sincronização automática"
          description="Conexão direta com instituições financeiras via Open Finance."
        >
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground/60">
            Em breve
          </span>
        </SettingRow>

        <SettingRow
          label="Persistência local"
          description="Os dados são armazenados localmente no dispositivo via SQLite (Tauri)."
        >
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground/60">
            Em desenvolvimento
          </span>
        </SettingRow>
      </SettingsSection>

      {/* Desenvolvimento */}
      <SettingsSection label="Desenvolvimento">
        <SettingRow
          label="Resetar banco de dados"
          description="Apaga todos os dados e reinicia o app. Irreversível."
        >
          <button
            type="button"
            onClick={async () => {
              if (!window.confirm("Apaga todos os dados e reinicia o app. Irreversível. Confirmar?")) return;
              if (isTauri) await invoke("reset_database");
              window.location.reload();
            }}
            className="border border-red-500 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-red-500 transition-colors hover:bg-red-500/10"
          >
            Resetar banco de dados
          </button>
        </SettingRow>
      </SettingsSection>

      {/* Sobre */}
      <SettingsSection label="Sobre">
        <SettingRow label="Aplicativo" description="Financeiro — finanças pessoais">
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
            v0.1.0
          </span>
        </SettingRow>
        <SettingRow
          label="Stack"
          description="Tauri v2 · React 18 · TypeScript · Tailwind CSS"
        >
          <span className="font-mono text-[11px] text-muted-foreground/60">
            build local
          </span>
        </SettingRow>
      </SettingsSection>
    </div>
  );
}

function SettingsSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-0">
      <div className="mb-3 flex items-center gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </p>
        <div className="h-px flex-1 bg-border" />
      </div>
      <div className="border-t border-border">{children}</div>
    </section>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-8 border-b border-border py-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        {description && (
          <p className="mt-0.5 font-mono text-[11px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function ThemeButton({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors",
        active
          ? "bg-foreground text-background"
          : "bg-background text-muted-foreground hover:bg-accent hover:text-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}
