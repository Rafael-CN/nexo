import { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
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
    targetAmount: g ? String(g.targetAmount) : "",
    currentAmount: g ? String(g.currentAmount) : "0",
    deadline: g?.deadline ?? "",
    accountId: g?.accountId ?? "",
    monthlyContribution: g?.monthlyContribution ? String(g.monthlyContribution) : "",
    paused: g?.status === "paused",
  };
}

function parseAmount(s: string): number {
  return parseFloat(s.replace(",", ".")) || 0;
}

export function GoalModal({ open, onOpenChange, goal }: Props) {
  const accounts = useFinanceStore(useShallow((s) => s.accounts));
  const addGoal = useFinanceStore((s) => s.addGoal);
  const updateGoal = useFinanceStore((s) => s.updateGoal);
  const removeGoal = useFinanceStore((s) => s.removeGoal);

  const isEdit = !!goal;
  const [form, setForm] = useState<FormState>(() => buildForm(goal));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(buildForm(goal));
      setError(null);
    }
  }, [open, goal]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSave() {
    setError(null);
    if (!form.name.trim()) return setError("Informe o nome da meta.");
    const target = parseAmount(form.targetAmount);
    if (!target || target <= 0) return setError("Informe a meta em R$.");
    const current = parseAmount(form.currentAmount);

    const payload: Omit<Goal, "id"> = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      targetAmount: target,
      currentAmount: Math.max(0, current),
      deadline: form.deadline || undefined,
      accountId: form.accountId || undefined,
      monthlyContribution: parseAmount(form.monthlyContribution) || undefined,
      status: form.paused ? "paused" : "active",
    };

    if (isEdit && goal) {
      updateGoal(goal.id, payload);
    } else {
      addGoal({ id: crypto.randomUUID(), ...payload });
    }
    onOpenChange(false);
  }

  function handleDelete() {
    if (!goal) return;
    removeGoal(goal.id);
    onOpenChange(false);
  }

  const liquidAccounts = accounts.filter((a) => a.type !== "credit");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="border-b border-border">
          <DialogTitle>{isEdit ? "Editar meta" : "Nova meta"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 px-6 py-5">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="goal-name">Nome</Label>
            <Input
              id="goal-name"
              placeholder="Ex: Reserva de emergência, Viagem…"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="goal-desc">Descrição (opcional)</Label>
            <Input
              id="goal-desc"
              placeholder="Ex: 6 meses de despesas fixas"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>

          {/* Target + Current */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="goal-target">Meta (R$)</Label>
              <Input
                id="goal-target"
                type="number"
                min="1"
                step="100"
                placeholder="0,00"
                className="font-mono tabular-nums"
                value={form.targetAmount}
                onChange={(e) => set("targetAmount", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="goal-current">Acumulado (R$)</Label>
              <Input
                id="goal-current"
                type="number"
                min="0"
                step="100"
                placeholder="0,00"
                className="font-mono tabular-nums"
                value={form.currentAmount}
                onChange={(e) => set("currentAmount", e.target.value)}
              />
            </div>
          </div>

          {/* Deadline + Account */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="goal-deadline">Prazo (opcional)</Label>
              <Input
                id="goal-deadline"
                type="date"
                className="font-mono"
                value={form.deadline}
                onChange={(e) => set("deadline", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Conta vinculada</Label>
              <Select
                value={form.accountId}
                onValueChange={(v) => set("accountId", v === "_none" ? "" : v)}
              >
                <SelectTrigger>
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
          </div>

          {/* Monthly contribution */}
          <div className="space-y-1.5">
            <Label htmlFor="goal-contrib">Contribuição mensal (R$)</Label>
            <Input
              id="goal-contrib"
              type="number"
              min="0"
              step="50"
              placeholder="0,00 — usado para projetar prazo"
              className="font-mono tabular-nums"
              value={form.monthlyContribution}
              onChange={(e) => set("monthlyContribution", e.target.value)}
            />
          </div>

          {/* Paused toggle */}
          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 accent-foreground"
              checked={form.paused}
              onChange={(e) => set("paused", e.target.checked)}
            />
            <span className="font-mono text-[11px] text-muted-foreground">
              Meta pausada (excluída dos totais)
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
              className={cn(
                "mr-auto gap-1.5 rounded-sm text-xs",
                "text-destructive hover:bg-destructive/10 hover:text-destructive",
              )}
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
