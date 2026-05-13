import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { NumberInput } from "@/components/ui/number-input";
import { DatePicker } from "@/components/shared/DatePicker";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  parseCurrencyInputValue,
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

const labelClass =
  "text-[10px] uppercase tracking-[0.12em] text-muted-foreground";

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
  const amountRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const accountTriggerRef = useRef<HTMLButtonElement>(null);
  const categoryInputRef = useRef<HTMLInputElement>(null);
  const recurrenceTriggerRef = useRef<HTMLButtonElement>(null);
  const intervalRef = useRef<HTMLInputElement>(null);
  const shouldOpenAccountOnFocusRef = useRef(false);
  const [accountSelectOpen, setAccountSelectOpen] = useState(false);
  const shouldOpenRecurrenceOnFocusRef = useRef(false);
  const [recurrenceSelectOpen, setRecurrenceSelectOpen] = useState(false);

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

    const frame = window.requestAnimationFrame(() => {
      amountRef.current?.focus();
      amountRef.current?.select();
    });

    return () => window.cancelAnimationFrame(frame);
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

    const amount = parseCurrencyInputValue(form.amount);
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

  function handleModalKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Tab") {
      event.preventDefault();
      handleTypeChange(form.type === "expense" ? "income" : "expense");
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      if (!saving) {
        void saveTransaction(false);
      }
      return;
    }

    if (
      event.key === "Tab" &&
      !event.shiftKey &&
      accountSelectOpen
    ) {
      event.preventDefault();
      setAccountSelectOpen(false);
      window.requestAnimationFrame(() => {
        categoryInputRef.current?.focus();
        categoryInputRef.current?.select();
      });
      return;
    }

    if (
      event.key === "Tab" &&
      event.shiftKey &&
      accountSelectOpen
    ) {
      event.preventDefault();
      setAccountSelectOpen(false);
      window.requestAnimationFrame(() => {
        dateInputRef.current?.focus();
        dateInputRef.current?.select();
      });
      return;
    }

    if (
      event.key === "Tab" &&
      !event.shiftKey &&
      recurrenceSelectOpen
    ) {
      event.preventDefault();
      setRecurrenceSelectOpen(false);
      window.requestAnimationFrame(() => {
        intervalRef.current?.focus();
        intervalRef.current?.select();
      });
      return;
    }

    if (
      event.key === "Tab" &&
      event.shiftKey &&
      recurrenceSelectOpen
    ) {
      event.preventDefault();
      setRecurrenceSelectOpen(false);
      window.requestAnimationFrame(() => {
        categoryInputRef.current?.focus();
        categoryInputRef.current?.select();
      });
      return;
    }

    if (
      event.key === "Tab" &&
      !event.shiftKey &&
      event.target instanceof HTMLElement &&
      event.target.id === "txn-date"
    ) {
      event.preventDefault();
      shouldOpenAccountOnFocusRef.current = true;
      window.requestAnimationFrame(() => {
        accountTriggerRef.current?.focus();
      });
      return;
    }

    if (
      event.key === "Tab" &&
      event.shiftKey &&
      event.target instanceof HTMLElement &&
      event.target.id === "txn-title"
    ) {
      event.preventDefault();
      amountRef.current?.focus();
      amountRef.current?.select();
      return;
    }

    if (
      event.key === "Tab" &&
      event.shiftKey &&
      event.target instanceof HTMLElement &&
      event.target.id === "txn-date"
    ) {
      event.preventDefault();
      document.getElementById("txn-title")?.focus();
      return;
    }
  }

  function moveFromAccountToCategory(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== "Tab") return;

    event.preventDefault();
    setAccountSelectOpen(false);
    if (event.shiftKey) {
      window.requestAnimationFrame(() => {
        dateInputRef.current?.focus();
        dateInputRef.current?.select();
      });
    } else {
      window.requestAnimationFrame(() => {
        categoryInputRef.current?.focus();
        categoryInputRef.current?.select();
      });
    }
  }

  function moveFromRecurrence(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== "Tab") return;

    event.preventDefault();
    setRecurrenceSelectOpen(false);
    if (event.shiftKey) {
      window.requestAnimationFrame(() => {
        categoryInputRef.current?.focus();
        categoryInputRef.current?.select();
      });
    } else {
      window.requestAnimationFrame(() => {
        intervalRef.current?.focus();
        intervalRef.current?.select();
      });
    }
  }

  function focusAccountSelect() {
    shouldOpenAccountOnFocusRef.current = true;
    window.requestAnimationFrame(() => {
      accountTriggerRef.current?.focus();
    });
  }

  function focusRecurrenceSelect() {
    shouldOpenRecurrenceOnFocusRef.current = true;
    window.requestAnimationFrame(() => {
      recurrenceTriggerRef.current?.focus();
    });
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
      <DialogContent className="max-w-2xl overflow-hidden" onKeyDown={handleModalKeyDown}>
        <DialogHeader className="border-b border-border px-6 py-5 pb-4">
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
              <div className="flex items-center gap-2">
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
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  Ctrl Tab
                </span>
              </div>
              <div className="text-right">
                <p className={labelClass}>Conta</p>
                <p className="mt-1 truncate text-xs text-foreground">
                  {selectedAccount?.name ?? "Selecionar"}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="txn-amount" className={labelClass}>
                Valor
              </Label>
              <CurrencyInput
                ref={amountRef}
                id="txn-amount"
                placeholder="R$ 0,00"
                className={cn(
                  "h-16 border-0 bg-transparent px-0 font-mono text-4xl font-semibold tabular-nums tracking-tight shadow-none focus-visible:ring-0",
                  amountClasses,
                )}
                value={form.amount}
                onChange={(value) => updateField("amount", value)}
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[1.4fr_0.9fr]">
            <div className="space-y-1.5">
              <Label htmlFor="txn-title" className={labelClass}>
                Título
              </Label>
              <Input
                id="txn-title"
                placeholder="Ex: Aluguel, salário..."
                value={form.title}
                onChange={(event) => updateField("title", event.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="txn-date" className={labelClass}>
                Data
              </Label>
              <DatePicker
                id="txn-date"
                inputRef={dateInputRef}
                className="font-mono"
                value={form.date}
                onChange={(value) => updateField("date", value)}
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-1.5">
              <Label className={labelClass}>Conta</Label>
              <Select
                open={accountSelectOpen}
                onOpenChange={setAccountSelectOpen}
                value={form.accountId}
                onValueChange={(value) => updateField("accountId", value)}
              >
                <SelectTrigger
                  ref={accountTriggerRef}
                  className="font-mono text-xs"
                  onKeyDown={moveFromAccountToCategory}
                  onFocus={() => {
                    if (!shouldOpenAccountOnFocusRef.current) return;
                    shouldOpenAccountOnFocusRef.current = false;
                    window.requestAnimationFrame(() => {
                      setAccountSelectOpen(true);
                    });
                  }}
                >
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent onKeyDown={moveFromAccountToCategory}>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className={labelClass}>Categoria</Label>
              <CategoryPicker
                inputRef={categoryInputRef}
                categories={categories}
                type={form.type}
                value={form.categoryId}
                onChange={(value) => updateField("categoryId", value)}
                disabled={saving}
                onBackwardTab={focusAccountSelect}
                onForwardTab={focusRecurrenceSelect}
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
              <Label className={labelClass}>Recorrência</Label>
              <Select
                open={recurrenceSelectOpen}
                onOpenChange={setRecurrenceSelectOpen}
                value={form.recurrenceFrequency}
                onValueChange={(value) =>
                  updateField(
                    "recurrenceFrequency",
                    value as TransactionModalFormState["recurrenceFrequency"],
                  )
                }
              >
                <SelectTrigger
                  ref={recurrenceTriggerRef}
                  className="font-mono text-xs"
                  onKeyDown={moveFromRecurrence}
                  onFocus={() => {
                    if (!shouldOpenRecurrenceOnFocusRef.current) return;
                    shouldOpenRecurrenceOnFocusRef.current = false;
                    window.requestAnimationFrame(() => {
                      setRecurrenceSelectOpen(true);
                    });
                  }}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent onKeyDown={moveFromRecurrence}>
                  {recurrenceOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="txn-recurrence-interval" className={labelClass}>
                Intervalo
              </Label>
              <NumberInput
                ref={intervalRef}
                id="txn-recurrence-interval"
                inputMode="numeric"
                className="h-9 font-mono tabular-nums"
                value={form.recurrenceInterval}
                disabled={form.recurrenceFrequency === "none"}
                onChange={(event) => updateField("recurrenceInterval", event.target.value)}
              />
            </div>
          </div>

          {form.recurrenceFrequency !== "none" && (
            <div className="space-y-3">
              <Checkbox
                checked={form.recurrenceNoEnd}
                onCheckedChange={(checked) =>
                  setForm((current) => ({
                    ...current,
                    recurrenceNoEnd: checked,
                    recurrenceUntil: checked ? "" : current.recurrenceUntil,
                  }))
                }
              >
                Repetir sem data limite
              </Checkbox>

              {!form.recurrenceNoEnd && (
                <div className="space-y-1.5">
                  <Label htmlFor="txn-recurrence-until" className={labelClass}>
                    Repetir até
                  </Label>
                  <DatePicker
                    id="txn-recurrence-until"
                    className="font-mono"
                    value={form.recurrenceUntil}
                    onChange={(value) => updateField("recurrenceUntil", value)}
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
          <Button
            size="sm"
            className="gap-2 rounded-sm text-xs"
            onClick={() => saveTransaction(false)}
            disabled={saving}
          >
            Salvar
            <span className="font-mono text-[10px] uppercase opacity-60">
              Ctrl Enter
            </span>
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
      tabIndex={-1}
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
