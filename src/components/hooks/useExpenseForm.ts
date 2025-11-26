import { useState, useCallback, useEffect } from 'react';
import type { ExpenseFormData, ExpenseFormErrors, ExpenseFormMode } from '../ExpenseForm/types';
import type { CategoryDTO, ExpenseDTO, CreateExpenseCommand, UpdateExpenseCommand } from '@/types';
import {
  validateField,
  validateForm,
  convertAmountToNumber,
  convertAmountToString,
  EXPENSE_FORM_ERRORS,
} from '@/lib/validation/expense-form.validation';

/**
 * Props for useExpenseForm hook
 */
type UseExpenseFormProps = {
  mode: ExpenseFormMode;
  expenseId?: string;
  initialData?: ExpenseDTO;
  categories: CategoryDTO[];
  onSuccess?: () => void;
  onCancel?: () => void;
};

/**
 * Return type for useExpenseForm hook
 */
type UseExpenseFormReturn = {
  formData: ExpenseFormData;
  errors: ExpenseFormErrors;
  isSubmitting: boolean;
  isLoading: boolean;
  handleFieldChange: (field: keyof ExpenseFormData, value: string) => void;
  handleFieldBlur: (field: keyof ExpenseFormData) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  handleCancel: () => void;
  resetForm: () => void;
};

/**
 * Custom hook for managing expense form state and logic
 * 
 * Handles:
 * - Form state management
 * - Field-level and form-level validation
 * - API integration (create/update)
 * - Error handling
 * - Navigation after success
 * 
 * @param mode - Form mode (add or edit)
 * @param expenseId - Expense ID (required for edit mode)
 * @param initialData - Initial form data (for edit mode)
 * @param categories - Available categories
 * @param onSuccess - Callback on successful submission
 * @param onCancel - Callback on cancel
 */
export function useExpenseForm({
  mode,
  expenseId,
  initialData,
  categories,
  onSuccess,
  onCancel,
}: UseExpenseFormProps): UseExpenseFormReturn {
  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => new Date().toISOString().split('T')[0];

  // Initialize form data
  const getInitialFormData = (): ExpenseFormData => {
    if (mode === 'edit' && initialData) {
      return {
        category_id: initialData.category_id,
        amount: initialData.amount, // Already a string from API
        expense_date: initialData.expense_date,
        currency: initialData.currency,
      };
    }

    // Default for add mode
    return {
      category_id: '',
      amount: '',
      expense_date: getTodayDate(),
      currency: 'PLN',
    };
  };

  const [formData, setFormData] = useState<ExpenseFormData>(getInitialFormData);
  const [errors, setErrors] = useState<ExpenseFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Reset form to initial state
  const resetForm = useCallback(() => {
    setFormData(getInitialFormData());
    setErrors({});
    setIsSubmitting(false);
  }, [mode, initialData]);

  /**
   * Handles field value change
   * Clears field error when user starts typing
   */
  const handleFieldChange = useCallback(
    (field: keyof ExpenseFormData, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      
      // Clear field error when user starts typing
      if (errors[field]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    },
    [errors]
  );

  /**
   * Handles field blur - validates single field
   */
  const handleFieldBlur = useCallback((field: keyof ExpenseFormData) => {
    const value = formData[field];
    const error = validateField(field, value);

    if (error) {
      setErrors((prev) => ({ ...prev, [field]: error }));
    }
  }, [formData]);

  /**
   * Handles cancel action
   */
  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel();
    } else {
      // Default: navigate to dashboard
      window.location.href = '/';
    }
  }, [onCancel]);

  /**
   * Handles form submission
   */
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Clear previous errors
      setErrors({});

      // Validate all fields
      const validationErrors = validateForm(formData);
      if (validationErrors) {
        setErrors(validationErrors);
        
        // Focus first error field
        const firstErrorField = Object.keys(validationErrors)[0];
        const element = document.querySelector(`[name="${firstErrorField}"]`) as HTMLElement;
        element?.focus();
        
        return;
      }

      // Check if category exists in the list
      const categoryExists = categories.some((cat) => cat.id === formData.category_id);
      if (!categoryExists) {
        setErrors({
          category_id: EXPENSE_FORM_ERRORS.CATEGORY.INVALID,
          _form: 'Selected category is no longer available. Please refresh and try again.',
        });
        return;
      }

      // For edit mode, check if any changes were made
      if (mode === 'edit' && initialData) {
        const hasChanges =
          formData.category_id !== initialData.category_id ||
          formData.amount !== initialData.amount ||
          formData.expense_date !== initialData.expense_date ||
          formData.currency !== initialData.currency;

        if (!hasChanges) {
          setErrors({ _form: EXPENSE_FORM_ERRORS.FORM.NO_CHANGES });
          return;
        }
      }

      setIsSubmitting(true);

      try {
        if (mode === 'add') {
          // Create new expense
          const command: CreateExpenseCommand = {
            category_id: formData.category_id,
            amount: convertAmountToNumber(formData.amount),
            expense_date: formData.expense_date,
            currency: formData.currency,
          };

          const response = await fetch('/api/expenses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(command),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Failed to create expense');
          }
        } else {
          // Update existing expense
          if (!expenseId) {
            throw new Error('Expense ID is required for edit mode');
          }

          const command: UpdateExpenseCommand = {
            category_id: formData.category_id,
            amount: convertAmountToNumber(formData.amount),
            expense_date: formData.expense_date,
            currency: formData.currency,
          };

          const response = await fetch(`/api/expenses/${expenseId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(command),
          });

          if (!response.ok) {
            const errorData = await response.json();
            
            if (response.status === 404) {
              throw new Error('Expense not found. It may have been deleted.');
            }
            
            throw new Error(errorData.error?.message || 'Failed to update expense');
          }
        }

        // Success - call callback or navigate
        if (onSuccess) {
          onSuccess();
        } else {
          // Default: navigate to dashboard
          window.location.href = '/';
        }
      } catch (error) {
        console.error('Form submission error:', error);
        
        setErrors({
          _form: error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.',
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, categories, mode, expenseId, initialData, onSuccess]
  );

  return {
    formData,
    errors,
    isSubmitting,
    isLoading,
    handleFieldChange,
    handleFieldBlur,
    handleSubmit,
    handleCancel,
    resetForm,
  };
}