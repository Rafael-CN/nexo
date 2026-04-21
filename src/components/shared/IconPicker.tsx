import {
  Banknote,
  BookOpen,
  BriefcaseBusiness,
  Car,
  CreditCard,
  Film,
  Fuel,
  Gamepad2,
  HeartPulse,
  Home,
  Landmark,
  PiggyBank,
  Plane,
  Receipt,
  Repeat,
  RefreshCw,
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
  { value: "piggy-bank", label: "Poupança", icon: PiggyBank },
  { value: "credit-card", label: "Cartão", icon: CreditCard },
  { value: "banknote", label: "Dinheiro", icon: Banknote },
  { value: "trending-up", label: "Investimento", icon: TrendingUp },
  { value: "briefcase", label: "Trabalho", icon: BriefcaseBusiness },
  { value: "sparkles", label: "Extra", icon: Sparkles },
  { value: "home", label: "Moradia", icon: Home },
  { value: "utensils", label: "Alimentação", icon: Utensils },
  { value: "car", label: "Transporte", icon: Car },
  { value: "fuel", label: "Combustível", icon: Fuel },
  { value: "film", label: "Lazer", icon: Film },
  { value: "gamepad-2", label: "Lazer", icon: Gamepad2 },
  { value: "heart-pulse", label: "Saúde", icon: HeartPulse },
  { value: "book-open", label: "Educação", icon: BookOpen },
  { value: "repeat", label: "Recorrente", icon: Repeat },
  { value: "refresh-cw", label: "Reembolso", icon: RefreshCw },
  { value: "shopping-cart", label: "Compras", icon: ShoppingCart },
  { value: "receipt", label: "Impostos", icon: Receipt },
  { value: "target", label: "Meta", icon: Target },
  { value: "plane", label: "Viagem", icon: Plane },
  { value: "tag", label: "Categoria", icon: Tag },
];

const iconMap = new Map(
  financeIconOptions.map((option) => [option.value, option]),
);

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
    <div className="grid grid-cols-6 gap-px overflow-hidden border border-border bg-transparent">
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
                  active &&
                    "bg-foreground text-background hover:bg-foreground hover:text-background",
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
