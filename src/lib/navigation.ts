import {
  ArrowLeftRight,
  CalendarDays,
  ChartNoAxesCombined,
  LayoutDashboard,
  Settings,
  Target,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type AppRoute = {
  path: string;
  label: string;
  title: string;
  icon: LucideIcon;
  shortcut: string;
  keywords?: string[];
};

export const appRoutes: AppRoute[] = [
  {
    path: "/",
    label: "Visão Geral",
    title: "Visão Geral",
    icon: LayoutDashboard,
    shortcut: "1",
    keywords: ["dashboard", "home", "início"],
  },
  {
    path: "/calendario",
    label: "Calendário",
    title: "Calendário",
    icon: CalendarDays,
    shortcut: "2",
    keywords: ["agenda", "datas"],
  },
  {
    path: "/contas",
    label: "Contas",
    title: "Contas",
    icon: Wallet,
    shortcut: "3",
    keywords: ["carteiras", "bancos"],
  },
  {
    path: "/transacoes",
    label: "Transações",
    title: "Transações",
    icon: ArrowLeftRight,
    shortcut: "4",
    keywords: ["movimentações", "lançamentos"],
  },
  {
    path: "/relatorios",
    label: "Relatórios",
    title: "Relatórios",
    icon: ChartNoAxesCombined,
    shortcut: "5",
    keywords: ["analytics", "insights"],
  },
  {
    path: "/metas",
    label: "Metas",
    title: "Metas",
    icon: Target,
    shortcut: "6",
    keywords: ["objetivos", "planejamento"],
  },
  {
    path: "/configuracoes",
    label: "Configurações",
    title: "Configurações",
    icon: Settings,
    shortcut: "7",
    keywords: ["preferências", "ajustes"],
  },
];

export function getRouteTitle(pathname: string) {
  return appRoutes.find((route) => route.path === pathname)?.title ?? "Visão Geral";
}
