import { Construction } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function PlaceholderPage({ label }: { label: string }) {
  return (
    <Card>
      <CardContent className="grid place-items-center gap-3 py-16 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
          <Construction className="h-5 w-5" />
        </div>
        <p className="text-sm font-medium">{label}</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          Esta seção ainda não foi construída. Voltaremos aqui nas próximas
          iterações.
        </p>
      </CardContent>
    </Card>
  );
}
