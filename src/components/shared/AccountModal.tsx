import { useEffect, useState, type KeyboardEvent } from "react";
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
import { NumberInput } from "@/components/ui/number-input";
import { ColorPicker } from "@/components/shared/ColorPicker";
import { ConfirmDeleteButton } from "@/components/shared/ConfirmDeleteButton";
import { IconPicker } from "@/components/shared/IconPicker";
import {
  cycleSegmentedValue,
  SegmentedToggle,
} from "@/components/shared/SegmentedToggle";
import { parseBrAmount } from "@/lib/statement";
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
  closingDay: string;
  dueDay: string;
}

const accountTypes = [
  { value: "checking", label: "Corrente" },
  { value: "savings", label: "Poupança" },
  { value: "credit", label: "Crédito" },
  { value: "cash", label: "Dinheiro" },
  { value: "investment", label: "Invest." },
] as const satisfies readonly { value: AccountType; label: string }[];

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
    closingDay: account?.closingDay ? String(account.closingDay) : "",
    dueDay: account?.dueDay ? String(account.dueDay) : "",
  };
}

function parseDayOfMonth(value: string): number | undefined {
  const day = Number.parseInt(value, 10);
  if (!Number.isFinite(day) || day < 1 || day > 31) return undefined;
  return day;
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

  function handleModalKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Tab") {
      event.preventDefault();
      set(
        "type",
        cycleSegmentedValue(accountTypes, form.type, event.shiftKey),
      );
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      if (!saving) void handleSave();
    }
  }

  async function handleSave() {
    setError(null);
    if (!form.name.trim()) return setError("Informe o nome da conta.");
    if (!form.institution.trim()) return setError("Informe a instituição.");

    const balance = form.balance.trim() === "" ? 0 : parseBrAmount(form.balance);
    if (balance === null) return setError("Saldo inválido.");

    const isCredit = form.type === "credit";
    if (isCredit && form.closingDay && !parseDayOfMonth(form.closingDay)) {
      return setError("Dia de fechamento deve estar entre 1 e 31.");
    }
    if (isCredit && form.dueDay && !parseDayOfMonth(form.dueDay)) {
      return setError("Dia de vencimento deve estar entre 1 e 31.");
    }

    const payload: Account = {
      id: account?.id ?? crypto.randomUUID(),
      name: form.name.trim(),
      institution: form.institution.trim(),
      type: form.type,
      balance,
      color: form.color || "#8B5CF6",
      icon: form.icon.trim() || undefined,
      lastFour: form.lastFour.trim() || undefined,
      closingDay: isCredit ? parseDayOfMonth(form.closingDay) : undefined,
      dueDay: isCredit ? parseDayOfMonth(form.dueDay) : undefined,
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
      <DialogContent
        className="max-w-lg overflow-visible"
        onKeyDown={handleModalKeyDown}
      >
        <DialogHeader className="border-b border-border px-6 py-5 pb-4">
          <DialogTitle>{isEdit ? "Editar conta" : "Nova conta"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Ajuste tipo, saldo base e identidade visual."
              : "Tipo, saldo inicial e identidade — tudo pelo teclado."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-6 py-5">
          <div className="space-y-4 border border-border bg-accent/30 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <SegmentedToggle
                options={accountTypes}
                value={form.type}
                onChange={(value) => set("type", value)}
              />
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                Ctrl Tab
              </span>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="account-balance" className={labelClass}>
                {form.type === "credit" ? "Saldo base (fatura em aberto usa negativo)" : "Saldo base"}
              </Label>
              <NumberInput
                id="account-balance"
                className="h-14 border-0 bg-transparent px-0 font-mono text-3xl font-medium tabular-nums tracking-tight shadow-none focus-visible:ring-0"
                value={form.balance}
                onChange={(event) => set("balance", event.target.value)}
              />
            </div>
          </div>

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

          <div className="grid grid-cols-[1fr_96px] gap-3">
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

          {form.type === "credit" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="account-closing-day" className={labelClass}>
                  Fechamento (dia)
                </Label>
                <NumberInput
                  id="account-closing-day"
                  inputMode="numeric"
                  placeholder="Ex: 10"
                  className="h-9 font-mono tabular-nums"
                  value={form.closingDay}
                  onChange={(event) => set("closingDay", event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="account-due-day" className={labelClass}>
                  Vencimento (dia)
                </Label>
                <NumberInput
                  id="account-due-day"
                  inputMode="numeric"
                  placeholder="Ex: 17"
                  className="h-9 font-mono tabular-nums"
                  value={form.dueDay}
                  onChange={(event) => set("dueDay", event.target.value)}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
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
