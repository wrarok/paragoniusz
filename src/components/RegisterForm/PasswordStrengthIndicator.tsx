import { getPasswordStrengthLabel } from '../../lib/validation/register.validation';

/**
 * Password strength indicator props
 */
export type PasswordStrengthIndicatorProps = {
  strength: number; // 0-4 score
  password: string; // Current password value
};

/**
 * Visual password strength indicator
 * Displays a colored bar and label showing password strength
 */
export function PasswordStrengthIndicator({ strength, password }: PasswordStrengthIndicatorProps) {
  // Don't show indicator if password is empty
  if (!password) {
    return null;
  }

  const strengthColors = [
    'bg-destructive',      // 0: Very Weak (red)
    'bg-orange-500',       // 1: Weak (orange)
    'bg-yellow-500',       // 2: Fair (yellow)
    'bg-blue-500',         // 3: Strong (blue)
    'bg-green-500'         // 4: Very Strong (green)
  ];

  const strengthTextColors = [
    'text-destructive',
    'text-orange-500',
    'text-yellow-600',
    'text-blue-500',
    'text-green-500'
  ];

  const label = getPasswordStrengthLabel(strength);
  const colorClass = strengthColors[strength];
  const textColorClass = strengthTextColors[strength];
  const widthPercentage = ((strength + 1) / 5) * 100;

  return (
    <div className="space-y-2" aria-live="polite" aria-atomic="true">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Password strength:</span>
        <span className={`text-sm font-medium ${textColorClass}`}>
          {label}
        </span>
      </div>
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ease-in-out ${colorClass}`}
          style={{ width: `${widthPercentage}%` }}
          role="progressbar"
          aria-valuenow={strength}
          aria-valuemin={0}
          aria-valuemax={4}
          aria-label={`Password strength: ${label}`}
        />
      </div>
    </div>
  );
}