import { Card, CardContent } from "@/components/ui/card";
import { TransactionRow } from "@/components/shared/TransactionRow";
import { useFinanceStore } from "@/store/useFinanceStore";

export function TransactionsPage() {
  const transactions = useFinanceStore((s) => s.transactions);
  const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-0.5">
          {sorted.map((t) => (
            <TransactionRow key={t.id} transaction={t} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
