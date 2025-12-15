import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import type { PasswordInputProps } from "../../types/auth.types";

/**
 * Password input field component with show/hide toggle
 */
export function PasswordInput({
  value,
  error,
  showPassword,
  onChange,
  onBlur,
  onToggleVisibility,
  disabled,
}: PasswordInputProps) {
  const inputId = "password-input";
  const errorId = `${inputId}-error`;

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>Hasło</Label>
      <div className="relative">
        <Input
          id={inputId}
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          placeholder="Wprowadź swoje hasło"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={error ? "border-red-500 focus-visible:ring-red-500 pr-10" : "pr-10"}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
          onClick={onToggleVisibility}
          disabled={disabled}
          aria-label={showPassword ? "Ukryj hasło" : "Pokaż hasło"}
        >
          {showPassword ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}
        </Button>
      </div>
      {error && (
        <p id={errorId} className="text-sm text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
