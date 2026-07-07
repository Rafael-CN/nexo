import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useShallow } from "zustand/react/shallow";
import { format, isValid, parseISO } from "date-fns";
import { Copy } from "lucide-react";
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
import { KbdGroup } from "@/components/ui/kbd";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { NumberInput } from "@/components/ui/number-input";
import { ConfirmDeleteButton } from "@/components/shared/ConfirmDeleteButton";
import { DatePicker } from "@/components/shared/DatePicker";
import {
  cycleSegmentedValue,
  SegmentedToggle,
} from "@/components/shared/SegmentedToggle";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFinanceStore } from "@/store/useFinanceStore";
import { toast } from "@/store/useToastStore";
import { cn } from "@/lib/utils";
import type {
  RecurrenceRule,
  Transaction,
  TransactionType,
} from "@/types";
import {
  buildInstallmentTransactions,
  buildTransactionForm,
  getDefaultTransactionAccountId,
  MAX_INSTALLMENTS,
  parseCurrencyInputValue,
  parseInstallmentCount,
  type TransactionModalFormState,
} from "@/components/shared/transactionModalUtils";
import { CategoryPicker } from "@/components/shared/CategoryPicker";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: Transaction | null;
  initialDate?: string;
  initialType?: TransactionType;
  /** Pré-preenchimento de campos ao criar (ex.: pagar fatura, aporte em meta). */
  initialDraft?: Partial<TransactionModalFormState>;
}

const typeOptions = [
  { value: "expense", label: "Despesa" },
  { value: "income", label: "Receita" },
  { value: "transfer", label: "Transferência" },
] as const satisfies readonly { value: TransactionType; label: string }[];

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
  initialType,
  initialDraft,
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
  const destinationTriggerRef = useRef<HTMLButtonElement>(null);
  const shouldOpenDestinationOnFocusRef = useRef(false);
  const [destinationSelectOpen, setDestinationSelectOpen] = useState(false);

  const isTransfer = form.type === "transfer";

  useEffect(() => {
    if (!open) return;

    setForm({
      ...buildTransactionForm(
        transaction,
        currentRule,
        initialDate,
        defaultAccountId,
        initialType ?? "expense",
      ),
      ...(transaction ? {} : initialDraft),
    });
    setError(null);
    setSaving(false);

    const frame = window.requestAnimationFrame(() => {
      amountRef.current?.focus();
      amountRef.current?.select();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [
    open,
    transaction,
    currentRule,
    initialDate,
    defaultAccountId,
    initialType,
    initialDraft,
  ]);

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
      : form.type === "transfer"
        ? "border-border bg-accent/30 ring-border/40"
        : "border-destructive/20 bg-destructive/5 ring-destructive/10";

  const amountClasses =
    form.type === "income"
      ? "text-success"
      : form.type === "transfer"
        ? "text-foreground"
        : "text-destructive";

  async function saveTransaction(keepOpenForNew = false) {
    setError(null);
    const amount = validateBaseForm();
    if (amount === null) return;

    const installments =
      !isEdit && form.type === "expense"
        ? parseInstallmentCount(form.installments)
        : 1;
    if (installments > 1 && form.recurrenceFrequency !== "none") {
      return setError("Parcelamento e recorrência não podem ser combinados.");
    }

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
      categoryId: isTransfer ? "" : form.categoryId,
      transferAccountId: isTransfer ? form.transferAccountId : undefined,
      notes: form.notes.trim() || undefined,
      isProjected: form.date > todayIso,
      recurrenceId: undefined,
    };

    let createdRecurrenceId: string | undefined;

    try {
      setSaving(true);

      if (installments > 1) {
        const series = buildInstallmentTransactions(payload, installments, todayIso);
        for (const installment of series) {
          await addTransaction(installment);
        }
        if (keepOpenForNew) {
          resetForNewEntry();
          return;
        }
        onOpenChange(false);
        return;
      }

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
        categoryId: isTransfer ? "" : form.categoryId,
        transferAccountId: isTransfer ? form.transferAccountId : undefined,
        notes: form.notes.trim() || undefined,
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

  const installmentSeries = useMemo(
    () =>
      transaction?.installmentId
        ? transactions.filter(
            (txn) => txn.installmentId === transaction.installmentId,
          )
        : [],
    [transactions, transaction?.installmentId],
  );

  async function handleDeleteSeries() {
    if (installmentSeries.length === 0) return;
    const snapshot = [...installmentSeries];
    try {
      setSaving(true);
      for (const txn of snapshot) {
        await removeTransaction(txn.id);
      }
      onOpenChange(false);
      toast(`Série excluída (${snapshot.length} parcelas).`, {
        actionLabel: "Desfazer",
        onAction: async () => {
          for (const txn of snapshot) {
            await addTransaction(txn);
          }
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!transaction) return;
    const snapshot = { ...transaction };
    const rule = currentRule ? { ...currentRule } : null;
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
      toast("Transação excluída.", {
        actionLabel: "Desfazer",
        onAction: async () => {
          if (rule && shouldRemoveUnusedRule) {
            await addRecurrenceRule(rule);
          }
          await addTransaction(snapshot);
        },
      });
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

    if (isTransfer) {
      if (!form.transferAccountId) {
        setError("Selecione a conta de destino.");
        return null;
      }
      if (form.transferAccountId === form.accountId) {
        setError("A conta de destino deve ser diferente da conta de origem.");
        return null;
      }
    } else if (!form.categoryId) {
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
      handleTypeChange(
        cycleSegmentedValue(typeOptions, form.type, event.shiftKey),
      );
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
      if (isTransfer) {
        focusDestinationSelect();
      } else {
        window.requestAnimationFrame(() => {
          categoryInputRef.current?.focus();
          categoryInputRef.current?.select();
        });
      }
      return;
    }

    if (event.key === "Tab" && destinationSelectOpen) {
      event.preventDefault();
      setDestinationSelectOpen(false);
      if (event.shiftKey) {
        focusAccountSelect();
      } else {
        focusRecurrenceSelect();
      }
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
      if (isTransfer) {
        focusDestinationSelect();
      } else {
        window.requestAnimationFrame(() => {
          categoryInputRef.current?.focus();
          categoryInputRef.current?.select();
        });
      }
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
    } else if (isTransfer) {
      focusDestinationSelect();
    } else {
      window.requestAnimationFrame(() => {
        categoryInputRef.current?.focus();
        categoryInputRef.current?.select();
      });
    }
  }

  function moveFromDestination(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== "Tab") return;

    event.preventDefault();
    setDestinationSelectOpen(false);
    if (event.shiftKey) {
      focusAccountSelect();
    } else {
      focusRecurrenceSelect();
    }
  }

  function moveFromRecurrence(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== "Tab") return;

    event.preventDefault();
    setRecurrenceSelectOpen(false);
    if (event.shiftKey) {
      if (isTransfer) {
        focusDestinationSelect();
      } else {
        window.requestAnimationFrame(() => {
          categoryInputRef.current?.focus();
          categoryInputRef.current?.select();
        });
      }
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

  function focusDestinationSelect() {
    shouldOpenDestinationOnFocusRef.current = true;
    window.requestAnimationFrame(() => {
      destinationTriggerRef.current?.focus();
    });
  }

  const installmentCount =
    form.type === "expense" && !isEdit
      ? parseInstallmentCount(form.installments)
      : 1;
  const selectedAccount = accounts.find((account) => account.id === form.accountId);
  const selectedDestination = accounts.find(
    (account) => account.id === form.transferAccountId,
  );
  const selectedCategory = categories.find((category) => category.id === form.categoryId);

  function handleTypeChange(type: TransactionType) {
    if (type === "transfer") {
      setForm((current) => ({ ...current, type }));
      return;
    }

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
                <SegmentedToggle
                  options={typeOptions}
                  value={form.type}
                  onChange={handleTypeChange}
                />
                <KbdGroup keys={["Ctrl", "Tab"]} />
              </div>
              <div className="text-right">
                <p>{isTransfer ? "Rota" : "Conta"}</p>
                <p className="mt-1 truncate text-xs text-foreground">
                  {isTransfer
                    ? `${selectedAccount?.name ?? "?"} → ${
                        selectedDestination?.name ?? "?"
                      }`
                    : selectedAccount?.name ?? "Selecionar"}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="txn-amount">
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
              <Label htmlFor="txn-title">
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
              <Label htmlFor="txn-date">
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
              <Label>
                {isTransfer ? "De (origem)" : "Conta"}
              </Label>
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

            {isTransfer ? (
              <div className="space-y-1.5">
                <Label>Para (destino)</Label>
                <Select
                  open={destinationSelectOpen}
                  onOpenChange={setDestinationSelectOpen}
                  value={form.transferAccountId}
                  onValueChange={(value) =>
                    updateField("transferAccountId", value)
                  }
                >
                  <SelectTrigger
                    ref={destinationTriggerRef}
                    className="font-mono text-xs"
                    onKeyDown={moveFromDestination}
                    onFocus={() => {
                      if (!shouldOpenDestinationOnFocusRef.current) return;
                      shouldOpenDestinationOnFocusRef.current = false;
                      window.requestAnimationFrame(() => {
                        setDestinationSelectOpen(true);
                      });
                    }}
                  >
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent onKeyDown={moveFromDestination}>
                    {accounts
                      .filter((account) => account.id !== form.accountId)
                      .map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>Categoria</Label>
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
            )}
          </div>

          <div
            className={cn(
              "grid gap-3",
              form.type === "expense" && !isEdit
                ? "grid-cols-[1fr_96px_96px]"
                : "grid-cols-[1fr_96px]",
            )}
          >
            <div className="space-y-1.5">
              <Label>Recorrência</Label>
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
              <Label htmlFor="txn-recurrence-interval">
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
            {form.type === "expense" && !isEdit && (
              <div className="space-y-1.5">
                <Label htmlFor="txn-installments">
                  Parcelas
                </Label>
                <NumberInput
                  id="txn-installments"
                  inputMode="numeric"
                  min={1}
                  max={MAX_INSTALLMENTS}
                  className="h-9 font-mono tabular-nums"
                  value={form.installments}
                  disabled={form.recurrenceFrequency !== "none"}
                  onChange={(event) => updateField("installments", event.target.value)}
                />
              </div>
            )}
          </div>

          {installmentCount > 1 && (
            <p className="font-mono text-[11px] text-muted-foreground">
              {installmentCount}x de {form.amount || "R$ 0,00"} · lançadas
              mensalmente a partir de {form.date}
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="txn-notes">
              Notas — opcional
            </Label>
            <Input
              id="txn-notes"
              placeholder="Contexto, referência, lembrete..."
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              className="h-9 text-sm"
            />
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
                  <Label htmlFor="txn-recurrence-until">
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
              <ConfirmDeleteButton onConfirm={handleDelete} disabled={saving} />
              {installmentSeries.length > 1 && (
                <ConfirmDeleteButton
                  onConfirm={handleDeleteSeries}
                  disabled={saving}
                  label={`Excluir série (${installmentSeries.length})`}
                  confirmLabel="Confirmar série"
                />
              )}
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

