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
import type { Transaction, TransactionType } from "@/types";

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
  isProjected: boolean;
}

function buildForm(t?: Transaction | null): FormState {
  return {
    type: t?.type === "income" ? "income" : "expense",
    title: t?.title ?? "",
    amount: t ? String(t.amount) : "",
    date: t?.date ?? format(new Date(), "yyyy-MM-dd"),
    accountId: t?.accountId ?? "",
    categoryId: t?.categoryId ?? "",
    isProjected: t?.isProjected ?? false,
  };
}

export function TransactionModal({ open, onOpenChange, transaction }: Props) {
  const accounts = useFinanceStore(useShallow((s) => s.accounts));
  const categories = useFinanceStore(useShallow((s) => s.categories));
  const addTransaction = useFinanceStore((s) => s.addTransaction);
  const updateTransaction = useFinanceStore((s) => s.updateTransaction);
  const removeTransaction = useFinanceStore((s) => s.removeTransaction);

  const isEdit = !!transaction;
  const [form, setForm] = useState<FormState>(() => buildForm(transaction));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(buildForm(transaction));
      setError(null);
    }
  }, [open, transaction]);

  const filteredCategories = categories.filter((c) =>
    form.type === "income" ? c.kind === "income" : c.kind === "expense",
  );

  function handleTypeChange(type: TransactionType) {
    const catValid = categories.find(
      (c) =>
        c.id === form.categoryId &&
        c.kind === (type === "income" ? "income" : "expense"),
    );
    setForm((f) => ({
      ...f,
      type,
      categoryId: catValid ? f.categoryId : "",
    }));
  }

  function handleSave() {
    setError(null);
    if (!form.title.trim()) return setError("Informe o título.");
    const amount = parseFloat(form.amount.replace(",", "."));
    if (!amount || amount <= 0) return setError("Valor inválido.");
    if (!form.accountId) return setError("Selecione uma conta.");
    if (!form.categoryId) return setError("Selecione uma categoria.");
    if (!form.date) return setError("Informe a data.");

    const payload = {
      type: form.type,
      title: form.title.trim(),
      amount,
      date: form.date,
      accountId: form.accountId,
      categoryId: form.categoryId,
      isProjected: form.isProjected,
    };

    if (isEdit && transaction) {
      updateTransaction(transaction.id, payload);
    } else {
      addTransaction({ id: crypto.randomUUID(), ...payload });
    }
    onOpenChange(false);
  }

  function handleDelete() {
    if (!transaction) return;
    removeTransaction(transaction.id);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="border-b border-border">
          <DialogTitle>
            {isEdit ? "Editar transação" : "Nova transação"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 px-6 py-5">
          {/* Type toggle */}
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

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="txn-title">Título</Label>
            <Input
              id="txn-title"
              placeholder="Ex: Aluguel, Salário…"
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              autoFocus
            />
          </div>

          {/* Amount + Date */}
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
                onChange={(e) =>
                  setForm((f) => ({ ...f, amount: e.target.value }))
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
                onChange={(e) =>
                  setForm((f) => ({ ...f, date: e.target.value }))
                }
              />
            </div>
          </div>

          {/* Account + Category */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Conta</Label>
              <Select
                value={form.accountId}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, accountId: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select
                value={form.categoryId}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, categoryId: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Projected toggle */}
          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 accent-foreground"
              checked={form.isProjected}
              onChange={(e) =>
                setForm((f) => ({ ...f, isProjected: e.target.checked }))
              }
            />
            <span className="font-mono text-[11px] text-muted-foreground">
              Lançamento projetado (não realizado)
            </span>
          </label>

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
          >
            Cancelar
          </Button>
          <Button size="sm" className="rounded-sm text-xs" onClick={handleSave}>
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
