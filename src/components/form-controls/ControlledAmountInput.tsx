/**
 * Controlled Amount Input Component
 *
 * Reusable controlled number input component for React Hook Form.
 * Handles amount input with validation and error display.
 */

import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface ControlledAmountInputProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  onEdit?: () => void;
  label?: string;
  disabled?: boolean;
}

/**
 * Controlled amount input for React Hook Form
 *
 * @example
 * ```tsx
 * <ControlledAmountInput
 *   control={control}
 *   name="amount"
 *   onEdit={() => console.log('edited')}
 * />
 * ```
 */
export function ControlledAmountInput<T extends FieldValues>({
  control,
  name,
  onEdit,
  label = "Kwota (PLN)",
  disabled = false,
}: ControlledAmountInputProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <div className="space-y-2">
          <Label htmlFor={String(name)}>{label}</Label>
          <Input
            id={String(name)}
            type="number"
            step="0.01"
            min="0"
            value={field.value}
            onChange={(e) => {
              const value = parseFloat(e.target.value);
              field.onChange(isNaN(value) ? 0 : value);
              onEdit?.();
            }}
            onBlur={field.onBlur}
            aria-invalid={!!fieldState.error}
            className="w-full"
            disabled={disabled}
          />
          {fieldState.error && <p className="text-destructive text-sm mt-1">{fieldState.error.message}</p>}
        </div>
      )}
    />
  );
}
