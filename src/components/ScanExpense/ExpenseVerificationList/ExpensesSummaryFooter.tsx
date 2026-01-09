import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { AlertCircle } from "lucide-react";
import { formatCurrency, formatDate, formatExpenseCount, parseAmount } from "@/lib/utils/formatters";
import type { ValidationResult } from "@/components/hooks/useExpenseValidation";

interface ExpensesSummaryFooterProps {
  calculatedTotal: number;
  originalTotal: string;
  currency: string;
  receiptDate: string;
  expenseCount: number;
  validation: ValidationResult;
  isSaving: boolean;
  onSave: () => Promise<void>;
  onCancel: () => void;
}

export function ExpensesSummaryFooter({
  calculatedTotal,
  originalTotal,
  currency,
  receiptDate,
  expenseCount,
  validation,
  isSaving,
  onSave,
  onCancel,
}: ExpensesSummaryFooterProps) {
  const originalTotalNum = parseAmount(originalTotal);
  const hasDifference = Math.abs(calculatedTotal - originalTotalNum) > 0.01;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between text-lg font-semibold">
            <span>Łączna kwota:</span>
            <span>{formatCurrency(calculatedTotal, currency)}</span>
          </div>

          {hasDifference && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Obliczona suma różni się od oryginalnej sumy z paragonu o{" "}
                {formatCurrency(Math.abs(calculatedTotal - originalTotalNum), currency)}. Sprawdź kwoty.
              </AlertDescription>
            </Alert>
          )}

          <Separator />

          <div className="text-sm text-muted-foreground space-y-1">
            <p>• Wszystkie wydatki zostaną zapisane z datą paragonu: {formatDate(receiptDate)}</p>
            <p>• Wydatki oznaczone jako &quot;Edytowane&quot; będą oflagowane jako zmodyfikowane z sugestii AI</p>
            <p>• Możesz edytować te wydatki później z panelu głównego</p>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col sm:flex-row gap-3">
        <Button variant="outline" onClick={onCancel} disabled={isSaving} className="w-full sm:w-auto">
          Anuluj
        </Button>
        <Button
          onClick={onSave}
          disabled={!validation.isValid || isSaving || expenseCount === 0}
          className="w-full sm:flex-1"
        >
          {isSaving ? "Zapisywanie..." : `Zapisz ${formatExpenseCount(expenseCount)}`}
        </Button>
      </CardFooter>
    </Card>
  );
}
