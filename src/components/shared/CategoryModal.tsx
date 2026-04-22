import { useEffect, useState } from "react";
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
import { ColorPicker } from "@/components/shared/ColorPicker";
import { IconPicker } from "@/components/shared/IconPicker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFinanceStore } from "@/store/useFinanceStore";
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
}

const labelClass =
  "text-[10px] uppercase tracking-[0.12em] text-muted-foreground";

function buildForm(category?: Category | null): FormState {
  return {
    name: category?.name ?? "",
    kind: category?.kind ?? "expense",
    color: category?.color ?? "#6366F1",
    icon: category?.icon ?? "tag",
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

  async function handleSave() {
    setError(null);
    if (!form.name.trim()) return setError("Informe o nome da categoria.");

    const payload: Category = {
      id: category?.id ?? crypto.randomUUID(),
      name: form.name.trim(),
      kind: form.kind,
      color: form.color || "#6366F1",
      icon: form.icon.trim() || "tag",
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
    try {
      setSaving(true);
      await removeCategory(category.id);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-visible">
        <DialogHeader className="border-b border-border px-6 py-5 pb-4">
          <DialogTitle>
            {isEdit ? "Editar categoria" : "Nova categoria"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 px-6 py-5">
          <div className="space-y-1.5">
            <Label htmlFor="category-name" className={labelClass}>
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
              <Label className={labelClass}>Tipo</Label>
              <Select
                value={form.kind}
                onValueChange={(value) => set("kind", value as CategoryKind)}
              >
                <SelectTrigger className="h-9 font-mono text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Despesa</SelectItem>
                  <SelectItem value="income">Receita</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="category-color" className={labelClass}>
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
          </div>

          <div className="space-y-1.5">
            <Label className={labelClass}>Ícone</Label>
            <IconPicker
              value={form.icon}
              onChange={(value) => set("icon", value)}
              disabled={saving}
            />
          </div>

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
          <Button size="sm" className="rounded-sm text-xs" onClick={handleSave} disabled={saving}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
