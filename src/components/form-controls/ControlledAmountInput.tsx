/**
 * Controlled Amount Input Component
 *
 * Reusable controlled number input component for React Hook Form.
 * Handles amount input with validation and error display.
 */

import { useState, useEffect } from "react";
import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
  type ControllerRenderProps,
  type FieldError,
} from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface ControlledAmountInputProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  onEdit?: () => void;
  label?: string;
  disabled?: boolean;
}

interface AmountInputProps<T extends FieldValues> {
  field: ControllerRenderProps<T, FieldPath<T>>;
  error?: FieldError;
  label: string;
  name: string;
  disabled: boolean;
  onEdit?: () => void;
}

/**
 * Internal amount input component with proper hook usage
 */
function AmountInput<T extends FieldValues>({ field, error, label, name, disabled, onEdit }: AmountInputProps<T>) {
  const [displayValue, setDisplayValue] = useState<string>(() => (field.value ? String(field.value) : ""));
  const [isFocused, setIsFocused] = useState(false);

  // Sync display value with field value when not focused
  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(field.value ? String(field.value) : "");
    }
  }, [field.value, isFocused]);

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        type="number"
        step="0.01"
        min="0"
        value={isFocused ? displayValue : (field.value ?? "")}
        onChange={(e) => {
          const inputValue = e.target.value;
          setDisplayValue(inputValue);

          // Parse and update field value
          const numValue = parseFloat(inputValue);
          field.onChange(inputValue === "" ? 0 : isNaN(numValue) ? 0 : numValue);
          onEdit?.();
        }}
        onFocus={() => {
          setIsFocused(true);
          setDisplayValue(field.value ? String(field.value) : "");
        }}
        onBlur={() => {
          setIsFocused(false);
          field.onBlur();
        }}
        aria-invalid={!!error}
        className="w-full"
        disabled={disabled}
      />
      {error && <p className="text-destructive text-sm mt-1">{error.message}</p>}
    </div>
  );
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
        <AmountInput
          field={field}
          error={fieldState.error}
          label={label}
          name={String(name)}
          disabled={disabled}
          onEdit={onEdit}
        />
      )}
    />
  );
}
