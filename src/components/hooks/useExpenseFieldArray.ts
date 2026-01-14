/**
 * Expense Field Array Hook
 *
 * Custom hook for managing expense field array in React Hook Form.
 * Encapsulates field array logic, edit tracking, and removal validation.
 */

import { useCallback, useState } from "react";
import { useFieldArray, type Control } from "react-hook-form";
import type { ExpenseVerificationFormValues } from "@/lib/validation/expense-verification.validation";

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
  /** Field array items with edited flag */
  fields: (ReturnType<typeof useFieldArray<ExpenseVerificationFormValues, "expenses">>["fields"][number] & {
    isEdited: boolean;
  })[];
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
 * Tracks edited state separately from form state to avoid interference.
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
export function useExpenseFieldArray({ control }: UseExpenseFieldArrayProps): UseExpenseFieldArrayReturn {
  const { fields, remove } = useFieldArray({
    control,
    name: "expenses",
  });

  // Track edited state separately (not in form state)
  const [editedIndices, setEditedIndices] = useState<Set<number>>(new Set());

  /**
   * Mark expense as edited
   * Tracks editing in separate state to avoid interfering with form values
   */
  const markAsEdited = useCallback((index: number) => {
    setEditedIndices((prev) => new Set(prev).add(index));
  }, []);

  /**
   * Remove expense from array
   * Only allows removal if there are at least 2 expenses
   */
  const removeExpense = useCallback(
    (index: number) => {
      if (fields.length > 1) {
        remove(index);
        // Update edited indices after removal
        setEditedIndices((prev) => {
          const newSet = new Set<number>();
          prev.forEach((idx) => {
            if (idx < index) {
              newSet.add(idx);
            } else if (idx > index) {
              newSet.add(idx - 1);
            }
          });
          return newSet;
        });
      }
    },
    [fields.length, remove]
  );

  /**
   * Whether an expense can be removed
   * At least one expense must remain
   */
  const canRemoveExpense = fields.length > 1;

  // Merge edited state with fields
  const fieldsWithEditedFlag = fields.map((field, index) => ({
    ...field,
    isEdited: editedIndices.has(index),
  }));

  return {
    fields: fieldsWithEditedFlag,
    markAsEdited,
    removeExpense,
    canRemoveExpense,
  };
}
