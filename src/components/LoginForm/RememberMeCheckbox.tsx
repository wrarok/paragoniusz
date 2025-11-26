import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { RememberMeCheckboxProps } from '../../types/auth.types';

/**
 * Remember me checkbox component for session persistence
 */
export function RememberMeCheckbox({ checked, onChange, disabled }: RememberMeCheckboxProps) {
  const checkboxId = 'remember-me-checkbox';

  return (
    <div className="flex items-center space-x-2">
      <Checkbox
        id={checkboxId}
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        aria-label="Remember me"
      />
      <Label
        htmlFor={checkboxId}
        className="text-sm font-normal cursor-pointer select-none"
      >
        Remember me
      </Label>
    </div>
  );
}