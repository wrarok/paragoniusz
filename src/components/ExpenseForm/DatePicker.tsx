import { useId } from 'react';
import type { DatePickerProps } from './types';
import { FormErrorMessage } from './FormErrorMessage';
import { isDateOlderThanOneYear, EXPENSE_FORM_ERRORS } from '@/lib/validation/expense-form.validation';

/**
 * DatePicker Component
 * 
 * Date input component with validation to prevent future dates.
 * Uses native HTML5 date input for better mobile experience and automatic
 * date formatting. Provides clear visual feedback for invalid dates.
 * 
 * Features:
 * - Native date picker (mobile-optimized)
 * - Prevents future date selection
 * - Shows warning for dates > 1 year old (non-blocking)
 * - Automatic date format (YYYY-MM-DD)
 * - Accessible with proper ARIA attributes
 * 
 * @param value - Current date value (YYYY-MM-DD)
 * @param onChange - Callback when date changes
 * @param error - Error message to display
 * @param disabled - Whether input is disabled
 * @param maxDate - Maximum allowed date (defaults to today)
 */
export function DatePicker({
  value,
  onChange,
  error,
  disabled = false,
  maxDate,
}: DatePickerProps) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const warningId = `${inputId}-warning`;

  // Calculate max date (today) if not provided
  const today = new Date().toISOString().split('T')[0];
  const maxDateValue = maxDate || today;

  // Check if date is older than 1 year (warning, not error)
  const showOldDateWarning = value && !error && isDateOlderThanOneYear(value);

  /**
   * Handles date change
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-gray-900 dark:text-gray-100"
      >
        Date <span className="text-red-600 dark:text-red-400">*</span>
      </label>

      <input
        id={inputId}
        type="date"
        value={value}
        onChange={handleChange}
        disabled={disabled}
        max={maxDateValue}
        aria-invalid={!!error}
        aria-describedby={
          error ? errorId : showOldDateWarning ? warningId : undefined
        }
        className={`
          w-full rounded-md border px-3 py-2 text-sm
          transition-colors
          focus:outline-none focus:ring-2 focus:ring-offset-2
          disabled:cursor-not-allowed disabled:opacity-50
          ${
            error
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500 dark:border-red-400'
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600'
          }
          bg-white dark:bg-gray-800
          text-gray-900 dark:text-gray-100
          [&::-webkit-calendar-picker-indicator]:cursor-pointer
          [&::-webkit-calendar-picker-indicator]:dark:invert
        `}
      />

      {error && <FormErrorMessage message={error} fieldId={inputId} />}

      {/* Warning for old dates (non-blocking) */}
      {showOldDateWarning && (
        <p
          id={warningId}
          className="mt-1.5 text-sm text-amber-600 dark:text-amber-400"
          role="status"
          aria-live="polite"
        >
          ⚠️ {EXPENSE_FORM_ERRORS.DATE.OLD_WARNING}
        </p>
      )}
    </div>
  );
}