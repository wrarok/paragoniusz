import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import type { ConfirmPasswordInputProps } from '../../types/auth.types';
import { useId } from 'react';

/**
 * Confirm password input component with visibility toggle
 * Provides accessible password confirmation field with show/hide functionality
 */
export function ConfirmPasswordInput({
  value,
  error,
  showPassword,
  onChange,
  onBlur,
  onToggleVisibility,
  disabled = false
}: ConfirmPasswordInputProps) {
  const inputId = useId();
  const errorId = useId();

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>
        Confirm Password
      </Label>
      <div className="relative">
        <Input
          id={inputId}
          name="confirmPassword"
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={error ? 'border-destructive focus-visible:ring-destructive' : ''}
          placeholder="Re-enter your password"
          autoComplete="new-password"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
          onClick={onToggleVisibility}
          disabled={disabled}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          )}
        </Button>
      </div>
      {error && (
        <p
          id={errorId}
          className="text-sm text-destructive"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}
    </div>
  );
}