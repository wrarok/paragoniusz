import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, AlertCircle, Calendar, DollarSign } from 'lucide-react';
import { ExpenseVerificationItem } from './ExpenseVerificationItem';
import type { CategoryDTO } from '../../types';
import type { EditableExpense } from '../../types/scan-flow.types';

type ExpenseVerificationListProps = {
  expenses: EditableExpense[];
  categories: CategoryDTO[];
  receiptDate: string;
  totalAmount: string;
  currency: string;
  onUpdateExpense: (id: string, updates: Partial<EditableExpense>) => void;
  onRemoveExpense: (id: string) => void;
  onSave: () => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
};

export function ExpenseVerificationList({
  expenses,
  categories,
  receiptDate,
  totalAmount,
  currency,
  onUpdateExpense,
  onRemoveExpense,
  onSave,
  onCancel,
  isSaving,
}: ExpenseVerificationListProps) {
  const validation = useMemo(() => {
    if (expenses.length === 0) {
      return {
        isValid: false,
        errors: ['At least one expense is required'],
      };
    }

    const errors: string[] = [];
    let hasInvalidAmount = false;
    let hasInvalidCategory = false;

    expenses.forEach((expense, index) => {
      const amount = parseFloat(expense.amount);
      if (!expense.amount || isNaN(amount) || amount <= 0) {
        hasInvalidAmount = true;
      }

      if (!expense.category_id) {
        hasInvalidCategory = true;
      }
    });

    if (hasInvalidAmount) {
      errors.push('All expenses must have valid amounts greater than 0');
    }

    if (hasInvalidCategory) {
      errors.push('All expenses must have a category selected');
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
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount: number, currencyCode: string): string => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
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
          <CardTitle>Verify Extracted Expenses</CardTitle>
          <CardDescription>
            Review and edit the expenses extracted from your receipt
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Receipt Date</p>
                <p className="text-sm font-medium">{formatDate(receiptDate)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Original Total</p>
                <p className="text-sm font-medium">
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
                <p className="font-medium mb-1">Please fix the following issues:</p>
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
                All expenses are valid and ready to save
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Expense Items */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            Expenses ({expenses.length})
          </h3>
          {expenses.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Calculated Total: {formatCurrency(calculatedTotal, currency)}
            </p>
          )}
        </div>

        {expenses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No expenses to display. All items have been removed.
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
              <span>Total Amount:</span>
              <span>{formatCurrency(calculatedTotal, currency)}</span>
            </div>

            {Math.abs(calculatedTotal - parseFloat(totalAmount)) > 0.01 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  The calculated total differs from the original receipt total by{' '}
                  {formatCurrency(
                    Math.abs(calculatedTotal - parseFloat(totalAmount)),
                    currency
                  )}
                  . Please verify your amounts.
                </AlertDescription>
              </Alert>
            )}

            <Separator />

            <div className="text-sm text-muted-foreground space-y-1">
              <p>• All expenses will be saved with the receipt date: {formatDate(receiptDate)}</p>
              <p>• Expenses marked as "Edited" will be flagged as modified from AI suggestions</p>
              <p>• You can edit these expenses later from the dashboard</p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isSaving}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={onSave}
            disabled={!validation.isValid || isSaving || expenses.length === 0}
            className="w-full sm:flex-1"
          >
            {isSaving ? 'Saving...' : `Save ${expenses.length} Expense${expenses.length !== 1 ? 's' : ''}`}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}