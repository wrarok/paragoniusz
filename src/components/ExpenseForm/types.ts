import type { CategoryDTO, ExpenseDTO } from '@/types';

/**
 * Form mode - determines whether creating new or editing existing expense
 */
export type ExpenseFormMode = 'add' | 'edit';

/**
 * Form data structure - mirrors CreateExpenseCommand but keeps amount as string
 * for better input handling and validation
 */
export type ExpenseFormData = {
  category_id: string;
  amount: string; // String for input handling, converted to number for API
  expense_date: string; // YYYY-MM-DD format
  currency: string; // Defaults to 'PLN'
};

/**
 * Form validation errors - one error message per field plus global form error
 */
export type ExpenseFormErrors = {
  category_id?: string;
  amount?: string;
  expense_date?: string;
  currency?: string;
  _form?: string; // Global form-level error (e.g., API errors)
};

/**
 * Main form component props
 */
export type ExpenseFormProps = {
  mode: ExpenseFormMode;
  expenseId?: string; // Required in edit mode
  initialData?: ExpenseDTO; // Pre-filled data for edit mode
  categories: CategoryDTO[]; // Available categories from API
};

/**
 * Amount input component props
 */
export type AmountInputProps = {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
};

/**
 * Category select component props
 */
export type CategorySelectProps = {
  value: string;
  onChange: (value: string) => void;
  categories: CategoryDTO[];
  error?: string;
  disabled?: boolean;
};

/**
 * Date picker component props
 */
export type DatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  maxDate?: string;
};

/**
 * Form actions component props
 */
export type FormActionsProps = {
  mode: ExpenseFormMode;
  isSubmitting: boolean;
  onCancel: () => void;
};

/**
 * Error message component props
 */
export type FormErrorMessageProps = {
  message: string;
  fieldId?: string;
};