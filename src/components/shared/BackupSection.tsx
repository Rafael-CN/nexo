import { useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { FileDown, FileUp, Table } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFinanceStore } from "@/store/useFinanceStore";
import { isTauri } from "@/lib/db";
import {
  buildBackupFile,
  buildTransactionsCsv,
  downloadTextFile,
  mergeBackupData,
  parseBackupFile,
  suggestedBackupFileName,
  suggestedCsvFileName,
  type BackupFile,
  type BackupMode,
  type ImportSummary,
} from "@/lib/backup";
import { cn } from "@/lib/utils";

type PendingImport = {
  fileName: string;
  json: string;
  parsed: BackupFile;
};

type Feedback = { tone: "success" | "error"; message: string };

export function BackupSection() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingImport | null>(null);
  const [mode, setMode] = useState<BackupMode>("merge");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  function snapshot() {
    const state = useFinanceStore.getState();
    return {
      accounts: state.accounts,
      categories: state.categories,
      recurrenceRules: state.recurrenceRules,
      transactions: state.transactions,
      goals: state.goals,
    };
  }

  async function handleExportJson() {
    setFeedback(null);
    try {
      setBusy(true);
      const fileName = suggestedBackupFileName();
      if (isTauri) {
        const path = await save({
          defaultPath: fileName,
          filters: [{ name: "Backup do Nexo", extensions: ["json"] }],
        });
        if (!path) return;
        await invoke("export_backup", {
          path,
          exportedAt: new Date().toISOString(),
        });
      } else {
        downloadTextFile(
          fileName,
          JSON.stringify(buildBackupFile(snapshot()), null, 2),
        );
      }
      setFeedback({ tone: "success", message: "Backup exportado." });
    } catch (err) {
      setFeedback({ tone: "error", message: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  async function handleExportCsv() {
    setFeedback(null);
    try {
      setBusy(true);
      const fileName = suggestedCsvFileName();
      if (isTauri) {
        const path = await save({
          defaultPath: fileName,
          filters: [{ name: "CSV", extensions: ["csv"] }],
        });
        if (!path) return;
        await invoke("export_transactions_csv", { path });
      } else {
        downloadTextFile(
          fileName,
          `\ufeff${buildTransactionsCsv(snapshot())}`,
          "text/csv",
        );
      }
      setFeedback({ tone: "success", message: "CSV de transações exportado." });
    } catch (err) {
      setFeedback({ tone: "error", message: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  async function handleFileSelected(file: File) {
    setFeedback(null);
    try {
      const json = await file.text();
      const parsed = parseBackupFile(json);
      setPending({ fileName: file.name, json, parsed });
      setMode("merge");
    } catch (err) {
      setPending(null);
      setFeedback({ tone: "error", message: errorMessage(err) });
    }
  }

  async function handleConfirmImport() {
    if (!pending) return;
    setFeedback(null);
    try {
      setBusy(true);
      let summary: ImportSummary;
      if (isTauri) {
        summary = await invoke<ImportSummary>("import_backup", {
          json: pending.json,
          mode,
        });
        await useFinanceStore.getState().initialize();
      } else {
        const result = mergeBackupData(snapshot(), pending.parsed.data, mode);
        useFinanceStore.getState().hydrateLocal(result.data);
        summary = result.summary;
      }
      setPending(null);
      setFeedback({ tone: "success", message: summaryMessage(summary) });
    } catch (err) {
      setFeedback({ tone: "error", message: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  const counts = pending
    ? [
        `${pending.parsed.data.accounts.length} contas`,
        `${pending.parsed.data.categories.length} categorias`,
        `${pending.parsed.data.transactions.length} transações`,
        `${pending.parsed.data.goals.length} metas`,
      ].join(" · ")
    : "";

  return (
    <div className="space-y-0">
      <SettingLikeRow
        label="Backup completo"
        description="Exporta contas, categorias, transações, recorrências e metas em um único arquivo JSON."
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-sm text-xs"
            onClick={handleExportJson}
            disabled={busy}
          >
            <FileDown className="h-3.5 w-3.5" strokeWidth={1.5} />
            Exportar
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-sm text-xs"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
          >
            <FileUp className="h-3.5 w-3.5" strokeWidth={1.5} />
            Importar
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void handleFileSelected(file);
            }}
          />
        </div>
      </SettingLikeRow>

      {pending && (
        <div className="space-y-4 border-b border-border bg-accent/20 px-4 py-4">
          <div>
            <p className="text-sm font-medium">{pending.fileName}</p>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">
              {counts}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <ModeOption
              checked={mode === "merge"}
              onSelect={() => setMode("merge")}
              label="Mesclar"
              description="adiciona apenas o que não existe"
            />
            <ModeOption
              checked={mode === "replace"}
              onSelect={() => setMode("replace")}
              label="Substituir tudo"
              description="apaga os dados atuais antes"
              destructive
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className={cn(
                "rounded-sm text-xs",
                mode === "replace" &&
                  "bg-destructive text-destructive-foreground hover:bg-destructive/90",
              )}
              onClick={handleConfirmImport}
              disabled={busy}
            >
              {mode === "replace"
                ? "Substituir e importar"
                : "Importar"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-sm text-xs"
              onClick={() => setPending(null)}
              disabled={busy}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      <SettingLikeRow
        label="Transações em CSV"
        description="Planilha pt-BR (separador ; e decimal ,) para Excel, LibreOffice ou Google Sheets."
      >
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 rounded-sm text-xs"
          onClick={handleExportCsv}
          disabled={busy}
        >
          <Table className="h-3.5 w-3.5" strokeWidth={1.5} />
          Exportar CSV
        </Button>
      </SettingLikeRow>

      {feedback && (
        <p
          role="status"
          className={cn(
            "py-3 font-mono text-[11px]",
            feedback.tone === "success" ? "text-success" : "text-destructive",
          )}
        >
          {feedback.message}
        </p>
      )}
    </div>
  );
}

function ModeOption({
  checked,
  onSelect,
  label,
  description,
  destructive,
}: {
  checked: boolean;
  onSelect: () => void;
  label: string;
  description: string;
  destructive?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <input
        type="radio"
        name="backup-mode"
        checked={checked}
        onChange={onSelect}
        className="h-3.5 w-3.5 accent-current"
      />
      <span
        className={cn(
          "text-xs font-medium",
          destructive && "text-destructive",
        )}
      >
        {label}
      </span>
      <span className="font-mono text-[10px] text-muted-foreground">
        {description}
      </span>
    </label>
  );
}

function SettingLikeRow({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-8 border-b border-border py-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-0.5 font-mono text-[11px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function summaryMessage(summary: ImportSummary) {
  const parts = [
    summary.accounts && `${summary.accounts} contas`,
    summary.categories && `${summary.categories} categorias`,
    summary.recurrenceRules && `${summary.recurrenceRules} recorrências`,
    summary.transactions && `${summary.transactions} transações`,
    summary.goals && `${summary.goals} metas`,
  ].filter(Boolean);

  const imported =
    parts.length > 0 ? `Importado: ${parts.join(", ")}.` : "Nada novo para importar.";
  const skipped =
    summary.skipped > 0 ? ` ${summary.skipped} registros já existiam.` : "";

  return `${imported}${skipped}`;
}

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}
