import { useEffect, useState, type KeyboardEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KbdGroup } from "@/components/ui/kbd";
import { Label } from "@/components/ui/label";
import { ColorPicker } from "@/components/shared/ColorPicker";
import { ConfirmDeleteButton } from "@/components/shared/ConfirmDeleteButton";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import { FinanceIcon, IconPicker } from "@/components/shared/IconPicker";
import {
  cycleSegmentedValue,
  SegmentedToggle,
} from "@/components/shared/SegmentedToggle";
import {
  formatTransactionAmount,
  parseCurrencyInputValue,
} from "@/components/shared/transactionModalUtils";
import { useFinanceStore } from "@/store/useFinanceStore";
import { toast } from "@/store/useToastStore";
import type { Category, CategoryKind } from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | null;
}

interface FormState {
  name: string;
  kind: CategoryKind;
  color: string;
  icon: string;
  monthlyBudget: string;
}

const kindOptions = [
  { value: "expense", label: "Despesa" },
  { value: "income", label: "Receita" },
] as const satisfies readonly { value: CategoryKind; label: string }[];


function buildForm(category?: Category | null): FormState {
  return {
    name: category?.name ?? "",
    kind: category?.kind ?? "expense",
    color: category?.color ?? "#6366F1",
    icon: category?.icon ?? "tag",
    monthlyBudget: category?.monthlyBudget
      ? formatTransactionAmount(category.monthlyBudget)
      : "",
  };
}

export function CategoryModal({ open, onOpenChange, category }: Props) {
  const addCategory = useFinanceStore((s) => s.addCategory);
  const updateCategory = useFinanceStore((s) => s.updateCategory);
  const removeCategory = useFinanceStore((s) => s.removeCategory);

  const isEdit = !!category;
  const [form, setForm] = useState<FormState>(() => buildForm(category));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(buildForm(category));
      setError(null);
      setSaving(false);
    }
  }, [open, category]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleModalKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Tab") {
      event.preventDefault();
      set("kind", cycleSegmentedValue(kindOptions, form.kind, event.shiftKey));
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      if (!saving) void handleSave();
    }
  }

  async function handleSave() {
    setError(null);
    if (!form.name.trim()) return setError("Informe o nome da categoria.");

    let monthlyBudget: number | undefined;
    if (form.kind === "expense" && form.monthlyBudget.trim()) {
      const parsed = parseCurrencyInputValue(form.monthlyBudget);
      if (!parsed || parsed <= 0) return setError("Orçamento mensal inválido.");
      monthlyBudget = parsed;
    }

    const payload: Category = {
      id: category?.id ?? crypto.randomUUID(),
      name: form.name.trim(),
      kind: form.kind,
      color: form.color || "#6366F1",
      icon: form.icon.trim() || "tag",
      monthlyBudget,
    };

    try {
      setSaving(true);
      if (isEdit && category) {
        await updateCategory(category.id, payload);
      } else {
        await addCategory(payload);
      }
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!category) return;
    const snapshot = { ...category };
    try {
      setSaving(true);
      await removeCategory(category.id);
      onOpenChange(false);
      toast(`Categoria "${snapshot.name}" excluída.`, {
        actionLabel: "Desfazer",
        onAction: () => addCategory(snapshot),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="max-w-md overflow-visible"
        onKeyDown={handleModalKeyDown}
      >
        <DialogHeader className="border-b border-border px-6 py-5 pb-4">
          <DialogTitle>
            {isEdit ? "Editar categoria" : "Nova categoria"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 px-6 py-5">
          <div className="space-y-4 border border-border bg-accent/30 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <SegmentedToggle
                  options={kindOptions}
                  value={form.kind}
                  onChange={(value) => set("kind", value)}
                />
                <KbdGroup keys={["Ctrl", "Tab"]} />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span
                className="grid h-11 w-11 shrink-0 place-items-center border border-border"
                style={{ backgroundColor: form.color }}
                aria-hidden
              >
                <FinanceIcon
                  name={form.icon}
                  className="h-5 w-5 text-background mix-blend-luminosity"
                />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {form.name.trim() || "Nova categoria"}
                </p>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  pré-visualização
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="category-name">
              Nome
            </Label>
            <Input
              id="category-name"
              value={form.name}
              onChange={(event) => set("name", event.target.value)}
              placeholder="Ex: Alimentação"
              autoFocus
              className="h-9 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="category-color">
                Cor
              </Label>
              <ColorPicker
                id="category-color"
                value={form.color}
                onChange={(value) => set("color", value)}
                disabled={saving}
                className="w-full"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Ícone</Label>
              <IconPicker
                value={form.icon}
                onChange={(value) => set("icon", value)}
                disabled={saving}
              />
            </div>
          </div>

          {form.kind === "expense" && (
            <div className="space-y-1.5">
              <Label htmlFor="category-budget">
                Orçamento mensal — opcional
              </Label>
              <CurrencyInput
                id="category-budget"
                placeholder="R$ 0,00"
                className="h-9 font-mono text-sm tabular-nums"
                value={form.monthlyBudget}
                onChange={(value) => set("monthlyBudget", value)}
              />
            </div>
          )}

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
