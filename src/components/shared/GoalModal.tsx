import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useShallow } from "zustand/react/shallow";
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
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDeleteButton } from "@/components/shared/ConfirmDeleteButton";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import { DatePicker } from "@/components/shared/DatePicker";
import {
  formatTransactionAmount,
  parseCurrencyInputValue,
} from "@/components/shared/transactionModalUtils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFinanceStore } from "@/store/useFinanceStore";
import { toast } from "@/store/useToastStore";
import type { Goal } from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: Goal | null;
}

interface FormState {
  name: string;
  description: string;
  targetAmount: string;
  currentAmount: string;
  deadline: string;
  accountId: string;
  monthlyContribution: string;
  paused: boolean;
}


function buildForm(g?: Goal | null): FormState {
  return {
    name: g?.name ?? "",
    description: g?.description ?? "",
    targetAmount: g?.targetAmount ? formatTransactionAmount(g.targetAmount) : "",
    currentAmount: g?.currentAmount
      ? formatTransactionAmount(g.currentAmount)
      : "",
    deadline: g?.deadline ?? "",
    accountId: g?.accountId ?? "",
    monthlyContribution: g?.monthlyContribution
      ? formatTransactionAmount(g.monthlyContribution)
      : "",
    paused: g?.status === "paused",
  };
}

export function GoalModal({ open, onOpenChange, goal }: Props) {
  const accounts = useFinanceStore(useShallow((s) => s.accounts));
  const addGoal = useFinanceStore((s) => s.addGoal);
  const updateGoal = useFinanceStore((s) => s.updateGoal);
  const removeGoal = useFinanceStore((s) => s.removeGoal);

  const isEdit = !!goal;
  const [form, setForm] = useState<FormState>(() => buildForm(goal));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const targetRef = useRef<HTMLInputElement>(null);

  const hasLinkedAccount = form.accountId !== "";

  useEffect(() => {
    if (!open) return;

    setForm(buildForm(goal));
    setError(null);
    setSaving(false);

    const frame = window.requestAnimationFrame(() => {
      targetRef.current?.focus();
      targetRef.current?.select();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, goal]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleModalKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      if (!saving) void handleSave();
    }
  }

  async function handleSave() {
    setError(null);
    if (!form.name.trim()) return setError("Informe o nome da meta.");
    const target = parseCurrencyInputValue(form.targetAmount);
    if (!target || target <= 0) return setError("Informe a meta em R$.");
    const current = parseCurrencyInputValue(form.currentAmount) ?? 0;

    const payload: Omit<Goal, "id"> = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      targetAmount: target,
      currentAmount: Math.max(0, current),
      deadline: form.deadline || undefined,
      accountId: form.accountId || undefined,
      monthlyContribution:
        parseCurrencyInputValue(form.monthlyContribution) || undefined,
      status: form.paused ? "paused" : "active",
    };

    try {
      setSaving(true);
      if (isEdit && goal) {
        await updateGoal(goal.id, payload);
      } else {
        await addGoal({ id: crypto.randomUUID(), ...payload });
      }
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!goal) return;
    const snapshot = { ...goal };
    try {
      setSaving(true);
      await removeGoal(goal.id);
      onOpenChange(false);
      toast(`Meta "${snapshot.name}" excluída.`, {
        actionLabel: "Desfazer",
        onAction: () => addGoal(snapshot),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  const liquidAccounts = accounts.filter(
    (a) => a.type !== "credit" && !a.archived,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="max-w-md overflow-hidden"
        onKeyDown={handleModalKeyDown}
      >
        <DialogHeader className="border-b border-border px-6 py-5 pb-4">
          <DialogTitle>{isEdit ? "Editar meta" : "Nova meta"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 px-6 py-5">
          <div className="space-y-1.5 border border-success/20 bg-success/5 p-4">
            <Label htmlFor="goal-target">
              Meta
            </Label>
            <CurrencyInput
              ref={targetRef}
              id="goal-target"
              placeholder="R$ 0,00"
              className="h-14 border-0 bg-transparent px-0 font-mono text-3xl font-medium tabular-nums tracking-tight text-success shadow-none focus-visible:ring-0"
              value={form.targetAmount}
              onChange={(value) => set("targetAmount", value)}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-[1.2fr_1fr]">
            <div className="space-y-1.5">
              <Label htmlFor="goal-name">
                Nome
              </Label>
              <Input
                id="goal-name"
                placeholder="Ex: Viagem, reserva..."
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="goal-deadline">
                Prazo — opcional
              </Label>
              <DatePicker
                id="goal-deadline"
                className="font-mono"
                value={form.deadline}
                onChange={(value) => set("deadline", value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="goal-desc">
              Descrição — opcional
            </Label>
            <Input
              id="goal-desc"
              placeholder="Ex: 6 meses de despesas fixas"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className="h-9 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Conta vinculada</Label>
              <Select
                value={form.accountId}
                onValueChange={(v) => set("accountId", v === "_none" ? "" : v)}
              >
                <SelectTrigger className="h-9 font-mono text-xs">
                  <SelectValue placeholder="Nenhuma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Nenhuma</SelectItem>
                  {liquidAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="goal-contrib">
                Contribuição mensal
              </Label>
              <CurrencyInput
                id="goal-contrib"
                placeholder="R$ 0,00"
                className="h-9 font-mono text-sm tabular-nums"
                value={form.monthlyContribution}
                onChange={(value) => set("monthlyContribution", value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="goal-current">
              {hasLinkedAccount ? "Acumulado — automático" : "Acumulado"}
            </Label>
            <CurrencyInput
              id="goal-current"
              placeholder="R$ 0,00"
              className="h-9 font-mono text-sm tabular-nums"
              value={form.currentAmount}
              onChange={(value) => set("currentAmount", value)}
              disabled={hasLinkedAccount}
            />
            {hasLinkedAccount && (
              <p className="font-mono text-[10px] text-muted-foreground">
                Segue o saldo efetivo da conta vinculada.
              </p>
            )}
          </div>

          <Checkbox
            checked={form.paused}
            onCheckedChange={(checked) => set("paused", checked)}
          >
            Meta pausada (excluída dos totais)
          </Checkbox>

          {error && (
            <p role="alert" className="font-mono text-[11px] text-destructive">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          {isEdit && (
            <ConfirmDeleteButton
              className="mr-auto"
              onConfirm={handleDelete}
              disabled={saving}
            />
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
            onClick={handleSave}
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
