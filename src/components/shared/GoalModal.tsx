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
import { Checkbox } from "@/components/ui/checkbox";
import { NumberInput } from "@/components/ui/number-input";
import { DatePicker } from "@/components/shared/DatePicker";
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

const labelClass =
  "text-[10px] uppercase tracking-[0.12em] text-muted-foreground";

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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(buildForm(goal));
      setError(null);
      setSaving(false);
    }
  }, [open, goal]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
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
    try {
      setSaving(true);
      await removeGoal(goal.id);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  const liquidAccounts = accounts.filter((a) => a.type !== "credit");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-hidden">
        <DialogHeader className="border-b border-border px-6 py-5 pb-4">
          <DialogTitle>{isEdit ? "Editar meta" : "Nova meta"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 px-6 py-5">
          <div className="space-y-1.5">
            <Label htmlFor="goal-name" className={labelClass}>
              Nome
            </Label>
            <Input
              id="goal-name"
              placeholder="Ex: Viagem, entrada do imóvel..."
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              autoFocus
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="goal-desc" className={labelClass}>
              Descrição (opcional)
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
              <Label htmlFor="goal-target" className={labelClass}>
                Meta (R$)
              </Label>
              <NumberInput
                id="goal-target"
                placeholder="0,00"
                className="h-9 font-mono tabular-nums"
                value={form.targetAmount}
                onChange={(e) => set("targetAmount", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="goal-current" className={labelClass}>
                Acumulado (R$)
              </Label>
              <NumberInput
                id="goal-current"
                placeholder="0,00"
                className="h-9 font-mono tabular-nums"
                value={form.currentAmount}
                onChange={(e) => set("currentAmount", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="goal-deadline" className={labelClass}>
                Prazo (opcional)
              </Label>
              <DatePicker
                id="goal-deadline"
                className="font-mono"
                value={form.deadline}
                onChange={(value) => set("deadline", value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>Conta vinculada</Label>
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
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="goal-contrib" className={labelClass}>
              Contribuição mensal (R$)
            </Label>
            <NumberInput
              id="goal-contrib"
              placeholder="0,00 — usado para projetar prazo"
              className="h-9 font-mono tabular-nums"
              value={form.monthlyContribution}
              onChange={(e) => set("monthlyContribution", e.target.value)}
            />
          </div>

          <Checkbox
            checked={form.paused}
            onCheckedChange={(checked) => set("paused", checked)}
          >
            Meta pausada (excluída dos totais)
          </Checkbox>

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
          <Button size="sm" className="rounded-sm text-xs" onClick={handleSave} disabled={saving}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
