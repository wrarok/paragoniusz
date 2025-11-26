import { useId } from 'react';
import type { AmountInputProps } from './types';
import { FormErrorMessage } from './FormErrorMessage';

/**
 * AmountInput Component
 * 
 * Specialized input field for monetary amounts with real-time validation and formatting.
 * Handles both string and numeric input, enforces decimal precision, and provides
 * immediate feedback on invalid input.
 * 
 * Features:
 * - Numeric-only input with max 2 decimal places
 * - Real-time validation on blur
 * - Currency indicator (PLN)
 * - Auto-select text on focus for easy editing
 * - Accessible with proper ARIA attributes
 * 
 * @param value - Current amount value as string
 * @param onChange - Callback when value changes
 * @param onBlur - Optional callback for blur event
 * @param error - Error message to display
 * @param disabled - Whether input is disabled
 */
export function AmountInput({
  value,
  onChange,
  onBlur,
  error,
  disabled = false,
}: AmountInputProps) {
  const inputId = useId();
  const errorId = `${inputId}-error`;

  /**
   * Handles input change - allows only numeric input with max 2 decimals
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    // Allow empty value
    if (newValue === '') {
      onChange('');
      return;
    }

    // Allow only numbers and single decimal point
    // Regex: digits, optional decimal point, and up to 2 decimal places
    const regex = /^\d*\.?\d{0,2}$/;
    
    if (regex.test(newValue)) {
      onChange(newValue);
    }
  };

  /**
   * Handles focus - selects all text for easy editing
   */
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  /**
   * Handles blur - triggers validation
   */
  const handleBlur = () => {
    if (onBlur) {
      onBlur();
    }
  };

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-gray-900 dark:text-gray-100"
      >
        Amount <span className="text-red-600 dark:text-red-400">*</span>
      </label>
      
      <div className="relative">
        <input
          id={inputId}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          disabled={disabled}
          placeholder="0.00"
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={`
            w-full rounded-md border px-3 py-2 pr-12 text-sm
            transition-colors
            placeholder:text-gray-400 dark:placeholder:text-gray-500
            focus:outline-none focus:ring-2 focus:ring-offset-2
            disabled:cursor-not-allowed disabled:opacity-50
            ${
              error
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500 dark:border-red-400'
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600'
            }
            bg-white dark:bg-gray-800
            text-gray-900 dark:text-gray-100
          `}
        />
        
        {/* Currency indicator */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <span className="text-sm text-gray-500 dark:text-gray-400">PLN</span>
        </div>
      </div>

      {error && <FormErrorMessage message={error} fieldId={inputId} />}
    </div>
  );
}