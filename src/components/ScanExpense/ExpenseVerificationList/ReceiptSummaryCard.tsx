import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";
import { DateEditor } from "./DateEditor";
import { ValidationAlerts } from "./ValidationAlerts";
import { formatCurrency, parseAmount } from "@/lib/utils/formatters";
import type { ValidationResult } from "@/components/hooks/useExpenseValidation";

interface ReceiptSummaryCardProps {
  receiptDate: string;
  totalAmount: string;
  currency: string;
  validation: ValidationResult;
  onUpdateReceiptDate: (newDate: string) => void;
}

export function ReceiptSummaryCard({
  receiptDate,
  totalAmount,
  currency,
  validation,
  onUpdateReceiptDate,
}: ReceiptSummaryCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Zweryfikuj wyodrębnione wydatki</CardTitle>
        <CardDescription>Przejrzyj i edytuj wydatki wyodrębnione z paragonu</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 bg-muted rounded-lg">
            <DateEditor date={receiptDate} onUpdateDate={onUpdateReceiptDate} />
          </div>

          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <DollarSign className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Suma oryginalna</p>
              <p className="text-sm font-medium" data-testid="total-amount">
                {formatCurrency(parseAmount(totalAmount), currency)}
              </p>
            </div>
          </div>
        </div>

        <ValidationAlerts validation={validation} />
      </CardContent>
    </Card>
  );
}
