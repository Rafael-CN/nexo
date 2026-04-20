import { formatISO } from "date-fns";
import type { Account, Transaction } from "@/types";

function transactionDelta(transaction: Transaction): number {
  if (transaction.type === "income") return transaction.amount;
  if (transaction.type === "expense") return -transaction.amount;
  return 0;
}

export function getCurrentAccountBalance(
  account: Account,
  transactions: Transaction[],
  asOf = new Date(),
): number {
  const asOfIso = formatISO(asOf, { representation: "date" });

  return transactions.reduce((balance, transaction) => {
    if (transaction.accountId !== account.id) return balance;
    if (transaction.date > asOfIso) return balance;
    if (transaction.type === "transfer") return balance;

    return balance + transactionDelta(transaction);
  }, account.balance);
}

export function getCurrentAccountBalances(
  accounts: Account[],
  transactions: Transaction[],
  asOf = new Date(),
): Map<string, number> {
  return new Map(
    accounts.map((account) => [
      account.id,
      getCurrentAccountBalance(account, transactions, asOf),
    ]),
  );
}

export function getTotalCurrentBalance(
  accounts: Account[],
  transactions: Transaction[],
  asOf = new Date(),
): number {
  return accounts.reduce(
    (total, account) =>
      total + getCurrentAccountBalance(account, transactions, asOf),
    0,
  );
}
