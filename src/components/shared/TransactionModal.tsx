import { useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { format, isValid, parseISO } from "date-fns";
import { Copy, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/shared/DatePicker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFinanceStore } from "@/store/useFinanceStore";
import { cn } from "@/lib/utils";
import type {
  RecurrenceRule,
  Transaction,
  TransactionType,
} from "@/types";
import {
  buildTransactionForm,
  getDefaultTransactionAccountId,
  type TransactionModalFormState,
} from "@/components/shared/transactionModalUtils";
import { CategoryPicker } from "@/components/shared/CategoryPicker";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: Transaction | null;
  initialDate?: string;
}

const recurrenceOptions: {
  value: TransactionModalFormState["recurrenceFrequency"];
  label: string;
}[] = [
  { value: "none", label: "Sem repetição" },
  { value: "daily", label: "Diária" },
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensal" },
  { value: "yearly", label: "Anual" },
];

export function TransactionModal({
  open,
  onOpenChange,
  transaction,
  initialDate,
}: Props) {
  const accounts = useFinanceStore(useShallow((s) => s.accounts));
  const categories = useFinanceStore(useShallow((s) => s.categories));
  const transactions = useFinanceStore(useShallow((s) => s.transactions));
  const recurrenceRules = useFinanceStore(useShallow((s) => s.recurrenceRules));
  const addTransaction = useFinanceStore((s) => s.addTransaction);
  const updateTransaction = useFinanceStore((s) => s.updateTransaction);
  const removeTransaction = useFinanceStore((s) => s.removeTransaction);
  const addRecurrenceRule = useFinanceStore((s) => s.addRecurrenceRule);
  const updateRecurrenceRule = useFinanceStore((s) => s.updateRecurrenceRule);
  const removeRecurrenceRule = useFinanceStore((s) => s.removeRecurrenceRule);

  const isEdit = !!transaction;
  const currentRule = useMemo(
    () =>
      transaction?.recurrenceId
        ? recurrenceRules.find((rule) => rule.id === transaction.recurrenceId)
        : null,
    [recurrenceRules, transaction?.recurrenceId],
  );
  const defaultAccountId = useMemo(
    () => getDefaultTransactionAccountId(accounts, transactions),
    [accounts, transactions],
  );
  const [form, setForm] = useState<TransactionModalFormState>(() =>
    buildTransactionForm(
      transaction,
      currentRule,
      initialDate,
      defaultAccountId,
    ),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    setForm(
      buildTransactionForm(
        transaction,
        currentRule,
        initialDate,
        defaultAccountId,
      ),
    );
    setError(null);
    setSaving(false);
  }, [open, transaction, currentRule, initialDate, defaultAccountId]);

  function updateField<K extends keyof TransactionModalFormState>(
    key: K,
    value: TransactionModalFormState[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForNewEntry() {
    setForm(
      buildTransactionForm(null, null, form.date, form.accountId, form.type),
    );
    setError(null);
  }

  const accentClasses =
    form.type === "income"
      ? "border-success/20 bg-success/5 ring-success/10"
      : "border-destructive/20 bg-destructive/5 ring-destructive/10";

  const amountClasses =
    form.type === "income" ? "text-success" : "text-destructive";

  async function saveTransaction(keepOpenForNew = false) {
    setError(null);
    const amount = validateBaseForm();
    if (amount === null) return;

    const recurrenceInterval = Number.parseInt(form.recurrenceInterval, 10);
    if (
      form.recurrenceFrequency !== "none" &&
      (!Number.isFinite(recurrenceInterval) || recurrenceInterval < 1)
    ) {
      return setError("Intervalo de recorrência inválido.");
    }

    if (
      form.recurrenceFrequency !== "none" &&
      !form.recurrenceNoEnd &&
      !form.recurrenceUntil
    ) {
      return setError("Informe a data final ou marque recorrência sem fim.");
    }

    if (
      form.recurrenceFrequency !== "none" &&
      !form.recurrenceNoEnd &&
      form.recurrenceUntil < form.date
    ) {
      return setError(
        "A data final da recorrência deve ser igual ou posterior à data da transação.",
      );
    }

    const todayIso = format(new Date(), "yyyy-MM-dd");
    const payload: Omit<Transaction, "id"> = {
      type: form.type,
      title: form.title.trim(),
      amount,
      date: form.date,
      accountId: form.accountId,
      categoryId: form.categoryId,
      isProjected: form.date > todayIso,
      recurrenceId: undefined,
    };

    let createdRecurrenceId: string | undefined;

    try {
      setSaving(true);

      let recurrenceToRemove: string | undefined;
      let shouldRemoveUnusedRule = false;

      if (form.recurrenceFrequency === "none") {
        recurrenceToRemove = transaction?.recurrenceId;
        shouldRemoveUnusedRule = recurrenceToRemove
          ? countOtherTransactionsUsingRule(recurrenceToRemove) === 0
          : false;
      } else {
        const recurrenceId = transaction?.recurrenceId ?? crypto.randomUUID();
        const rule: RecurrenceRule = {
          id: recurrenceId,
          frequency: form.recurrenceFrequency,
          interval: recurrenceInterval,
          until: form.recurrenceNoEnd ? undefined : form.recurrenceUntil,
        };

        if (currentRule) {
          await updateRecurrenceRule(currentRule.id, rule);
        } else {
          await addRecurrenceRule(rule);
          createdRecurrenceId = recurrenceId;
        }

        payload.recurrenceId = recurrenceId;
      }

      if (isEdit && transaction) {
        await updateTransaction(transaction.id, payload);
      } else {
        await addTransaction({ id: crypto.randomUUID(), ...payload });
      }

      if (recurrenceToRemove && shouldRemoveUnusedRule) {
        await removeRecurrenceRule(recurrenceToRemove);
      }

      if (keepOpenForNew && !isEdit) {
        resetForNewEntry();
        return;
      }

      onOpenChange(false);
    } catch (err) {
      if (createdRecurrenceId) {
        await removeRecurrenceRule(createdRecurrenceId).catch(() => undefined);
      }
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDuplicate() {
    setError(null);
    const amount = validateBaseForm();
    if (amount === null) return;

    const todayIso = format(new Date(), "yyyy-MM-dd");
    try {
      setSaving(true);
      await addTransaction({
        id: crypto.randomUUID(),
        type: form.type,
        title: form.title.trim(),
        amount,
        date: form.date,
        accountId: form.accountId,
        categoryId: form.categoryId,
        isProjected: form.date > todayIso,
        recurrenceId: undefined,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!transaction) return;
    try {
      setSaving(true);
      const recurrenceId = transaction.recurrenceId;
      const shouldRemoveUnusedRule = recurrenceId
        ? countOtherTransactionsUsingRule(recurrenceId) === 0
        : false;
      await removeTransaction(transaction.id);
      if (recurrenceId && shouldRemoveUnusedRule) {
        await removeRecurrenceRule(recurrenceId);
      }
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  function validateBaseForm() {
    if (!form.title.trim()) {
      setError("Informe o título.");
      return null;
    }

    const amount = parseFloat(form.amount.replace(",", "."));
    if (!amount || amount <= 0) {
      setError("Valor inválido.");
      return null;
    }

    if (!form.accountId) {
      setError("Selecione uma conta.");
      return null;
    }

    if (!form.categoryId) {
      setError("Selecione uma categoria.");
      return null;
    }

    if (!form.date || !isValid(parseISO(form.date))) {
      setError("Informe uma data válida.");
      return null;
    }

    return amount;
  }

  function countOtherTransactionsUsingRule(recurrenceId: string) {
    return transactions.filter(
      (txn) => txn.recurrenceId === recurrenceId && txn.id !== transaction?.id,
    ).length;
  }

  const selectedAccount = accounts.find((account) => account.id === form.accountId);
  const selectedCategory = categories.find((category) => category.id === form.categoryId);

  function handleTypeChange(type: TransactionType) {
    const categoryStillValid = categories.some(
      (category) =>
        category.id === form.categoryId &&
        category.kind === (type === "income" ? "income" : "expense"),
    );

    setForm((current) => ({
      ...current,
      type,
      categoryId: categoryStillValid ? current.categoryId : "",
    }));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="border-b border-border">
          <DialogTitle className="text-sm font-medium tracking-tight">
            {isEdit ? "Editar transação" : "Nova transação"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Ajuste valor, conta, categoria e recorrência."
              : "Registro rápido com foco no valor e nos atalhos de entrada."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-6 py-5">
          <div className={cn("space-y-4 border p-4", accentClasses)}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex border border-border bg-background">
                <TypeButton
                  label="Despesa"
                  active={form.type === "expense"}
                  onClick={() => handleTypeChange("expense")}
                  className="border-r border-border"
                />
                <TypeButton
                  label="Receita"
                  active={form.type === "income"}
                  onClick={() => handleTypeChange("income")}
                />
              </div>
              <div className="text-right">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Conta
                </p>
                <p className="mt-1 truncate text-xs text-foreground">
                  {selectedAccount?.name ?? "Selecionar"}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="txn-amount" className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                Valor
              </Label>
              <Input
                id="txn-amount"
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                placeholder="0,00"
                className={cn(
                  "h-16 border-0 bg-transparent px-0 font-mono text-4xl font-semibold tabular-nums tracking-tight shadow-none focus-visible:ring-0",
                  amountClasses,
                )}
                value={form.amount}
                onChange={(event) =>
                  updateField("amount", event.target.value)
                }
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[1.4fr_0.9fr]">
            <div className="space-y-1.5">
              <Label
                htmlFor="txn-title"
                className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground"
              >
                Título
              </Label>
              <Input
                id="txn-title"
                placeholder="Ex: Aluguel, salário..."
                value={form.title}
                onChange={(event) =>
                  updateField("title", event.target.value)
                }
                className="text-sm"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="txn-date"
                className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground"
              >
                Data
              </Label>
              <DatePicker
                id="txn-date"
                className="font-mono"
                value={form.date}
                onChange={(value) =>
                  updateField("date", value)
                }
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                Conta
              </Label>
              <Select
                value={form.accountId}
                onValueChange={(value) =>
                  updateField("accountId", value)
                }
              >
                <SelectTrigger>
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

            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                Categoria
              </Label>
              <CategoryPicker
                categories={categories}
                type={form.type}
                value={form.categoryId}
                onChange={(value) =>
                  updateField("categoryId", value)
                }
                disabled={saving}
              />
              {selectedCategory && (
                <p className="font-mono text-[10px] text-muted-foreground">
                  {selectedCategory.name}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-[1fr_96px] gap-3">
            <div className="space-y-1.5">
              <Label
                className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground"
              >
                Recorrência
              </Label>
              <Select
                value={form.recurrenceFrequency}
                onValueChange={(value) =>
                  updateField(
                    "recurrenceFrequency",
                    value as TransactionModalFormState["recurrenceFrequency"],
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {recurrenceOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="txn-recurrence-interval"
                className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground"
              >
                Intervalo
              </Label>
              <Input
                id="txn-recurrence-interval"
                type="number"
                min="1"
                step="1"
                className="font-mono tabular-nums"
                value={form.recurrenceInterval}
                disabled={form.recurrenceFrequency === "none"}
                onChange={(event) =>
                  updateField("recurrenceInterval", event.target.value)
                }
              />
            </div>
          </div>

          {form.recurrenceFrequency !== "none" && (
            <div className="space-y-3">
              <label className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 accent-foreground"
                  checked={form.recurrenceNoEnd}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      recurrenceNoEnd: event.target.checked,
                      recurrenceUntil: event.target.checked
                        ? ""
                        : current.recurrenceUntil,
                    }))
                  }
                />
                <span className="font-mono text-[11px] text-muted-foreground">
                  Repetir sem data limite
                </span>
              </label>

              {!form.recurrenceNoEnd && (
                <div className="space-y-1.5">
                  <Label
                    htmlFor="txn-recurrence-until"
                    className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground"
                  >
                    Repetir até
                  </Label>
                  <DatePicker
                    id="txn-recurrence-until"
                    className="font-mono"
                    value={form.recurrenceUntil}
                    onChange={(value) =>
                      updateField("recurrenceUntil", value)
                    }
                  />
                </div>
              )}
            </div>
          )}

          {error && (
            <p role="alert" className="font-mono text-[11px] text-destructive">
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="flex-wrap">
          {isEdit && (
            <div className="mr-auto flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 rounded-sm text-xs"
                onClick={handleDuplicate}
                disabled={saving}
              >
                <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
                Duplicar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 rounded-sm text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={handleDelete}
                disabled={saving}
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                Excluir
              </Button>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            className="rounded-sm text-xs"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          {!isEdit && (
            <Button
              variant="ghost"
              size="sm"
              className="rounded-sm text-xs"
              onClick={() => saveTransaction(true)}
              disabled={saving}
            >
              Salvar e novo
            </Button>
          )}
          <Button
            size="sm"
            className="rounded-sm text-xs"
            onClick={() => saveTransaction(false)}
            disabled={saving}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TypeButton({
  label,
  active,
  onClick,
  className,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "px-3 py-2 text-[11px] uppercase tracking-[0.14em] transition-colors",
        active
          ? "bg-foreground text-background"
          : "bg-background text-muted-foreground hover:bg-accent hover:text-foreground",
        className,
      )}
    >
      {label}
    </button>
  );
}
