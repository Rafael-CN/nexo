import { useEffect, useMemo, useState } from "react";
import { Check, Landmark, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/number-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FinanceIcon } from "@/components/shared/IconPicker";
import { buildDemoDataset } from "@/lib/demoData";
import { saveLocalProfile, type LocalProfile } from "@/lib/profile";
import { cn } from "@/lib/utils";
import { useFinanceStore } from "@/store/useFinanceStore";
import type { Account, AccountType, Category } from "@/types";

interface OnboardingProps {
  onComplete: (profile: LocalProfile) => void;
}

const accountTypes: { value: AccountType; label: string }[] = [
  { value: "checking", label: "Conta corrente" },
  { value: "savings", label: "Poupança" },
  { value: "cash", label: "Dinheiro" },
  { value: "investment", label: "Investimento" },
];

const defaultRelevantCategoryIds = new Set([
  "cat-income-salary",
  "cat-income-freelance",
  "cat-expense-food",
  "cat-expense-market",
  "cat-expense-transport",
  "cat-expense-fuel",
  "cat-expense-home",
  "cat-expense-health",
  "cat-expense-leisure",
  "cat-expense-subscriptions",
]);

const labelClass =
  "text-[10px] uppercase tracking-[0.12em] text-muted-foreground";

export function Onboarding({ onComplete }: OnboardingProps) {
  const categories = useFinanceStore((s) => s.categories);
  const accounts = useFinanceStore((s) => s.accounts);
  const recurrenceRules = useFinanceStore((s) => s.recurrenceRules);
  const transactions = useFinanceStore((s) => s.transactions);
  const goals = useFinanceStore((s) => s.goals);
  const addAccount = useFinanceStore((s) => s.addAccount);
  const addCategory = useFinanceStore((s) => s.addCategory);
  const addRecurrenceRule = useFinanceStore((s) => s.addRecurrenceRule);
  const addTransaction = useFinanceStore((s) => s.addTransaction);
  const addGoal = useFinanceStore((s) => s.addGoal);
  const removeCategory = useFinanceStore((s) => s.removeCategory);

  const [name, setName] = useState("");
  const [accountName, setAccountName] = useState("Conta principal");
  const [institution, setInstitution] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("checking");
  const [balance, setBalance] = useState("0");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState(
    () => new Set<string>(),
  );
  const [initializedSelection, setInitializedSelection] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const grouped = useMemo(
    () => ({
      income: categories.filter((category) => category.kind === "income"),
      expense: categories.filter((category) => category.kind === "expense"),
    }),
    [categories],
  );

  useEffect(() => {
    if (initializedSelection || categories.length === 0) return;

    const initial = new Set(
      categories
        .filter(
          (category) =>
            defaultRelevantCategoryIds.has(category.id) ||
            category.kind === "income",
        )
        .map((category) => category.id),
    );
    setSelectedCategoryIds(initial);
    setInitializedSelection(true);
  }, [categories, initializedSelection]);

  function toggleCategory(id: string) {
    setSelectedCategoryIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleComplete() {
    setError(null);

    if (!name.trim()) return setError("Informe seu nome.");
    if (!accountName.trim()) return setError("Informe o nome da conta.");
    if (!institution.trim()) return setError("Informe a instituição.");

    const parsedBalance = Number.parseFloat(balance.replace(",", "."));
    if (!Number.isFinite(parsedBalance)) return setError("Saldo inválido.");

    const selectedCategories = categories.filter((category) =>
      selectedCategoryIds.has(category.id),
    );
    if (!selectedCategories.some((category) => category.kind === "income")) {
      return setError("Mantenha ao menos uma categoria de receita.");
    }
    if (!selectedCategories.some((category) => category.kind === "expense")) {
      return setError("Mantenha ao menos uma categoria de despesa.");
    }

    const account: Account = {
      id: crypto.randomUUID(),
      name: accountName.trim(),
      institution: institution.trim(),
      type: accountType,
      balance: parsedBalance,
      color: "#6366F1",
      icon: accountType === "cash" ? "banknote" : "wallet",
    };
    const profile: LocalProfile = {
      name: name.trim(),
      createdAt: new Date().toISOString(),
    };

    try {
      setSaving(true);
      await addAccount(account);
      await Promise.all(
        categories
          .filter((category) => !selectedCategoryIds.has(category.id))
          .map((category) => removeCategory(category.id)),
      );
      saveLocalProfile(profile);
      onComplete(profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDemoStart() {
    setError(null);

    const profile: LocalProfile = {
      name: name.trim() || "Visitante",
      createdAt: new Date().toISOString(),
    };
    const demo = buildDemoDataset();
    const existingAccounts = new Set(accounts.map((item) => item.id));
    const existingCategories = new Set(categories.map((item) => item.id));
    const existingRules = new Set(recurrenceRules.map((item) => item.id));
    const existingTransactions = new Set(transactions.map((item) => item.id));
    const existingGoals = new Set(goals.map((item) => item.id));

    try {
      setSaving(true);

      for (const category of demo.categories) {
        if (!existingCategories.has(category.id)) await addCategory(category);
      }
      for (const account of demo.accounts) {
        if (!existingAccounts.has(account.id)) await addAccount(account);
      }
      for (const rule of demo.recurrenceRules) {
        if (!existingRules.has(rule.id)) await addRecurrenceRule(rule);
      }
      for (const transaction of demo.transactions) {
        if (!existingTransactions.has(transaction.id)) {
          await addTransaction(transaction);
        }
      }
      for (const goal of demo.goals) {
        if (!existingGoals.has(goal.id)) await addGoal(goal);
      }

      saveLocalProfile(profile);
      onComplete(profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-full overflow-y-auto bg-background px-6 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl flex-col justify-center">
        <div className="mb-8 flex items-center gap-3 border-b border-border pb-5">
          <div className="grid h-10 w-10 place-items-center border border-border bg-accent/40">
            <Sparkles className="h-4 w-4 text-muted-foreground" strokeWidth={1.7} />
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Nexo / início
            </p>
            <h1 className="mt-1 text-2xl font-medium tracking-tight">
              Vamos preparar seu painel
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[360px_1fr]">
          <section className="space-y-5">
            <div className="border-t border-border pt-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Perfil
              </p>
              <div className="mt-3 space-y-1.5">
                <Label htmlFor="onboarding-name" className={labelClass}>
                  Seu nome
                </Label>
                <Input
                  id="onboarding-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Ex: Ana Souza"
                  autoFocus
                  className="h-9 text-sm"
                />
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Primeira conta
              </p>
              <div className="mt-3 space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="onboarding-account" className={labelClass}>
                    Nome da conta
                  </Label>
                  <Input
                    id="onboarding-account"
                    value={accountName}
                    onChange={(event) => setAccountName(event.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="onboarding-institution" className={labelClass}>
                      Instituição
                    </Label>
                    <Input
                      id="onboarding-institution"
                      value={institution}
                      onChange={(event) => setInstitution(event.target.value)}
                      placeholder="Ex: Nubank"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className={labelClass}>Tipo</Label>
                    <Select
                      value={accountType}
                      onValueChange={(value) =>
                        setAccountType(value as AccountType)
                      }
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
                <div className="space-y-1.5">
                  <Label htmlFor="onboarding-balance" className={labelClass}>
                    Saldo inicial (R$)
                  </Label>
                  <NumberInput
                    id="onboarding-balance"
                    value={balance}
                    onChange={(event) => setBalance(event.target.value)}
                    className="h-9 font-mono tabular-nums"
                  />
                </div>
              </div>
            </div>

            {error && (
              <p className="font-mono text-[11px] text-destructive">{error}</p>
            )}

            <Button
              className="w-full rounded-sm"
              onClick={handleComplete}
              disabled={saving}
            >
              <Landmark className="h-4 w-4" strokeWidth={1.7} />
              Criar meu painel
            </Button>

            <button
              type="button"
              onClick={handleDemoStart}
              disabled={saving}
              className="flex w-full items-start gap-3 border border-border bg-background p-4 text-left transition-colors hover:bg-accent/30 disabled:pointer-events-none disabled:opacity-60"
            >
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center border border-border bg-accent/40">
                <Sparkles className="h-4 w-4 text-muted-foreground" strokeWidth={1.7} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">
                  Explorar com dados demo
                </span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  Cria uma base realista com histórico, recorrências, metas e
                  lançamentos futuros para testar relatórios e calendário.
                </span>
              </span>
            </button>
          </section>

          <section className="space-y-5">
            <div className="border-t border-border pt-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Categorias relevantes
              </p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Escolha o que faz sentido agora. Você pode criar, editar ou
                apagar categorias depois.
              </p>
            </div>

            <CategoryPickerGroup
              title="Receitas"
              categories={grouped.income}
              selectedCategoryIds={selectedCategoryIds}
              onToggle={toggleCategory}
            />
            <CategoryPickerGroup
              title="Despesas"
              categories={grouped.expense}
              selectedCategoryIds={selectedCategoryIds}
              onToggle={toggleCategory}
            />
          </section>
        </div>
      </div>
    </div>
  );
}

function CategoryPickerGroup({
  title,
  categories,
  selectedCategoryIds,
  onToggle,
}: {
  title: string;
  categories: Category[];
  selectedCategoryIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {title}
        </p>
        <div className="h-px flex-1 bg-border" />
      </div>
      <div className="grid grid-cols-2 gap-px overflow-hidden border border-border bg-transparent md:grid-cols-3">
        {categories.map((category) => {
          const selected = selectedCategoryIds.has(category.id);
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onToggle(category.id)}
              className={cn(
                "flex min-h-[80px] items-center gap-3 bg-background p-3 text-left transition-colors hover:bg-accent/40",
                selected && "bg-muted/70 ring-1 ring-inset ring-foreground/15",
              )}
            >
              <span
                className="grid h-8 w-8 shrink-0 place-items-center border border-border"
                style={{ backgroundColor: category.color }}
              >
                <FinanceIcon
                  name={category.icon}
                  className="h-4 w-4 text-background mix-blend-luminosity"
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{category.name}</span>
                <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {selected ? "Ativa" : "Oculta"}
                </span>
              </span>
              {selected && (
                <Check className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.7} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
