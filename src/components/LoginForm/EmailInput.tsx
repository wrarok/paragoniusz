import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EmailInputProps } from "../../types/auth.types";

/**
 * Email input field component with validation
 */
export function EmailInput({ value, error, onChange, onBlur, disabled }: EmailInputProps) {
  const inputId = "email-input";
  const errorId = `${inputId}-error`;

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>Email</Label>
      <Input
        id={inputId}
        name="email"
        type="email"
        autoComplete="email"
        placeholder="Wprowadź swój email"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        className={error ? "border-red-500 focus-visible:ring-red-500" : ""}
      />
      {error && (
        <p id={errorId} className="text-sm text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
