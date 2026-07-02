import {
  addDays,
  addMonths,
  endOfMonth,
  format,
  startOfMonth,
  subMonths,
} from "date-fns";
import type { Account, Category, Goal, RecurrenceRule, Transaction } from "@/types";

export const DEMO_PREFIX = "demo-";

export type DemoDataset = {
  accounts: Account[];
  categories: Category[];
  recurrenceRules: RecurrenceRule[];
  transactions: Transaction[];
  goals: Goal[];
};

export function buildDemoDataset(today = new Date()): DemoDataset {
  const currentMonth = startOfMonth(today);
  const previousMonth = subMonths(currentMonth, 1);
  const twoMonthsAgo = subMonths(currentMonth, 2);
  const nextMonth = addMonths(currentMonth, 1);

  const accounts: Account[] = [
    {
      id: "demo-account-checking",
      name: "Conta corrente",
      institution: "Banco Aurora",
      type: "checking",
      balance: 2850,
      color: "#6366F1",
      icon: "landmark",
      lastFour: "4821",
    },
    {
      id: "demo-account-cash",
      name: "Carteira",
      institution: "Dinheiro",
      type: "cash",
      balance: 320,
      color: "#22C55E",
      icon: "banknote",
    },
    {
      id: "demo-account-investment",
      name: "Reserva",
      institution: "Corretora Horizonte",
      type: "investment",
      balance: 8200,
      color: "#0EA5E9",
      icon: "trending-up",
    },
  ];

  const categories: Category[] = [
    category("cat-income-salary", "Salário", "#16A34A", "briefcase", "income"),
    category("cat-income-freelance", "Freelance", "#22C55E", "wallet", "income"),
    category("cat-expense-home", "Moradia", "#8B5CF6", "home", "expense"),
    category("cat-expense-market", "Mercado", "#EAB308", "shopping-cart", "expense"),
    category("cat-expense-food", "Alimentação", "#F97316", "utensils", "expense"),
    category("cat-expense-transport", "Transporte", "#3B82F6", "car", "expense"),
    category("cat-expense-health", "Saúde", "#EF4444", "heart-pulse", "expense"),
    category("cat-expense-leisure", "Lazer", "#EC4899", "gamepad-2", "expense"),
    category("cat-expense-subscriptions", "Assinaturas", "#64748B", "repeat", "expense"),
  ];

  const recurrenceRules: RecurrenceRule[] = [
    { id: "demo-rule-salary", frequency: "monthly", interval: 1 },
    { id: "demo-rule-rent", frequency: "monthly", interval: 1 },
    { id: "demo-rule-subscriptions", frequency: "monthly", interval: 1 },
    { id: "demo-rule-gym", frequency: "monthly", interval: 1 },
  ];

  const transactions: Transaction[] = [
    ...monthTransactions("m2", twoMonthsAgo, {
      salary: 7200,
      freelance: 900,
      rent: 2100,
      market: 1180,
      food: 780,
      transport: 520,
      health: 210,
      leisure: 420,
      subscriptions: 210,
    }),
    ...monthTransactions("m1", previousMonth, {
      salary: 7200,
      freelance: 500,
      rent: 2100,
      market: 1360,
      food: 980,
      transport: 610,
      health: 140,
      leisure: 680,
      subscriptions: 235,
    }),
    ...monthTransactions("m0", currentMonth, {
      salary: 7200,
      freelance: 1250,
      rent: 2100,
      market: 920,
      food: 1320,
      transport: 460,
      health: 360,
      leisure: 540,
      subscriptions: 235,
    }),
    tx("future-rent", "Aluguel previsto", 2100, addDays(nextMonth, 4), "expense", "cat-expense-home", {
      isProjected: true,
      recurrenceId: "demo-rule-rent",
    }),
    tx(
      "future-subscriptions",
      "Assinaturas previstas",
      235,
      addDays(nextMonth, 9),
      "expense",
      "cat-expense-subscriptions",
      {
        isProjected: true,
        recurrenceId: "demo-rule-subscriptions",
      },
    ),
    tx("future-salary", "Salário previsto", 7200, addDays(nextMonth, 4), "income", "cat-income-salary", {
      isProjected: true,
      recurrenceId: "demo-rule-salary",
    }),
    tx("m0-reserve", "Aporte na reserva", 900, addDays(currentMonth, 6), "transfer", "", {
      transferAccountId: "demo-account-investment",
    }),
    tx("m1-reserve", "Aporte na reserva", 900, addDays(previousMonth, 6), "transfer", "", {
      transferAccountId: "demo-account-investment",
    }),
  ];

  const goals: Goal[] = [
    {
      id: "demo-goal-emergency",
      name: "Reserva de emergência",
      description: "Meta exemplo para validar projeções e progresso.",
      targetAmount: 18000,
      currentAmount: 8200,
      deadline: iso(endOfMonth(addMonths(currentMonth, 8))),
      accountId: "demo-account-investment",
      status: "active",
      monthlyContribution: 900,
    },
    {
      id: "demo-goal-trip",
      name: "Viagem",
      description: "Meta menor para testar prioridades.",
      targetAmount: 6000,
      currentAmount: 1800,
      deadline: iso(endOfMonth(addMonths(currentMonth, 5))),
      accountId: "demo-account-checking",
      status: "active",
      monthlyContribution: 500,
    },
  ];

  return { accounts, categories, recurrenceRules, transactions, goals };
}

function monthTransactions(
  token: string,
  month: Date,
  values: {
    salary: number;
    freelance: number;
    rent: number;
    market: number;
    food: number;
    transport: number;
    health: number;
    leisure: number;
    subscriptions: number;
  },
): Transaction[] {
  return [
    tx(`${token}-salary`, "Salário", values.salary, addDays(month, 4), "income", "cat-income-salary", {
      recurrenceId: "demo-rule-salary",
    }),
    tx(`${token}-freelance`, "Projeto freelance", values.freelance, addDays(month, 13), "income", "cat-income-freelance"),
    tx(`${token}-rent`, "Aluguel", values.rent, addDays(month, 5), "expense", "cat-expense-home", {
      recurrenceId: "demo-rule-rent",
    }),
    tx(`${token}-market-1`, "Mercado da semana", Math.round(values.market * 0.42), addDays(month, 8), "expense", "cat-expense-market"),
    tx(`${token}-market-2`, "Reposição de mercado", Math.round(values.market * 0.35), addDays(month, 18), "expense", "cat-expense-market"),
    tx(`${token}-market-3`, "Compras rápidas", Math.round(values.market * 0.23), addDays(month, 25), "expense", "cat-expense-market"),
    tx(`${token}-food-1`, "Restaurantes", Math.round(values.food * 0.52), addDays(month, 11), "expense", "cat-expense-food"),
    tx(`${token}-food-2`, "Cafés e lanches", Math.round(values.food * 0.48), addDays(month, 21), "expense", "cat-expense-food"),
    tx(`${token}-transport`, "Transporte e combustível", values.transport, addDays(month, 16), "expense", "cat-expense-transport"),
    tx(`${token}-health`, "Farmácia e saúde", values.health, addDays(month, 19), "expense", "cat-expense-health"),
    tx(`${token}-leisure`, "Lazer", values.leisure, addDays(month, 23), "expense", "cat-expense-leisure"),
    tx(`${token}-subscriptions`, "Assinaturas", values.subscriptions, addDays(month, 10), "expense", "cat-expense-subscriptions", {
      recurrenceId: "demo-rule-subscriptions",
    }),
  ];
}

function category(
  id: string,
  name: string,
  color: string,
  icon: string,
  kind: Category["kind"],
): Category {
  return { id, name, color, icon, kind };
}

function tx(
  id: string,
  title: string,
  amount: number,
  date: Date,
  type: Transaction["type"],
  categoryId: string,
  patch: Partial<Transaction> = {},
): Transaction {
  return {
    id: `${DEMO_PREFIX}tx-${id}`,
    title,
    amount,
    date: iso(date),
    accountId: type === "income" ? "demo-account-checking" : "demo-account-checking",
    categoryId,
    type,
    isProjected: false,
    notes: "Dado de exemplo para testar visualizações.",
    ...patch,
  };
}

function iso(date: Date) {
  return format(date, "yyyy-MM-dd");
}
