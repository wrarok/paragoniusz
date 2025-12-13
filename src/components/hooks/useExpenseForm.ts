/**
 * Expense Form Hook - React Hook Form Version
 * 
 * Custom hook for managing expense form state using React Hook Form.
 * Handles form validation, API submission, and error handling.
 * 
 * **Refactored from manual state management (273 LOC → ~155 LOC)**
 * - Uses React Hook Form for state management
 * - Zod schema for validation
 * - Service layer for API calls
 * - Transformer for data conversions
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useMemo } from 'react';
import { expenseFormSchema, type ExpenseFormValues } from '@/lib/validation/expense-form.schema';
import { ExpenseMutationService } from '@/lib/services/expense-mutation.service';
import { ExpenseFormTransformer } from '@/lib/transformers/expense-form.transformer';
import type { ExpenseFormMode } from '../ExpenseForm/types';
import type { CategoryDTO, ExpenseDTO } from '@/types';

/**
 * Props for useExpenseForm hook
 */
interface UseExpenseFormProps {
  mode: ExpenseFormMode;
  expenseId?: string;
  initialData?: ExpenseDTO;
  categories: CategoryDTO[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

/**
 * Return type for useExpenseForm hook
 */
interface UseExpenseFormReturn {
  form: ReturnType<typeof useForm<ExpenseFormValues>>;
  onSubmit: () => Promise<void>;
  onCancel: () => void;
}

/**
 * Custom hook for managing expense form with React Hook Form
 * 
 * @param props - Hook configuration
 * @returns Form object and handlers
 */
export function useExpenseForm({
  mode,
  expenseId,
  initialData,
  categories,
  onSuccess,
  onCancel,
}: UseExpenseFormProps): UseExpenseFormReturn {
  /**
   * Get default form values based on mode
   */
  const getDefaultValues = useCallback((): ExpenseFormValues => {
    if (mode === 'edit' && initialData) {
      return ExpenseFormTransformer.fromDTO(initialData);
    }
    
    // Get today's date in local timezone (not UTC)
    const today = new Date();
    const localDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    return {
      category_id: '',
      amount: '',
      expense_date: localDate,
      currency: 'PLN',
    };
  }, [mode, initialData]);

  /**
   * Initialize React Hook Form
   */
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: getDefaultValues(),
    mode: 'onBlur',
  });

  /**
   * Validate category exists in the list
   */
  const validateCategoryExists = useCallback(
    (categoryId: string): boolean => {
      const exists = categories.some((cat) => cat.id === categoryId);
      if (!exists) {
        form.setError('category_id', {
          message: 'Wybrana kategoria nie jest już dostępna.',
        });
        form.setError('root', {
          message: 'Wybrana kategoria nie jest już dostępna. Odśwież stronę i spróbuj ponownie.',
        });
        return false;
      }
      return true;
    },
    [categories, form]
  );

  /**
   * Check if form has changes (for edit mode)
   */
  const hasChanges = useCallback(
    (formData: ExpenseFormValues): boolean => {
      if (mode !== 'edit' || !initialData) return true;
      
      return (
        formData.category_id !== initialData.category_id ||
        formData.amount !== initialData.amount ||
        formData.expense_date !== initialData.expense_date ||
        formData.currency !== initialData.currency
      );
    },
    [mode, initialData]
  );

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    async (data: ExpenseFormValues) => {
      try {
        // Validate category exists
        if (!validateCategoryExists(data.category_id)) {
          return;
        }

        // Check for changes in edit mode
        if (!hasChanges(data)) {
          form.setError('root', {
            message: 'Nie wprowadzono żadnych zmian.',
          });
          return;
        }

        // Submit to API via service layer
        if (mode === 'add') {
          const command = ExpenseFormTransformer.toCreateCommand(data);
          await ExpenseMutationService.create(command);
        } else {
          if (!expenseId) {
            throw new Error('Expense ID is required for edit mode');
          }
          const command = ExpenseFormTransformer.toUpdateCommand(data);
          await ExpenseMutationService.update(expenseId, command);
        }

        // Handle success
        if (onSuccess) {
          onSuccess();
        } else {
          window.location.href = '/';
        }
      } catch (error) {
        console.error('Form submission error:', error);
        form.setError('root', {
          message: error instanceof Error ? error.message : 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie.',
        });
      }
    },
    [mode, expenseId, onSuccess, validateCategoryExists, hasChanges, form]
  );

  /**
   * Handle cancel action
   */
  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel();
    } else {
      window.location.href = '/';
    }
  }, [onCancel]);

  /**
   * Create submit handler that integrates with RHF
   */
  const onSubmit = useMemo(
    () => form.handleSubmit(handleSubmit),
    [form, handleSubmit]
  );

  return {
    form,
    onSubmit,
    onCancel: handleCancel,
  };
}