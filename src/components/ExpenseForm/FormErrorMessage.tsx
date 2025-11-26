import type { FormErrorMessageProps } from './types';

/**
 * FormErrorMessage Component
 * 
 * Reusable component for displaying inline validation error messages.
 * Provides consistent styling and accessibility attributes for error messages
 * across all form fields.
 * 
 * @param message - Error message to display
 * @param fieldId - Optional field ID for aria-describedby association
 */
export function FormErrorMessage({ message, fieldId }: FormErrorMessageProps) {
  if (!message) {
    return null;
  }

  return (
    <p
      id={fieldId ? `${fieldId}-error` : undefined}
      className="mt-1.5 text-sm text-red-600 dark:text-red-400"
      role="alert"
      aria-live="polite"
    >
      {message}
    </p>
  );
}