import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, AlertCircle, Calendar, DollarSign, Edit2 } from "lucide-react";
import { ExpenseVerificationItem } from "./ExpenseVerificationItem";
import type { CategoryDTO } from "../../types";
import type { EditableExpense } from "../../types/scan-flow.types";

interface ExpenseVerificationListProps {
  expenses: EditableExpense[];
  categories: CategoryDTO[];
  receiptDate: string;
  totalAmount: string;
  currency: string;
  onUpdateExpense: (id: string, updates: Partial<EditableExpense>) => void;
  onRemoveExpense: (id: string) => void;
  onUpdateReceiptDate: (newDate: string) => void;
  onSave: () => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}

export function ExpenseVerificationList({
  expenses,
  categories,
  receiptDate,
  totalAmount,
  currency,
  onUpdateExpense,
  onRemoveExpense,
  onUpdateReceiptDate,
  onSave,
  onCancel,
  isSaving,
}: ExpenseVerificationListProps) {
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [editedDate, setEditedDate] = useState(receiptDate);
  const validation = useMemo(() => {
    if (expenses.length === 0) {
      return {
        isValid: false,
        errors: ["Wymagany jest co najmniej jeden wydatek"],
      };
    }

    const errors: string[] = [];
    let hasInvalidAmount = false;
    let hasInvalidCategory = false;

    expenses.forEach((expense) => {
      const amount = parseFloat(expense.amount);
      if (!expense.amount || isNaN(amount) || amount <= 0) {
        hasInvalidAmount = true;
      }

      if (!expense.category_id) {
        hasInvalidCategory = true;
      }
    });

    if (hasInvalidAmount) {
      errors.push("Wszystkie wydatki muszą mieć prawidłową kwotę większą niż 0");
    }

    if (hasInvalidCategory) {
      errors.push("Wszystkie wydatki muszą mieć wybraną kategorię");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }, [expenses]);

  const calculatedTotal = useMemo(() => {
    return expenses.reduce((sum, expense) => {
      const amount = parseFloat(expense.amount);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
  }, [expenses]);

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("pl-PL", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount: number, currencyCode: string): string => {
    try {
      return new Intl.NumberFormat("pl-PL", {
        style: "currency",
        currency: currencyCode,
      }).format(amount);
    } catch {
      return `${currencyCode} ${amount.toFixed(2)}`;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Receipt Summary Header */}
      <Card>
        <CardHeader>
          <CardTitle>Zweryfikuj wyodrębnione wydatki</CardTitle>
          <CardDescription>Przejrzyj i edytuj wydatki wyodrębnione z paragonu</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-muted rounded-lg">
              {isEditingDate ? (
                <div className="space-y-2">
                  <Label htmlFor="receipt-date" className="text-xs text-muted-foreground">
                    Data paragonu
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="receipt-date"
                      type="date"
                      value={editedDate}
                      onChange={(e) => setEditedDate(e.target.value)}
                      className="h-8 text-sm"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        onUpdateReceiptDate(editedDate);
                        setIsEditingDate(false);
                      }}
                      className="h-8 px-2"
                    >
                      ✓
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditedDate(receiptDate);
                        setIsEditingDate(false);
                      }}
                      className="h-8 px-2"
                    >
                      ✕
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Data paragonu</p>
                    <p className="text-sm font-medium">{formatDate(receiptDate)}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setIsEditingDate(true)} className="h-8 w-8 p-0">
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Suma oryginalna</p>
                <p className="text-sm font-medium" data-testid="total-amount">
                  {formatCurrency(parseFloat(totalAmount), currency)}
                </p>
              </div>
            </div>
          </div>

          {/* Validation Errors */}
          {!validation.isValid && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-1">Napraw następujące problemy:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {validation.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Success Message */}
          {validation.isValid && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                Wszystkie wydatki są prawidłowe i gotowe do zapisania
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Expense Items */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            Wydatki (<span data-testid="expense-count">{expenses.length}</span>)
          </h3>
          {expenses.length > 0 && (
            <p className="text-sm text-muted-foreground">Obliczona suma: {formatCurrency(calculatedTotal, currency)}</p>
          )}
        </div>

        {expenses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                Brak wydatków do wyświetlenia. Wszystkie elementy zostały usunięte.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {expenses.map((expense) => (
              <ExpenseVerificationItem
                key={expense.id}
                expense={expense}
                categories={categories}
                onUpdate={(updates) => onUpdateExpense(expense.id, updates)}
                onRemove={() => onRemoveExpense(expense.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Summary and Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between text-lg font-semibold">
              <span>Łączna kwota:</span>
              <span>{formatCurrency(calculatedTotal, currency)}</span>
            </div>

            {Math.abs(calculatedTotal - parseFloat(totalAmount)) > 0.01 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Obliczona suma różni się od oryginalnej sumy z paragonu o{" "}
                  {formatCurrency(Math.abs(calculatedTotal - parseFloat(totalAmount)), currency)}. Sprawdź kwoty.
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
            disabled={!validation.isValid || isSaving || expenses.length === 0}
            className="w-full sm:flex-1"
          >
            {isSaving
              ? "Zapisywanie..."
              : `Zapisz ${expenses.length} ${expenses.length === 1 ? "wydatek" : expenses.length < 5 ? "wydatki" : "wydatków"}`}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
