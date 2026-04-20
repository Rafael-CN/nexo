import {
  Banknote,
  BriefcaseBusiness,
  Car,
  CreditCard,
  Film,
  HeartPulse,
  Home,
  Landmark,
  PiggyBank,
  Plane,
  Repeat,
  ShoppingCart,
  Sparkles,
  Tag,
  Target,
  TrendingUp,
  Utensils,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface IconOption {
  value: string;
  label: string;
  icon: LucideIcon;
}

export const financeIconOptions: IconOption[] = [
  { value: "wallet", label: "Carteira", icon: Wallet },
  { value: "landmark", label: "Banco", icon: Landmark },
  { value: "piggy-bank", label: "Poupanca", icon: PiggyBank },
  { value: "credit-card", label: "Cartao", icon: CreditCard },
  { value: "banknote", label: "Dinheiro", icon: Banknote },
  { value: "trending-up", label: "Investimento", icon: TrendingUp },
  { value: "briefcase", label: "Trabalho", icon: BriefcaseBusiness },
  { value: "sparkles", label: "Extra", icon: Sparkles },
  { value: "home", label: "Moradia", icon: Home },
  { value: "utensils", label: "Alimentacao", icon: Utensils },
  { value: "car", label: "Transporte", icon: Car },
  { value: "film", label: "Lazer", icon: Film },
  { value: "heart-pulse", label: "Saude", icon: HeartPulse },
  { value: "repeat", label: "Recorrente", icon: Repeat },
  { value: "shopping-cart", label: "Compras", icon: ShoppingCart },
  { value: "target", label: "Meta", icon: Target },
  { value: "plane", label: "Viagem", icon: Plane },
  { value: "tag", label: "Categoria", icon: Tag },
];

const iconMap = new Map(financeIconOptions.map((option) => [option.value, option]));

export function getFinanceIconOption(value?: string | null) {
  return iconMap.get(value ?? "") ?? iconMap.get("tag")!;
}

export function FinanceIcon({
  name,
  className,
  strokeWidth = 1.5,
}: {
  name?: string | null;
  className?: string;
  strokeWidth?: number;
}) {
  const Icon = getFinanceIconOption(name).icon;
  return <Icon className={className} strokeWidth={strokeWidth} />;
}

export function IconPicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-6 border border-border bg-border gap-px overflow-hidden">
      {financeIconOptions.map((option) => {
        const Icon = option.icon;
        const active = value === option.value;

        return (
          <Tooltip key={option.value}>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={option.label}
                aria-pressed={active}
                disabled={disabled}
                onClick={() => onChange(option.value)}
                className={cn(
                  "grid h-10 place-items-center bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-50",
                  active && "bg-foreground text-background hover:bg-foreground hover:text-background",
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <span className="font-mono text-[11px]">{option.label}</span>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
