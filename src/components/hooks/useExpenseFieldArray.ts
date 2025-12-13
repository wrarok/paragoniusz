/**
 * Expense Field Array Hook
 * 
 * Custom hook for managing expense field array in React Hook Form.
 * Encapsulates field array logic, edit tracking, and removal validation.
 */

import { useCallback } from 'react';
import { useFieldArray, type Control } from 'react-hook-form';
import type { ExpenseVerificationFormValues } from '@/lib/validation/expense-verification.validation';

/**
 * Props for useExpenseFieldArray hook
 */
interface UseExpenseFieldArrayProps {
  control: Control<ExpenseVerificationFormValues>;
}

/**
 * Return type for useExpenseFieldArray hook
 */
interface UseExpenseFieldArrayReturn {
  /** Field array items */
  fields: ReturnType<typeof useFieldArray<ExpenseVerificationFormValues, 'expenses'>>['fields'];
  /** Mark expense as edited */
  markAsEdited: (index: number) => void;
  /** Remove expense from array */
  removeExpense: (index: number) => void;
  /** Whether an expense can be removed (at least 2 expenses required) */
  canRemoveExpense: boolean;
}

/**
 * Custom hook for managing expense field array
 * 
 * Provides simplified API for field array operations with built-in validation.
 * 
 * @example
 * ```tsx
 * const { fields, markAsEdited, removeExpense, canRemoveExpense } = useExpenseFieldArray({
 *   control
 * });
 * 
 * {fields.map((field, index) => (
 *   <ExpenseItem
 *     key={field.id}
 *     onEdit={() => markAsEdited(index)}
 *     onRemove={() => removeExpense(index)}
 *     canRemove={canRemoveExpense}
 *   />
 * ))}
 * ```
 */
export function useExpenseFieldArray({
  control,
}: UseExpenseFieldArrayProps): UseExpenseFieldArrayReturn {
  const { fields, remove, update } = useFieldArray({
    control,
    name: 'expenses',
  });

  /**
   * Mark expense as edited
   * Updates the isEdited flag for the specified expense
   */
  const markAsEdited = useCallback(
    (index: number) => {
      const currentExpense = fields[index];
      update(index, { ...currentExpense, isEdited: true });
    },
    [fields, update]
  );

  /**
   * Remove expense from array
   * Only allows removal if there are at least 2 expenses
   */
  const removeExpense = useCallback(
    (index: number) => {
      if (fields.length > 1) {
        remove(index);
      }
    },
    [fields.length, remove]
  );

  /**
   * Whether an expense can be removed
   * At least one expense must remain
   */
  const canRemoveExpense = fields.length > 1;

  return {
    fields,
    markAsEdited,
    removeExpense,
    canRemoveExpense,
  };
}