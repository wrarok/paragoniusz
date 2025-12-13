/**
 * Controlled Date Input Component
 * 
 * Reusable controlled date input component for React Hook Form.
 * Handles date input with validation and error display.
 */

import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface ControlledDateInputProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label?: string;
  disabled?: boolean;
}

/**
 * Controlled date input for React Hook Form
 * 
 * @example
 * ```tsx
 * <ControlledDateInput
 *   control={control}
 *   name="receipt_date"
 *   label="Data paragonu"
 * />
 * ```
 */
export function ControlledDateInput<T extends FieldValues>({
  control,
  name,
  label = 'Data',
  disabled = false,
}: ControlledDateInputProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <div className="space-y-2">
          <Label htmlFor={String(name)}>{label}</Label>
          <Input
            id={String(name)}
            type="date"
            value={field.value ? field.value.split('T')[0] : ''}
            onChange={(e) => {
              const dateValue = e.target.value;
              if (dateValue) {
                // Keep date in YYYY-MM-DD format (required by API)
                field.onChange(dateValue);
              }
            }}
            onBlur={field.onBlur}
            aria-invalid={!!fieldState.error}
            className="w-full"
            disabled={disabled}
          />
          {fieldState.error && (
            <p className="text-destructive text-sm mt-1">
              {fieldState.error.message}
            </p>
          )}
        </div>
      )}
    />
  );
}