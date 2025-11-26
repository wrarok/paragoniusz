import { useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, AlertCircle } from 'lucide-react';
import type { CategoryDTO } from '../../types';
import type { EditableExpense } from '../../types/scan-flow.types';

type ExpenseVerificationItemProps = {
  expense: EditableExpense;
  categories: CategoryDTO[];
  onUpdate: (updates: Partial<EditableExpense>) => void;
  onRemove: () => void;
};

export function ExpenseVerificationItem({
  expense,
  categories,
  onUpdate,
  onRemove,
}: ExpenseVerificationItemProps) {
  const handleAmountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      
      // Allow empty string, numbers, and decimal point
      if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
        onUpdate({ amount: value });
      }
    },
    [onUpdate]
  );

  const handleCategoryChange = useCallback(
    (categoryId: string) => {
      const category = categories.find((c) => c.id === categoryId);
      if (category) {
        onUpdate({
          category_id: categoryId,
          category_name: category.name,
        });
      }
    },
    [categories, onUpdate]
  );

  const amountError = useMemo(() => {
    if (!expense.amount) {
      return 'Amount is required';
    }
    const numAmount = parseFloat(expense.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return 'Amount must be greater than 0';
    }
    return null;
  }, [expense.amount]);

  const categoryError = useMemo(() => {
    if (!expense.category_id) {
      return 'Category is required';
    }
    const categoryExists = categories.some((c) => c.id === expense.category_id);
    if (!categoryExists) {
      return 'Invalid category';
    }
    return null;
  }, [expense.category_id, categories]);

  const hasError = amountError || categoryError;

  return (
    <Card className={hasError ? 'border-destructive' : ''}>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Header with Remove Button */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-1">
              {expense.items.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">Items:</span>{' '}
                  {expense.items.join(', ')}
                </div>
              )}
              {expense.isEdited && (
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  ✓ Edited
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onRemove}
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              aria-label="Remove expense"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor={`amount-${expense.id}`}>
              Amount <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id={`amount-${expense.id}`}
                type="text"
                inputMode="decimal"
                value={expense.amount}
                onChange={handleAmountChange}
                placeholder="0.00"
                className={amountError ? 'border-destructive' : ''}
                aria-invalid={!!amountError}
                aria-describedby={
                  amountError ? `amount-error-${expense.id}` : undefined
                }
              />
            </div>
            {amountError && (
              <div
                id={`amount-error-${expense.id}`}
                className="flex items-center gap-1 text-xs text-destructive"
                role="alert"
              >
                <AlertCircle className="h-3 w-3" />
                <span>{amountError}</span>
              </div>
            )}
          </div>

          {/* Category Select */}
          <div className="space-y-2">
            <Label htmlFor={`category-${expense.id}`}>
              Category <span className="text-destructive">*</span>
            </Label>
            <Select
              value={expense.category_id}
              onValueChange={handleCategoryChange}
            >
              <SelectTrigger
                id={`category-${expense.id}`}
                className={categoryError ? 'border-destructive' : ''}
                aria-invalid={!!categoryError}
                aria-describedby={
                  categoryError ? `category-error-${expense.id}` : undefined
                }
              >
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {categoryError && (
              <div
                id={`category-error-${expense.id}`}
                className="flex items-center gap-1 text-xs text-destructive"
                role="alert"
              >
                <AlertCircle className="h-3 w-3" />
                <span>{categoryError}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}