import { useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileUp, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFinanceStore } from "@/store/useFinanceStore";
import { formatCurrency } from "@/lib/format";
import {
  markDuplicates,
  parseStatement,
  readStatementFile,
  rememberCategory,
  suggestCategory,
  type StatementEntry,
} from "@/lib/statement";
import { getDefaultTransactionAccountId } from "@/components/shared/transactionModalUtils";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ReviewRow extends StatementEntry {
  key: string;
  isDuplicate: boolean;
  included: boolean;
  categoryId: string;
}

const labelClass =
  "text-[10px] uppercase tracking-[0.12em] text-muted-foreground";

export function ImportStatementModal({ open, onOpenChange }: Props) {
  const accounts = useFinanceStore(useShallow((s) => s.accounts));
  const categories = useFinanceStore(useShallow((s) => s.categories));
  const transactions = useFinanceStore(useShallow((s) => s.transactions));
  const addTransaction = useFinanceStore((s) => s.addTransaction);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rawEntries, setRawEntries] = useState<StatementEntry[]>([]);
  const [skipped, setSkipped] = useState(0);
  const [accountId, setAccountId] = useState("");
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [defaultCategoryId, setDefaultCategoryId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);

  const expenseCategories = useMemo(
    () => categories.filter((category) => category.kind === "expense"),
    [categories],
  );
  const incomeCategories = useMemo(
    () => categories.filter((category) => category.kind === "income"),
    [categories],
  );

  function reset() {
    setFileName(null);
    setRawEntries([]);
    setSkipped(0);
    setRows([]);
    setDefaultCategoryId("");
    setError(null);
    setImporting(false);
    setDoneMessage(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function buildRows(entries: StatementEntry[], targetAccountId: string) {
    const marked = markDuplicates(entries, transactions, targetAccountId);
    return marked.map((entry, index) => {
      const suggested = suggestCategory(entry.title);
      const suggestionValid = categories.some(
        (category) =>
          category.id === suggested &&
          category.kind === (entry.type === "income" ? "income" : "expense"),
      );
      return {
        ...entry,
        key: `${entry.date}-${index}`,
        included: !entry.isDuplicate,
        categoryId: suggestionValid && suggested ? suggested : "",
      };
    });
  }

  async function handleFileSelected(file: File) {
    setError(null);
    setDoneMessage(null);
    try {
      const contents = await readStatementFile(file);
      const result = parseStatement(file.name, contents);
      if (result.entries.length === 0) {
        setError(
          "Não foi possível interpretar o arquivo. Confira se é um extrato OFX ou CSV com colunas de data, descrição e valor.",
        );
        return;
      }
      const targetAccountId =
        accountId || getDefaultTransactionAccountId(accounts, transactions);
      setFileName(file.name);
      setRawEntries(result.entries);
      setSkipped(result.skipped);
      setAccountId(targetAccountId);
      setRows(buildRows(result.entries, targetAccountId));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function handleAccountChange(next: string) {
    setAccountId(next);
    setRows(buildRows(rawEntries, next));
  }

  function updateRow(key: string, patch: Partial<ReviewRow>) {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  function applyDefaultCategory() {
    if (!defaultCategoryId) return;
    const kind = categories.find((c) => c.id === defaultCategoryId)?.kind;
    setRows((current) =>
      current.map((row) =>
        row.categoryId === "" &&
        (row.type === "income" ? "income" : "expense") === kind
          ? { ...row, categoryId: defaultCategoryId }
          : row,
      ),
    );
  }

  const included = rows.filter((row) => row.included);
  const ready = included.filter((row) => row.categoryId);
  const missingCategory = included.length - ready.length;
  const duplicateCount = rows.filter((row) => row.isDuplicate).length;

  async function handleImport() {
    if (ready.length === 0 || !accountId) return;
    setError(null);
    try {
      setImporting(true);
      const todayIso = format(new Date(), "yyyy-MM-dd");
      for (const row of ready) {
        await addTransaction({
          id: crypto.randomUUID(),
          title: row.title,
          amount: row.amount,
          date: row.date,
          accountId,
          categoryId: row.categoryId,
          type: row.type,
          isProjected: row.date > todayIso,
          notes: fileName ? `Importado de ${fileName}` : undefined,
        });
        rememberCategory(row.title, row.categoryId);
      }
      const ignored = rows.length - ready.length;
      setDoneMessage(
        `${ready.length} lançamentos importados${
          ignored > 0 ? `, ${ignored} ignorados` : ""
        }.`,
      );
      setRawEntries([]);
      setRows([]);
      setFileName(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setImporting(false);
    }
  }

  const hasReview = rows.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-6 py-5 pb-4">
          <DialogTitle>Importar extrato</DialogTitle>
          <DialogDescription>
            OFX ou CSV do seu banco — revise, categorize e confirme. Nada é
            salvo antes da confirmação.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5">
          {!hasReview ? (
            <div className="grid place-items-center border border-dashed border-border px-6 py-12 text-center">
              <Upload
                className="h-5 w-5 text-muted-foreground"
                strokeWidth={1.5}
              />
              <p className="mt-3 font-mono text-xs uppercase tracking-wider">
                {doneMessage ?? "Selecione o arquivo do extrato"}
              </p>
              <p className="mt-2 max-w-sm text-xs leading-5 text-muted-foreground">
                Duplicatas prováveis já vêm desmarcadas e categorias são
                sugeridas a partir das suas importações anteriores.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-5 gap-1.5 rounded-sm text-xs"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileUp className="h-3.5 w-3.5" strokeWidth={1.5} />
                {doneMessage ? "Importar outro arquivo" : "Escolher arquivo"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="space-y-1.5">
                  <Label className={labelClass}>Conta de destino</Label>
                  <Select value={accountId} onValueChange={handleAccountChange}>
                    <SelectTrigger className="w-56 font-mono text-xs">
                      <SelectValue placeholder="Selecionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end gap-2">
                  <div className="space-y-1.5">
                    <Label className={labelClass}>Categoria padrão</Label>
                    <Select
                      value={defaultCategoryId}
                      onValueChange={setDefaultCategoryId}
                    >
                      <SelectTrigger className="w-48 font-mono text-xs">
                        <SelectValue placeholder="Selecionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-sm text-xs"
                    onClick={applyDefaultCategory}
                    disabled={!defaultCategoryId}
                  >
                    Aplicar aos sem categoria
                  </Button>
                </div>
              </div>

              <p className="font-mono text-[11px] text-muted-foreground">
                {fileName} · {rows.length} lançamentos
                {duplicateCount > 0 && ` · ${duplicateCount} duplicatas prováveis`}
                {skipped > 0 && ` · ${skipped} linhas ignoradas na leitura`}
              </p>

              <ScrollArea className="max-h-[19rem] border border-border">
                <div>
                  {rows.map((row) => (
                    <div
                      key={row.key}
                      className={cn(
                        "grid grid-cols-[auto_88px_minmax(0,1fr)_120px_170px] items-center gap-3 border-b border-border px-3 py-2 last:border-b-0",
                        !row.included && "opacity-50",
                      )}
                    >
                      <Checkbox
                        checked={row.included}
                        onCheckedChange={(checked) =>
                          updateRow(row.key, { included: checked })
                        }
                      />
                      <span className="font-mono text-[11px] uppercase text-muted-foreground">
                        {format(parseISO(row.date), "dd MMM yy", {
                          locale: ptBR,
                        })}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm">{row.title}</span>
                        {row.isDuplicate && (
                          <span className="font-mono text-[9px] uppercase tracking-wider text-warning">
                            duplicata provável
                          </span>
                        )}
                      </span>
                      <span
                        className={cn(
                          "text-right font-mono text-xs tabular-nums",
                          row.type === "income" ? "text-success" : "text-foreground",
                        )}
                      >
                        {row.type === "income" ? "+" : "−"}
                        {formatCurrency(row.amount)}
                      </span>
                      <Select
                        value={row.categoryId}
                        onValueChange={(value) =>
                          updateRow(row.key, { categoryId: value })
                        }
                      >
                        <SelectTrigger className="h-8 font-mono text-[11px]">
                          <SelectValue placeholder="Categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          {(row.type === "income"
                            ? incomeCategories
                            : expenseCategories
                          ).map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {error && (
            <p role="alert" className="mt-3 font-mono text-[11px] text-destructive">
              {error}
            </p>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".ofx,.csv,.txt,text/csv,application/x-ofx"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void handleFileSelected(file);
          }}
        />

        <DialogFooter>
          {hasReview && (
            <p className="mr-auto font-mono text-[11px] text-muted-foreground">
              {ready.length} prontos para importar
              {missingCategory > 0 && ` · ${missingCategory} sem categoria`}
            </p>
          )}
          <Button
            variant="outline"
            size="sm"
            className="rounded-sm text-xs"
            onClick={() => handleOpenChange(false)}
            disabled={importing}
          >
            {doneMessage && !hasReview ? "Fechar" : "Cancelar"}
          </Button>
          {hasReview && (
            <Button
              size="sm"
              className="rounded-sm text-xs"
              onClick={handleImport}
              disabled={importing || ready.length === 0 || !accountId}
            >
              Importar {ready.length > 0 ? `(${ready.length})` : ""}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
