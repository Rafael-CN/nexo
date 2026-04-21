import { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  RecurrenceFrequency,
  RecurrenceRule,
  Transaction,
  TransactionType,
} from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: Transaction | null;
}

interface FormState {
  type: TransactionType;
  title: string;
  amount: string;
  date: string;
  accountId: string;
  categoryId: string;
  recurrenceFrequency: RecurrenceFrequency | "none";
  recurrenceInterval: string;
  recurrenceUntil: string;
}

const recurrenceOptions: {
  value: FormState["recurrenceFrequency"];
  label: string;
}[] = [
  { value: "none", label: "Sem repeticao" },
  { value: "daily", label: "Diaria" },
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensal" },
  { value: "yearly", label: "Anual" },
];

function buildForm(
  transaction?: Transaction | null,
  rule?: RecurrenceRule | null,
): FormState {
  return {
    type: transaction?.type === "income" ? "income" : "expense",
    title: transaction?.title ?? "",
    amount: transaction ? String(transaction.amount) : "",
    date: transaction?.date ?? format(new Date(), "yyyy-MM-dd"),
    accountId: transaction?.accountId ?? "",
    categoryId: transaction?.categoryId ?? "",
    recurrenceFrequency: rule?.frequency ?? "none",
    recurrenceInterval: rule ? String(rule.interval) : "1",
    recurrenceUntil: rule?.until ?? "",
  };
}

export function TransactionModal({ open, onOpenChange, transaction }: Props) {
  const accounts = useFinanceStore(useShallow((s) => s.accounts));
  const categories = useFinanceStore(useShallow((s) => s.categories));
  const recurrenceRules = useFinanceStore(useShallow((s) => s.recurrenceRules));
  const addTransaction = useFinanceStore((s) => s.addTransaction);
  const updateTransaction = useFinanceStore((s) => s.updateTransaction);
  const removeTransaction = useFinanceStore((s) => s.removeTransaction);
  const addRecurrenceRule = useFinanceStore((s) => s.addRecurrenceRule);
  const updateRecurrenceRule = useFinanceStore((s) => s.updateRecurrenceRule);
  const removeRecurrenceRule = useFinanceStore((s) => s.removeRecurrenceRule);

  const isEdit = !!transaction;
  const currentRule =
    transaction?.recurrenceId
      ? recurrenceRules.find((rule) => rule.id === transaction.recurrenceId)
      : null;
  const [form, setForm] = useState<FormState>(() =>
    buildForm(transaction, currentRule),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      const rule =
        transaction?.recurrenceId
          ? recurrenceRules.find((r) => r.id === transaction.recurrenceId)
          : null;
      setForm(buildForm(transaction, rule));
      setError(null);
      setSaving(false);
    }
  }, [open, transaction, recurrenceRules]);

  const filteredCategories = categories.filter((category) =>
    form.type === "income"
      ? category.kind === "income"
      : category.kind === "expense",
  );

  function handleTypeChange(type: TransactionType) {
    const catValid = categories.find(
      (category) =>
        category.id === form.categoryId &&
        category.kind === (type === "income" ? "income" : "expense"),
    );
    setForm((current) => ({
      ...current,
      type,
      categoryId: catValid ? current.categoryId : "",
    }));
  }

  async function handleSave() {
    setError(null);
    if (!form.title.trim()) return setError("Informe o titulo.");
    const amount = parseFloat(form.amount.replace(",", "."));
    if (!amount || amount <= 0) return setError("Valor invalido.");
    if (!form.accountId) return setError("Selecione uma conta.");
    if (!form.categoryId) return setError("Selecione uma categoria.");
    if (!form.date) return setError("Informe a data.");

    const recurrenceInterval = Number.parseInt(form.recurrenceInterval, 10);
    if (
      form.recurrenceFrequency !== "none" &&
      (!Number.isFinite(recurrenceInterval) || recurrenceInterval < 1)
    ) {
      return setError("Intervalo de recorrencia invalido.");
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

    try {
      setSaving(true);

      if (form.recurrenceFrequency === "none") {
        if (transaction?.recurrenceId) {
          await removeRecurrenceRule(transaction.recurrenceId);
        }
      } else {
        const recurrenceId = transaction?.recurrenceId ?? crypto.randomUUID();
        const rule: RecurrenceRule = {
          id: recurrenceId,
          frequency: form.recurrenceFrequency,
          interval: recurrenceInterval,
          until: form.recurrenceUntil || undefined,
        };

        if (currentRule) {
          await updateRecurrenceRule(currentRule.id, rule);
        } else {
          await addRecurrenceRule(rule);
        }

        payload.recurrenceId = recurrenceId;
      }

      if (isEdit && transaction) {
        await updateTransaction(transaction.id, payload);
      } else {
        await addTransaction({ id: crypto.randomUUID(), ...payload });
      }
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
      if (transaction.recurrenceId) {
        await removeRecurrenceRule(transaction.recurrenceId);
      }
      await removeTransaction(transaction.id);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="border-b border-border">
          <DialogTitle>
            {isEdit ? "Editar transacao" : "Nova transacao"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 px-6 py-5">
          <div className="grid grid-cols-2 border border-border">
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

          <div className="space-y-1.5">
            <Label htmlFor="txn-title">Titulo</Label>
            <Input
              id="txn-title"
              placeholder="Ex: Aluguel, Salario..."
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="txn-amount">Valor (R$)</Label>
              <Input
                id="txn-amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0,00"
                className="font-mono tabular-nums"
                value={form.amount}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    amount: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="txn-date">Data</Label>
              <Input
                id="txn-date"
                type="date"
                className="font-mono"
                value={form.date}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    date: event.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Conta</Label>
              <Select
                value={form.accountId}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, accountId: value }))
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
              <Label>Categoria</Label>
              <Select
                value={form.categoryId}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, categoryId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-[1fr_96px] gap-3">
            <div className="space-y-1.5">
              <Label>Recorrencia</Label>
              <Select
                value={form.recurrenceFrequency}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    recurrenceFrequency:
                      value as FormState["recurrenceFrequency"],
                  }))
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
              <Label htmlFor="txn-recurrence-interval">Intervalo</Label>
              <Input
                id="txn-recurrence-interval"
                type="number"
                min="1"
                step="1"
                className="font-mono tabular-nums"
                value={form.recurrenceInterval}
                disabled={form.recurrenceFrequency === "none"}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    recurrenceInterval: event.target.value,
                  }))
                }
              />
            </div>
          </div>

          {form.recurrenceFrequency !== "none" && (
            <div className="space-y-1.5">
              <Label htmlFor="txn-recurrence-until">Repetir ate</Label>
              <Input
                id="txn-recurrence-until"
                type="date"
                className="font-mono"
                value={form.recurrenceUntil}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    recurrenceUntil: event.target.value,
                  }))
                }
              />
            </div>
          )}

          {error && (
            <p className="font-mono text-[11px] text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          {isEdit && (
            <Button
              variant="ghost"
              size="sm"
              className="mr-auto gap-1.5 rounded-sm text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={handleDelete}
              disabled={saving}
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
              Excluir
            </Button>
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
            className="rounded-sm text-xs"
            onClick={handleSave}
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
      className={cn(
        "py-2 font-mono text-[11px] uppercase tracking-wider transition-colors",
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
