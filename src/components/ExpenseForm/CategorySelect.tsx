import { useId } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CategorySelectProps } from "./types";
import { FormErrorMessage } from "./FormErrorMessage";

/**
 * CategorySelect Component
 *
 * Dropdown component for selecting expense category from predefined list.
 * Uses Shadcn/ui Select component for consistent styling and accessibility.
 * Displays category names with proper sorting.
 *
 * Features:
 * - Scrollable category list
 * - Search/filter capabilities (built into Radix Select)
 * - Keyboard navigation support
 * - Accessible with proper ARIA attributes
 * - Visual feedback for selected category
 *
 * @param value - Currently selected category ID
 * @param onChange - Callback when selection changes
 * @param categories - Array of available categories
 * @param error - Error message to display
 * @param disabled - Whether select is disabled
 */
export function CategorySelect({ value, onChange, categories, error, disabled = false }: CategorySelectProps) {
  const labelId = useId();
  const errorId = `${labelId}-error`;

  // Find selected category name for display
  const selectedCategory = categories.find((cat) => cat.id === value);

  return (
    <div className="space-y-1.5">
      <label
        htmlFor="category-select"
        id={labelId}
        className="block text-sm font-medium text-gray-900 dark:text-gray-100"
      >
        Kategoria <span className="text-red-600 dark:text-red-400">*</span>
      </label>

      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger
          id="category-select"
          className={`
            w-full
            ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500 dark:border-red-400" : ""}
          `}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          aria-labelledby={labelId}
        >
          <SelectValue placeholder="Wybierz kategorię">{selectedCategory?.name}</SelectValue>
        </SelectTrigger>

        <SelectContent>
          {categories.length === 0 ? (
            <div className="px-2 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Brak dostępnych kategorii
            </div>
          ) : (
            categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>

      {error && <FormErrorMessage message={error} fieldId={labelId} />}
    </div>
  );
}
