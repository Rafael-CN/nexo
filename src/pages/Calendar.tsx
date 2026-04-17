import { useMemo } from "react";
import {
  addDays,
  eachDayOfInterval,
  format,
  formatISO,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfToday,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { useFinanceStore } from "@/store/useFinanceStore";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function CalendarPage() {
  const transactions = useFinanceStore((s) => s.transactions);

  const today = startOfToday();
  const monthStart = startOfMonth(today);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = addDays(gridStart, 41);
  const days = useMemo(
    () => eachDayOfInterval({ start: gridStart, end: gridEnd }),
    [gridStart, gridEnd],
  );

  const byDate = useMemo(() => {
    const map = new Map<string, typeof transactions>();
    for (const t of transactions) {
      const list = map.get(t.date) ?? [];
      list.push(t);
      map.set(t.date, list);
    }
    return map;
  }, [transactions]);

  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden border-dashed bg-gradient-to-br from-primary/5 via-card to-card">
        <div className="flex flex-col gap-3 p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium">
                Protótipo visual — FullCalendar virá na próxima iteração
              </p>
              <p className="text-xs text-muted-foreground">
                Este wireframe mostra o conceito: cada dia exibe as transações
                projetadas e o impacto no saldo.
              </p>
            </div>
          </div>
          <Badge variant="outline">pré-visualização</Badge>
        </div>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg capitalize">
              {format(today, "MMMM 'de' yyyy", { locale: ptBR })}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {transactions.filter((t) => t.isProjected).length} lançamentos
              projetados no período
            </p>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" aria-label="Mês anterior">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm">
              Hoje
            </Button>
            <Button variant="outline" size="icon" aria-label="Próximo mês">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-7 overflow-hidden rounded-lg border">
            {WEEKDAYS.map((w) => (
              <div
                key={w}
                className="border-b border-r last:border-r-0 bg-muted/40 px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
              >
                {w}
              </div>
            ))}

            {days.map((day, i) => {
              const iso = formatISO(day, { representation: "date" });
              const items = byDate.get(iso) ?? [];
              const inMonth = isSameMonth(day, today);
              const dayIsToday = isToday(day);

              const income = items
                .filter((t) => t.type === "income")
                .reduce((a, t) => a + t.amount, 0);
              const expense = items
                .filter((t) => t.type === "expense")
                .reduce((a, t) => a + t.amount, 0);

              return (
                <div
                  key={iso}
                  className={cn(
                    "relative min-h-28 border-b border-r p-2 transition-colors",
                    (i + 1) % 7 === 0 && "border-r-0",
                    i >= days.length - 7 && "border-b-0",
                    !inMonth && "bg-muted/20 text-muted-foreground",
                    dayIsToday && "bg-primary/5",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "grid h-6 w-6 place-items-center rounded-full text-xs font-semibold",
                        dayIsToday &&
                          "bg-primary text-primary-foreground",
                      )}
                    >
                      {format(day, "d")}
                    </span>
                    {items.length > 0 && (
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {items.length}
                      </span>
                    )}
                  </div>

                  <div className="mt-1.5 space-y-1">
                    {items.slice(0, 2).map((t) => {
                      const isIncome = t.type === "income";
                      return (
                        <div
                          key={t.id}
                          className={cn(
                            "flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium",
                            isIncome
                              ? "bg-success/10 text-success"
                              : "bg-destructive/10 text-destructive",
                            t.isProjected && "ring-1 ring-inset ring-current/20",
                          )}
                        >
                          {isIncome ? (
                            <ArrowUpRight className="h-2.5 w-2.5" />
                          ) : (
                            <ArrowDownLeft className="h-2.5 w-2.5" />
                          )}
                          <span className="truncate">{t.title}</span>
                        </div>
                      );
                    })}
                    {items.length > 2 && (
                      <p className="px-1.5 text-[10px] text-muted-foreground">
                        +{items.length - 2} mais
                      </p>
                    )}
                  </div>

                  {(income > 0 || expense > 0) && (
                    <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between text-[9px] font-medium tabular-nums">
                      {income > 0 && (
                        <span className="text-success">
                          +{formatCurrency(income, true)}
                        </span>
                      )}
                      {expense > 0 && (
                        <span className="ml-auto text-destructive">
                          −{formatCurrency(expense, true)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <Legend color="bg-success/60" label="Entrada" />
            <Legend color="bg-destructive/60" label="Saída" />
            <Legend
              color="bg-primary/60"
              label="Hoje"
              extraClass="ring-1 ring-primary"
            />
            <span className="ml-auto text-[11px] italic">
              Dia selecionado abrirá detalhe do saldo projetado (em breve).
            </span>
          </div>
        </CardContent>
      </Card>

      <TodayDetail
        date={today}
        transactions={byDate.get(
          formatISO(today, { representation: "date" }),
        ) ?? []}
      />
    </div>
  );
}

function Legend({
  color,
  label,
  extraClass,
}: {
  color: string;
  label: string;
  extraClass?: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-2.5 w-2.5 rounded-full", color, extraClass)} />
      {label}
    </span>
  );
}

function TodayDetail({
  date,
  transactions,
}: {
  date: Date;
  transactions: ReturnType<typeof useFinanceStore.getState>["transactions"];
}) {
  const todays = transactions.filter((t) => isSameDay(new Date(t.date), date));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
          Detalhe — {format(date, "EEEE, d 'de' MMM", { locale: ptBR })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {todays.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sem movimentações hoje. Perfeito dia pra economizar.
          </p>
        ) : (
          <ul className="space-y-2">
            {todays.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
              >
                <span className="truncate">{t.title}</span>
                <span
                  className={cn(
                    "font-semibold tabular-nums",
                    t.type === "income" ? "text-success" : "text-foreground",
                  )}
                >
                  {t.type === "income" ? "+" : "−"}
                  {formatCurrency(t.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
