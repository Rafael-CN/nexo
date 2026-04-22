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
import type { Account, AccountType } from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: Account | null;
}

interface FormState {
  name: string;
  institution: string;
  type: AccountType;
  balance: string;
  color: string;
  icon: string;
  lastFour: string;
}

const accountTypes: { value: AccountType; label: string }[] = [
  { value: "checking", label: "Corrente" },
  { value: "savings", label: "Poupança" },
  { value: "credit", label: "Crédito" },
  { value: "cash", label: "Dinheiro" },
  { value: "investment", label: "Investimento" },
];

const labelClass =
  "text-[10px] uppercase tracking-[0.12em] text-muted-foreground";

function buildForm(account?: Account | null): FormState {
  return {
    name: account?.name ?? "",
    institution: account?.institution ?? "",
    type: account?.type ?? "checking",
    balance: account ? String(account.balance) : "0",
    color: account?.color ?? "#8B5CF6",
    icon: account?.icon ?? "wallet",
    lastFour: account?.lastFour ?? "",
  };
}

function parseAmount(value: string): number {
  const normalized = value.replace(",", ".");
  return Number.parseFloat(normalized);
}

export function AccountModal({ open, onOpenChange, account }: Props) {
  const addAccount = useFinanceStore((s) => s.addAccount);
  const updateAccount = useFinanceStore((s) => s.updateAccount);
  const removeAccount = useFinanceStore((s) => s.removeAccount);

  const isEdit = !!account;
  const [form, setForm] = useState<FormState>(() => buildForm(account));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(buildForm(account));
      setError(null);
      setSaving(false);
    }
  }, [open, account]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSave() {
    setError(null);
    if (!form.name.trim()) return setError("Informe o nome da conta.");
    if (!form.institution.trim()) return setError("Informe a instituição.");

    const balance = parseAmount(form.balance);
    if (!Number.isFinite(balance)) return setError("Saldo inválido.");

    const payload: Account = {
      id: account?.id ?? crypto.randomUUID(),
      name: form.name.trim(),
      institution: form.institution.trim(),
      type: form.type,
      balance,
      color: form.color || "#8B5CF6",
      icon: form.icon.trim() || undefined,
      lastFour: form.lastFour.trim() || undefined,
    };

    try {
      setSaving(true);
      if (isEdit && account) {
        await updateAccount(account.id, payload);
      } else {
        await addAccount(payload);
      }
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!account) return;
    try {
      setSaving(true);
      await removeAccount(account.id);
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
          <DialogTitle>{isEdit ? "Editar conta" : "Nova conta"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 px-6 py-5">
          <div className="space-y-1.5">
            <Label htmlFor="account-name" className={labelClass}>
              Nome
            </Label>
            <Input
              id="account-name"
              value={form.name}
              onChange={(event) => set("name", event.target.value)}
              placeholder="Ex: Conta Corrente"
              autoFocus
              className="h-9 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="account-institution" className={labelClass}>
                Instituição
              </Label>
              <Input
                id="account-institution"
                value={form.institution}
                onChange={(event) => set("institution", event.target.value)}
                placeholder="Ex: Nubank"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>Tipo</Label>
              <Select
                value={form.type}
                onValueChange={(value) => set("type", value as AccountType)}
              >
                <SelectTrigger className="h-9 font-mono text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accountTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-[1fr_96px] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="account-balance" className={labelClass}>
                Saldo base
              </Label>
              <Input
                id="account-balance"
                type="number"
                step="0.01"
                className="h-9 font-mono tabular-nums"
                value={form.balance}
                onChange={(event) => set("balance", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="account-last-four" className={labelClass}>
                Final
              </Label>
              <Input
                id="account-last-four"
                maxLength={4}
                className="h-9 font-mono"
                value={form.lastFour}
                onChange={(event) => set("lastFour", event.target.value)}
                placeholder="1234"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="account-color" className={labelClass}>
                Cor
              </Label>
              <ColorPicker
                id="account-color"
                value={form.color}
                onChange={(value) => set("color", value)}
                disabled={saving}
                className="w-full"
              />
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>Ícone</Label>
              <IconPicker
                value={form.icon}
                onChange={(value) => set("icon", value)}
                disabled={saving}
              />
            </div>
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
