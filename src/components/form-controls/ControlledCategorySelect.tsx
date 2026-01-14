/**
 * Controlled Category Select Component
 *
 * Reusable controlled select component for React Hook Form.
 * Handles category selection with validation and error display.
 */

import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CategoryDTO } from "@/types";

interface ControlledCategorySelectProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  categories: CategoryDTO[];
  onEdit?: () => void;
  label?: string;
  disabled?: boolean;
}

/**
 * Controlled category select for React Hook Form
 *
 * @example
 * ```tsx
 * <ControlledCategorySelect
 *   control={control}
 *   name="category_id"
 *   categories={categories}
 *   onEdit={() => console.log('edited')}
 * />
 * ```
 */
export function ControlledCategorySelect<T extends FieldValues>({
  control,
  name,
  categories,
  onEdit,
  label = "Kategoria",
  disabled = false,
}: ControlledCategorySelectProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const handleValueChange = (value: string) => {
          field.onChange(value);
          // Use setTimeout to ensure the change is committed before marking as edited
          setTimeout(() => {
            onEdit?.();
          }, 0);
        };

        return (
          <div className="space-y-2">
            <Label htmlFor={String(name)}>{label}</Label>
            <Select value={field.value || undefined} onValueChange={handleValueChange} disabled={disabled}>
              <SelectTrigger id={String(name)} aria-invalid={!!fieldState.error} className="w-full">
                <SelectValue placeholder="Wybierz kategorię" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldState.error && <p className="text-destructive text-sm mt-1">{fieldState.error.message}</p>}
          </div>
        );
      }}
    />
  );
}
