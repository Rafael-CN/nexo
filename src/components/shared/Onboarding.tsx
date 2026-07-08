import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Kbd } from "@/components/ui/kbd";
import { NumberInput } from "@/components/ui/number-input";
import { FinanceIcon } from "@/components/shared/IconPicker";
import { SegmentedToggle } from "@/components/shared/SegmentedToggle";
import { buildDemoDataset } from "@/lib/demoData";
import { defaultCategories } from "@/lib/defaultCategories";
import { dsError, dsHint, dsSectionLabel } from "@/lib/designSystem";
import { saveLocalProfile, type LocalProfile } from "@/lib/profile";
import { cn } from "@/lib/utils";
import { useFinanceStore } from "@/store/useFinanceStore";
import type { Account, AccountType, Category } from "@/types";

interface OnboardingProps {
  onComplete: (profile: LocalProfile) => void;
}

const accountTypes = [
  { value: "checking", label: "Corrente" },
  { value: "savings", label: "Poupança" },
  { value: "cash", label: "Dinheiro" },
  { value: "investment", label: "Invest." },
] as const satisfies readonly { value: AccountType; label: string }[];

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

const steps = [
  { id: 1, label: "Você" },
  { id: 2, label: "Conta" },
  { id: 3, label: "Categorias" },
] as const;

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

  const [step, setStep] = useState<1 | 2 | 3>(1);
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
  const firstFieldRef = useRef<HTMLInputElement>(null);

  const grouped = useMemo(
    () => ({
      income: categories.filter((category) => category.kind === "income"),
      expense: categories.filter((category) => category.kind === "expense"),
    }),
    [categories],
  );

  // No navegador o banco não semeia — garante as categorias padrão aqui.
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current || categories.length > 0) return;
    seededRef.current = true;
    void (async () => {
      for (const category of defaultCategories) {
        await addCategory(category);
      }
    })();
  }, [categories.length, addCategory]);

  useEffect(() => {
    if (initializedSelection || categories.length === 0) return;

    setSelectedCategoryIds(
      new Set(
        categories
          .filter(
            (category) =>
              defaultRelevantCategoryIds.has(category.id) ||
              category.kind === "income",
          )
          .map((category) => category.id),
      ),
    );
    setInitializedSelection(true);
  }, [categories, initializedSelection]);

  // Cada passo abre com o primeiro campo focado.
  useEffect(() => {
    setError(null);
    const frame = window.requestAnimationFrame(() => {
      firstFieldRef.current?.focus();
      firstFieldRef.current?.select();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [step]);

  function toggleCategory(id: string) {
    setSelectedCategoryIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function validateStep(target: 1 | 2): string | null {
    if (target === 1) {
      if (!name.trim()) return "Informe seu nome.";
      return null;
    }
    if (!accountName.trim()) return "Informe o nome da conta.";
    if (!institution.trim()) return "Informe a instituição.";
    const parsedBalance = Number.parseFloat(balance.replace(",", "."));
    if (!Number.isFinite(parsedBalance)) return "Saldo inválido.";
    return null;
  }

  function goNext() {
    if (step === 3) {
      void handleComplete();
      return;
    }
    const problem = validateStep(step);
    if (problem) {
      setError(problem);
      return;
    }
    setStep((current) => (current + 1) as 2 | 3);
  }

  function goBack() {
    if (step === 1) return;
    setStep((current) => (current - 1) as 1 | 2);
  }

  async function handleComplete() {
    setError(null);

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
      balance: Number.parseFloat(balance.replace(",", ".")),
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

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" && !saving && step !== 3) {
      // No passo 3 os cards respondem ao Enter — o avanço é pelo botão.
      if (
        event.target instanceof HTMLElement &&
        event.target.tagName === "BUTTON"
      ) {
        return;
      }
      event.preventDefault();
      goNext();
    }
  }

  return (
    <div
      className="min-h-full overflow-y-auto bg-background px-6 py-10"
      onKeyDown={handleKeyDown}
    >
      <div
        className={cn(
          "mx-auto flex min-h-[calc(100vh-5rem)] w-full flex-col justify-center",
          step === 3 ? "max-w-3xl" : "max-w-md",
        )}
      >
        {/* Progresso: 01 Você — 02 Conta — 03 Categorias */}
        <div className="mb-10 flex items-center gap-3">
          {steps.map((item, index) => (
            <div key={item.id} className="flex items-center gap-3">
              <span
                className={cn(
                  "flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em]",
                  item.id === step
                    ? "text-foreground"
                    : "text-muted-foreground/60",
                )}
              >
                <span
                  className={cn(
                    "grid h-5 w-5 place-items-center border text-[9px] tabular-nums",
                    item.id === step
                      ? "border-foreground bg-foreground text-background"
                      : item.id < step
                        ? "border-border text-muted-foreground"
                        : "border-border text-muted-foreground/60",
                  )}
                >
                  {item.id < step ? (
                    <Check className="h-3 w-3" strokeWidth={2} />
                  ) : (
                    `0${item.id}`
                  )}
                </span>
                {item.label}
              </span>
              {index < steps.length - 1 && (
                <span className="h-px w-8 bg-border" aria-hidden />
              )}
            </div>
          ))}
        </div>

        {step === 1 && (
          <section
            key="step-1"
            className="space-y-8 animate-in fade-in-0 slide-in-from-bottom-1 duration-150"
          >
            <div className="space-y-2">
              <p className={dsSectionLabel}>Nexo / início</p>
              <h1 className="text-3xl font-medium tracking-tight">
                Como devemos te chamar?
              </h1>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="onboarding-name">Seu nome</Label>
              <Input
                ref={firstFieldRef}
                id="onboarding-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ex: Ana"
                className="h-11 text-base"
              />
            </div>

            {error && (
              <p role="alert" className={dsError}>
                {error}
              </p>
            )}

            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={handleDemoStart}
                disabled={saving}
                className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground ui-focus-ring disabled:opacity-60"
              >
                <Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} />
                Explorar com dados de exemplo
              </button>
              <Button
                size="sm"
                className="gap-2 rounded-sm text-xs"
                onClick={goNext}
                disabled={saving}
              >
                Continuar
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
              </Button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section
            key="step-2"
            className="space-y-8 animate-in fade-in-0 slide-in-from-bottom-1 duration-150"
          >
            <div className="space-y-2">
              <p className={dsSectionLabel}>Nexo / início</p>
              <h1 className="text-3xl font-medium tracking-tight">
                Sua primeira conta
              </h1>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <SegmentedToggle
                  options={accountTypes}
                  value={accountType}
                  onChange={setAccountType}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="onboarding-account">Nome da conta</Label>
                  <Input
                    ref={firstFieldRef}
                    id="onboarding-account"
                    value={accountName}
                    onChange={(event) => setAccountName(event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="onboarding-institution">Instituição</Label>
                  <Input
                    id="onboarding-institution"
                    value={institution}
                    onChange={(event) => setInstitution(event.target.value)}
                    placeholder="Ex: Nubank"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="onboarding-balance">Saldo atual (R$)</Label>
                <NumberInput
                  id="onboarding-balance"
                  value={balance}
                  onChange={(event) => setBalance(event.target.value)}
                  className="h-11 font-mono text-base tabular-nums"
                />
              </div>
            </div>

            {error && (
              <p role="alert" className={dsError}>
                {error}
              </p>
            )}

            <StepFooter
              onBack={goBack}
              onNext={goNext}
              nextLabel="Continuar"
              saving={saving}
            />
          </section>
        )}

        {step === 3 && (
          <section
            key="step-3"
            className="space-y-8 animate-in fade-in-0 slide-in-from-bottom-1 duration-150"
          >
            <div className="space-y-2">
              <p className={dsSectionLabel}>Nexo / início</p>
              <h1 className="text-3xl font-medium tracking-tight">
                O que você acompanha?
              </h1>
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

            {error && (
              <p role="alert" className={dsError}>
                {error}
              </p>
            )}

            <StepFooter
              onBack={goBack}
              onNext={goNext}
              nextLabel="Criar meu painel"
              saving={saving}
            />
          </section>
        )}
      </div>
    </div>
  );
}

function StepFooter({
  onBack,
  onNext,
  nextLabel,
  saving,
}: {
  onBack: () => void;
  onNext: () => void;
  nextLabel: string;
  saving: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <button
        type="button"
        onClick={onBack}
        disabled={saving}
        className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground ui-focus-ring disabled:opacity-60"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
        Voltar
      </button>
      <span className="flex items-center gap-3">
        <span className={cn(dsHint, "hidden sm:flex items-center gap-1.5")}>
          <Kbd>↵</Kbd> avança
        </span>
        <Button
          size="sm"
          className="gap-2 rounded-sm text-xs"
          onClick={onNext}
          disabled={saving}
        >
          {nextLabel}
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
        </Button>
      </span>
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
              aria-pressed={selected}
              className={cn(
                "flex min-h-[64px] items-center gap-3 bg-background p-3 text-left transition-colors hover:bg-accent/40 ui-focus-ring-inset",
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
              <span className="min-w-0 flex-1 truncate text-sm">
                {category.name}
              </span>
              {selected && (
                <Check
                  className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                  strokeWidth={1.7}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
