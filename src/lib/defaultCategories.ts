import type { Category } from "@/types";

/**
 * Espelho do seed do SQLite (src-tauri/src/db.rs): no desktop as
 * categorias nascem no banco; no navegador o onboarding semeia por aqui.
 * IDs idênticos mantêm backups e pré-seleções compatíveis.
 */
export const defaultCategories: Category[] = [
  { id: "cat-income-salary", name: "Salário", color: "#16A34A", icon: "briefcase", kind: "income" },
  { id: "cat-income-freelance", name: "Freelance", color: "#22C55E", icon: "wallet", kind: "income" },
  { id: "cat-income-investments", name: "Investimentos", color: "#0EA5E9", icon: "trending-up", kind: "income" },
  { id: "cat-income-refund", name: "Reembolso", color: "#14B8A6", icon: "refresh-cw", kind: "income" },
  { id: "cat-expense-food", name: "Alimentação", color: "#F97316", icon: "utensils", kind: "expense" },
  { id: "cat-expense-market", name: "Mercado", color: "#EAB308", icon: "shopping-cart", kind: "expense" },
  { id: "cat-expense-transport", name: "Transporte", color: "#3B82F6", icon: "car", kind: "expense" },
  { id: "cat-expense-fuel", name: "Combustível", color: "#6366F1", icon: "fuel", kind: "expense" },
  { id: "cat-expense-home", name: "Moradia", color: "#8B5CF6", icon: "home", kind: "expense" },
  { id: "cat-expense-health", name: "Saúde", color: "#EF4444", icon: "heart-pulse", kind: "expense" },
  { id: "cat-expense-education", name: "Educação", color: "#06B6D4", icon: "book-open", kind: "expense" },
  { id: "cat-expense-leisure", name: "Lazer", color: "#EC4899", icon: "gamepad-2", kind: "expense" },
  { id: "cat-expense-subscriptions", name: "Assinaturas", color: "#64748B", icon: "repeat", kind: "expense" },
  { id: "cat-expense-taxes", name: "Impostos", color: "#71717A", icon: "receipt", kind: "expense" },
];
