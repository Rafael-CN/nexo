import { useState, type ReactNode } from "react";
import { Database, Eye, EyeOff, Keyboard, Moon, RefreshCw, Sun, Upload } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { open as openExternal } from "@tauri-apps/plugin-shell";
import { Button } from "@/components/ui/button";
import { BackupSection } from "@/components/shared/BackupSection";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { ImportStatementModal } from "@/components/shared/ImportStatementModal";
import { ShortcutsHelp } from "@/components/shared/ShortcutsHelp";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTheme } from "@/hooks/useTheme";
import {
  currencyOptions,
  getCurrencyCode,
  setCurrencyCode,
  type CurrencyCode,
} from "@/lib/currency";
import { cn } from "@/lib/utils";
import { isTauri } from "@/lib/db";
import { checkForUpdate, getAppVersion, type UpdateInfo } from "@/lib/updates";
import { usePrivacyStore } from "@/store/usePrivacyStore";
import { dsHeroValue, dsSectionLabel } from "@/lib/designSystem";

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const privacyEnabled = usePrivacyStore((s) => s.enabled);
  const setPrivacy = usePrivacyStore((s) => s.setEnabled);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [importStatementOpen, setImportStatementOpen] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<
    | { state: "idle" }
    | { state: "checking" }
    | { state: "current" }
    | { state: "available"; update: UpdateInfo }
    | { state: "error"; message: string }
  >({ state: "idle" });

  async function handleCheckUpdates() {
    setUpdateStatus({ state: "checking" });
    try {
      const update = await checkForUpdate();
      setUpdateStatus(update ? { state: "available", update } : { state: "current" });
    } catch (err) {
      setUpdateStatus({
        state: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  function handleDownloadUpdate(update: UpdateInfo) {
    if (isTauri) {
      void openExternal(update.url);
    } else {
      window.open(update.url, "_blank", "noopener");
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <section className="border-b border-border pb-8">
        <p className={dsSectionLabel}>Nexo / configurações</p>
        <h1 className={`mt-3 ${dsHeroValue}`}>
          Preferências
        </h1>
        <p className="mt-2 font-mono text-xs text-muted-foreground">
          Ajustes locais — salvos no dispositivo
        </p>
      </section>

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

        <SettingRow
          label="Modo sigilo"
          description="Borra todos os valores monetários — útil em telas compartilhadas. Atalho: Ctrl/Cmd H."
        >
          <div className="flex items-center border border-border">
            <ThemeButton
              active={!privacyEnabled}
              onClick={() => setPrivacy(false)}
              className="border-r border-border"
            >
              <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />
              Visível
            </ThemeButton>
            <ThemeButton
              active={privacyEnabled}
              onClick={() => setPrivacy(true)}
            >
              <EyeOff className="h-3.5 w-3.5" strokeWidth={1.5} />
              Borrado
            </ThemeButton>
          </div>
        </SettingRow>
      </SettingsSection>

      <SettingsSection label="Teclado">
        <SettingRow
          label="Atalhos de teclado"
          description="Todo o app é navegável sem mouse. Pressione ? em qualquer tela para consultar."
        >
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-sm text-xs"
            onClick={() => setShortcutsOpen(true)}
          >
            <Keyboard className="h-3.5 w-3.5" strokeWidth={1.5} />
            Ver atalhos
          </Button>
        </SettingRow>
      </SettingsSection>

      <SettingsSection label="Formato">
        <SettingRow
          label="Moeda"
          description="Moeda usada em todos os valores do aplicativo. Trocar recarrega a interface."
        >
          <Select
            value={getCurrencyCode()}
            onValueChange={(value) => {
              setCurrencyCode(value as CurrencyCode);
              window.location.reload();
            }}
          >
            <SelectTrigger className="w-56 font-mono text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currencyOptions.map((option) => (
                <SelectItem key={option.code} value={option.code}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

      <SettingsSection label="Dados">
        <SettingRow
          label="Importar extrato"
          description="Importe transações de um arquivo OFX ou CSV exportado pelo seu banco, com revisão antes de salvar."
        >
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-sm text-xs"
            onClick={() => setImportStatementOpen(true)}
          >
            <Upload className="h-3.5 w-3.5" strokeWidth={1.5} />
            Importar OFX / CSV
          </Button>
        </SettingRow>

        <BackupSection />

        <SettingRow
          label="Persistência local"
          description="Os dados ficam no dispositivo, em SQLite. Exporte backups regularmente."
        >
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground/60">
            SQLite local
          </span>
        </SettingRow>

        <SettingRow
          label="Sincronização automática"
          description="Conexão direta com instituições financeiras via Open Finance."
        >
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground/60">
            Em breve
          </span>
        </SettingRow>
      </SettingsSection>

      <SettingsSection label="Desenvolvimento">
        <SettingRow
          label="Resetar banco de dados"
          description="Apaga todos os dados e reinicia o app. Irreversível."
        >
          <button
            type="button"
            onClick={async () => {
              if (
                !window.confirm(
                  "Apaga todos os dados e reinicia o app. Irreversível. Confirmar?",
                )
              ) {
                return;
              }
              if (isTauri) await invoke("reset_database");
              window.location.reload();
            }}
            className="inline-flex h-9 items-center gap-1.5 border border-red-500 px-3 font-mono text-[11px] uppercase tracking-wider text-red-500 transition-colors hover:bg-red-500/10"
          >
            <Database className="h-3.5 w-3.5" strokeWidth={1.5} />
            Resetar banco de dados
          </button>
        </SettingRow>
      </SettingsSection>

      <SettingsSection label="Sobre">
        <SettingRow label="Aplicativo" description="Nexo — finanças pessoais">
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
            v{getAppVersion()}
          </span>
        </SettingRow>

        <SettingRow
          label="Atualizações"
          description="Consulta os releases publicados no GitHub e baixa o instalador da versão nova."
        >
          <div className="flex items-center gap-3">
            {updateStatus.state === "current" && (
              <span className="font-mono text-[11px] text-success">
                Você está na versão mais recente.
              </span>
            )}
            {updateStatus.state === "error" && (
              <span className="font-mono text-[11px] text-destructive">
                {updateStatus.message}
              </span>
            )}
            {updateStatus.state === "available" ? (
              <Button
                size="sm"
                className="gap-1.5 rounded-sm text-xs"
                onClick={() => handleDownloadUpdate(updateStatus.update)}
              >
                Baixar v{updateStatus.update.version}
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 rounded-sm text-xs"
                onClick={handleCheckUpdates}
                disabled={updateStatus.state === "checking"}
              >
                <RefreshCw
                  className={cn(
                    "h-3.5 w-3.5",
                    updateStatus.state === "checking" && "animate-spin",
                  )}
                  strokeWidth={1.5}
                />
                Verificar atualizações
              </Button>
            )}
          </div>
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

      <ShortcutsHelp open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <ImportStatementModal
        open={importStatementOpen}
        onOpenChange={setImportStatementOpen}
      />
    </div>
  );
}

function SettingsSection({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-0">
      <SectionHeader className="mb-3" label={label} />
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
  children: ReactNode;
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
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-9 items-center gap-1.5 px-3 font-mono text-[11px] uppercase tracking-wider transition-colors",
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
