import type { LucideIcon } from "lucide-react";
import { ReportKpiCard, type KpiTone } from "@/components/reports/ReportKpiCard";
import { cn } from "@/lib/utils";

export interface ReportKpiItem {
  label: string;
  value: string;
  delta?: {
    value: string;
    direction?: "up" | "down" | "flat";
  };
  note?: string;
  icon?: LucideIcon;
  tone?: KpiTone;
}

export interface ReportKpiGridProps {
  items: ReportKpiItem[];
  className?: string;
}

export function ReportKpiGrid({ items, className }: ReportKpiGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-px border border-border bg-transparent sm:grid-cols-2 xl:grid-cols-4",
        className,
      )}
    >
      {items.map((item) => (
        <ReportKpiCard
          key={item.label}
          {...item}
          className="border-0"
        />
      ))}
    </div>
  );
}
