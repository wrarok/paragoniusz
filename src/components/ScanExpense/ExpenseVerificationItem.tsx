/**
 * Expense Verification Item Component
 * 
 * Renders a single expense item in the verification form.
 * Uses custom controlled components for form fields.
 */

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Trash2Icon } from 'lucide-react';
import { ControlledCategorySelect, ControlledAmountInput } from '@/components/form-controls';
import type { Control, FieldErrors } from 'react-hook-form';
import type { ExpenseVerificationFormValues } from '@/lib/validation/expense-verification.validation';
import type { CategoryDTO } from '@/types';

interface ExpenseVerificationItemProps {
  /** Field index in the array */
  index: number;
  /** React Hook Form control */
  control: Control<ExpenseVerificationFormValues>;
  /** Field errors for this item */
  errors?: FieldErrors<ExpenseVerificationFormValues['expenses'][number]>;
  /** Available categories */
  categories: CategoryDTO[];
  /** Items from receipt (read-only) */
  items?: string[];
  /** Whether this item was edited */
  isEdited: boolean;
  /** Callback when field is edited */
  onMarkEdited: () => void;
  /** Callback when remove button is clicked */
  onRemove: () => void;
  /** Whether remove button should be disabled */
  canRemove: boolean;
}

/**
 * Single expense item in verification form
 * 
 * @example
 * ```tsx
 * <ExpenseVerificationItem
 *   index={0}
 *   control={control}
 *   categories={categories}
 *   isEdited={field.isEdited}
 *   onMarkEdited={() => markAsEdited(0)}
 *   onRemove={() => remove(0)}
 *   canRemove={fields.length > 1}
 * />
 * ```
 */
export function ExpenseVerificationItem({
  index,
  control,
  errors,
  categories,
  items,
  isEdited,
  onMarkEdited,
  onRemove,
  canRemove,
}: ExpenseVerificationItemProps) {
  return (
    <Card className="relative">
      <CardContent className="pt-6 space-y-4">
        {/* Category Select */}
        <ControlledCategorySelect
          control={control}
          name={`expenses.${index}.category_id` as const}
          categories={categories}
          onEdit={onMarkEdited}
        />

        {/* Amount Input */}
        <ControlledAmountInput
          control={control}
          name={`expenses.${index}.amount` as const}
          onEdit={onMarkEdited}
        />

        {/* Items from receipt (read-only) */}
        {items && items.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">
              Pozycje z paragonu
            </Label>
            <div className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
              {items.join(', ')}
            </div>
          </div>
        )}

        {/* Remove Button */}
        <div className="flex justify-end pt-2">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={onRemove}
            disabled={!canRemove}
            title={!canRemove ? 'Nie można usunąć ostatniego wydatku' : 'Usuń wydatek'}
          >
            <Trash2Icon className="h-4 w-4 mr-2" />
            Usuń
          </Button>
        </div>

        {/* Edited Badge */}
        {isEdited && (
          <div className="absolute top-2 right-2">
            <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900 px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-300">
              Edytowane
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}