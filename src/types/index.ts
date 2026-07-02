export type AccountType =
  | "checking"
  | "savings"
  | "credit"
  | "cash"
  | "investment";

export interface Account {
  id: string;
  name: string;
  institution: string;
  type: AccountType;
  balance: number;
  color: string;
  icon?: string;
  lastFour?: string;
}

export type TransactionType = "income" | "expense" | "transfer";

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  date: string;
  accountId: string;
  /** Vazio ("") para transferências, que não usam categoria. */
  categoryId: string;
  type: TransactionType;
  isProjected: boolean;
  notes?: string;
  recurrenceId?: string;
  /** Conta de destino — presente apenas quando type === "transfer". */
  transferAccountId?: string;
}

export type CategoryKind = "income" | "expense";

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  kind: CategoryKind;
}

export type RecurrenceFrequency = "daily" | "weekly" | "monthly" | "yearly";

export interface RecurrenceRule {
  id: string;
  frequency: RecurrenceFrequency;
  interval: number;
  until?: string;
}

export type GoalStatus = "active" | "paused" | "completed";

export interface Goal {
  id: string;
  name: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string; // ISO date "YYYY-MM-DD"
  accountId?: string;
  status: GoalStatus;
  monthlyContribution?: number;
}
