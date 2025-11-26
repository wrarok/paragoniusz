import { Button } from '@/components/ui/button';
import type { FormActionsProps } from './types';

/**
 * FormActions Component
 * 
 * Action buttons for form submission and cancellation.
 * Handles loading states and provides clear visual feedback during form submission.
 * 
 * Features:
 * - Cancel button (secondary style) - navigates back
 * - Submit button (primary style) - submits form
 * - Loading spinner during submission
 * - Dynamic button text based on mode (Add/Save)
 * - Disabled state during submission
 * 
 * @param mode - Form mode (affects button text)
 * @param isSubmitting - Whether form is currently submitting
 * @param onCancel - Callback for cancel action
 */
export function FormActions({
  mode,
  isSubmitting,
  onCancel,
}: FormActionsProps) {
  const submitText = mode === 'add' ? 'Add Expense' : 'Save Changes';
  const submittingText = mode === 'add' ? 'Adding...' : 'Saving...';

  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        disabled={isSubmitting}
        className="w-full sm:w-auto"
      >
        Cancel
      </Button>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full sm:w-auto"
      >
        {isSubmitting ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin h-4 w-4"
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
            {submittingText}
          </span>
        ) : (
          submitText
        )}
      </Button>
    </div>
  );
}