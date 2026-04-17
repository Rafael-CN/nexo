import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: string;
  delta?: { value: string; positive?: boolean };
  icon: LucideIcon;
  accent?: "primary" | "success" | "warning" | "destructive" | "neutral";
}

const accentMap: Record<NonNullable<StatCardProps["accent"]>, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  destructive: "bg-destructive/10 text-destructive",
  neutral: "bg-muted text-muted-foreground",
};

export function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  accent = "primary",
}: StatCardProps) {
  return (
    <Card className="group relative overflow-hidden p-5 transition-shadow hover:shadow-float">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 truncate text-2xl font-semibold tabular-nums tracking-tight">
            {value}
          </p>
          {delta && (
            <p
              className={cn(
                "mt-1 text-xs font-medium tabular-nums",
                delta.positive
                  ? "text-success"
                  : "text-destructive",
              )}
            >
              {delta.value}
            </p>
          )}
        </div>
        <div
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-lg transition-transform group-hover:scale-105",
            accentMap[accent],
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}
