import {
  differenceInCalendarDays,
  endOfMonth,
  endOfQuarter,
  endOfYear,
  format,
  parseISO,
  startOfMonth,
  startOfQuarter,
  startOfYear,
  subDays,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";

export type ReportPeriodPreset =
  | "current-month"
  | "last-month"
  | "last-30-days"
  | "quarter"
  | "year";

export type ReportPeriod = {
  preset: ReportPeriodPreset | "custom";
  startIso: string;
  endIso: string;
  label: string;
};

export const reportPeriodOptions: {
  value: ReportPeriodPreset;
  label: string;
}[] = [
  { value: "current-month", label: "Mês atual" },
  { value: "last-month", label: "Mês anterior" },
  { value: "last-30-days", label: "30 dias" },
  { value: "quarter", label: "Trimestre" },
  { value: "year", label: "Ano" },
];

export function resolveReportPeriod(
  preset: ReportPeriodPreset,
  todayIso = toIsoDate(new Date()),
): ReportPeriod {
  const today = parseISO(todayIso);

  if (preset === "last-month") {
    const target = subMonths(today, 1);
    return buildPeriod(preset, startOfMonth(target), endOfMonth(target));
  }

  if (preset === "last-30-days") {
    return buildPeriod(preset, subDays(today, 29), today);
  }

  if (preset === "quarter") {
    return buildPeriod(preset, startOfQuarter(today), endOfQuarter(today));
  }

  if (preset === "year") {
    return buildPeriod(preset, startOfYear(today), endOfYear(today));
  }

  return buildPeriod(preset, startOfMonth(today), endOfMonth(today));
}

export function getPreviousPeriod(period: ReportPeriod): ReportPeriod {
  const start = parseISO(period.startIso);
  const end = parseISO(period.endIso);
  const days = differenceInCalendarDays(end, start) + 1;
  const previousEnd = subDays(start, 1);
  const previousStart = subDays(previousEnd, days - 1);

  return {
    preset: "custom",
    startIso: toIsoDate(previousStart),
    endIso: toIsoDate(previousEnd),
    label: formatPeriodLabel(previousStart, previousEnd),
  };
}

export function isWithinReportPeriod(
  dateIso: string,
  period: Pick<ReportPeriod, "startIso" | "endIso">,
) {
  return dateIso >= period.startIso && dateIso <= period.endIso;
}

function buildPeriod(
  preset: ReportPeriodPreset,
  start: Date,
  end: Date,
): ReportPeriod {
  return {
    preset,
    startIso: toIsoDate(start),
    endIso: toIsoDate(end),
    label: formatPeriodLabel(start, end),
  };
}

function formatPeriodLabel(start: Date, end: Date) {
  if (start.getFullYear() === end.getFullYear()) {
    return `${format(start, "dd MMM", { locale: ptBR })} - ${format(end, "dd MMM yyyy", { locale: ptBR })}`;
  }
  return `${format(start, "dd MMM yyyy", { locale: ptBR })} - ${format(end, "dd MMM yyyy", { locale: ptBR })}`;
}

function toIsoDate(date: Date) {
  return format(date, "yyyy-MM-dd");
}
