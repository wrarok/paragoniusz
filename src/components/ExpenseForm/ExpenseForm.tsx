import type { ExpenseFormProps } from './types';
import { useExpenseForm } from '../hooks/useExpenseForm';
import { AmountInput } from './AmountInput';
import { CategorySelect } from './CategorySelect';
import { DatePicker } from './DatePicker';
import { FormActions } from './FormActions';

/**
 * ExpenseForm Component - React Hook Form Version
 * 
 * Main form component using React Hook Form for state management.
 * Supports both add and edit modes with validation and API integration.
 * 
 * **Refactored to use React Hook Form**
 * - Simplified state management
 * - Automatic validation with Zod
 * - Service layer for API calls
 * 
 * @param mode - Form mode (add or edit)
 * @param expenseId - Expense ID (required for edit mode)
 * @param initialData - Pre-filled data for edit mode
 * @param categories - Available categories from API
 */
export function ExpenseForm({
  mode,
  expenseId,
  initialData,
  categories,
}: ExpenseFormProps) {
  const { form, onSubmit, onCancel } = useExpenseForm({
    mode,
    expenseId,
    initialData,
    categories,
  });

  const { formState } = form;
  const { errors, isSubmitting } = formState;

  // Watch form values for controlled inputs
  const formData = form.watch();

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      {/* Global form error */}
      {errors.root && (
        <div
          className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4"
          role="alert"
        >
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400 dark:text-red-500"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                {errors.root.message}
              </h3>
            </div>
          </div>
        </div>
      )}

      {/* Form fields */}
      <div className="space-y-4">
        {/* Amount field */}
        <AmountInput
          value={formData.amount || ''}
          onChange={(value) => form.setValue('amount', value)}
          onBlur={() => form.trigger('amount')}
          error={errors.amount?.message}
          disabled={isSubmitting}
        />

        {/* Category field */}
        <CategorySelect
          value={formData.category_id || ''}
          onChange={(value) => form.setValue('category_id', value)}
          categories={categories}
          error={errors.category_id?.message}
          disabled={isSubmitting}
        />

        {/* Date field */}
        <DatePicker
          value={formData.expense_date || ''}
          onChange={(value) => form.setValue('expense_date', value)}
          error={errors.expense_date?.message}
          disabled={isSubmitting}
        />
      </div>

      {/* Form actions */}
      <FormActions
        mode={mode}
        isSubmitting={isSubmitting}
        onCancel={onCancel}
      />

      {/* Loading overlay */}
      {isSubmitting && (
        <div
          className="fixed inset-0 bg-black/20 dark:bg-black/40 z-50 flex items-center justify-center"
          aria-live="assertive"
          aria-busy="true"
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <svg
                className="animate-spin h-6 w-6 text-blue-600 dark:text-blue-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {mode === 'add' ? 'Tworzenie wydatku...' : 'Zapisywanie zmian...'}
              </span>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}