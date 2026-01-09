import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils/formatters";
import type { CategoryDTO } from "@/types";
import type { EditableExpense } from "@/types/scan-flow.types";

interface ExpensesListSectionProps {
  expenses: EditableExpense[];
  categories: CategoryDTO[];
  calculatedTotal: number;
  currency: string;
  onUpdateExpense: (id: string, updates: Partial<EditableExpense>) => void;
  onRemoveExpense: (id: string) => void;
}

export function ExpensesListSection({
  expenses,
  categories,
  calculatedTotal,
  currency,
  onUpdateExpense,
  onRemoveExpense,
}: ExpensesListSectionProps) {
  return (
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
            <p className="text-muted-foreground">Brak wydatków do wyświetlenia. Wszystkie elementy zostały usunięte.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {expenses.map((expense, index) => (
            <Card key={expense.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Wydatek #{index + 1}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveExpense(expense.id)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`category-${expense.id}`}>Kategoria</Label>
                  <Select
                    value={expense.category_id}
                    onValueChange={(value) => {
                      onUpdateExpense(expense.id, { category_id: value, isEdited: true });
                    }}
                  >
                    <SelectTrigger id={`category-${expense.id}`}>
                      <SelectValue placeholder="Wybierz kategorię" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`amount-${expense.id}`}>Kwota</Label>
                  <Input
                    id={`amount-${expense.id}`}
                    type="number"
                    step="0.01"
                    min="0"
                    value={expense.amount}
                    onChange={(e) => {
                      onUpdateExpense(expense.id, { amount: e.target.value, isEdited: true });
                    }}
                    placeholder="0.00"
                  />
                </div>

                {expense.isEdited && (
                  <div className="absolute top-2 right-2">
                    <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900 px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-300">
                      Edytowane
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
