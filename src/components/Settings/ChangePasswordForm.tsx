import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useChangePassword } from "../hooks/useChangePassword";
import {
  validatePasswordForm,
  calculatePasswordStrength,
  getPasswordStrengthLabel,
  getPasswordStrengthColor,
} from "../../lib/validation/password.validation";
import type { PasswordFormState } from "../../types/settings.types";

/**
 * ChangePasswordForm - Form for changing user password
 * Includes validation, strength indicator, and Supabase Auth integration
 */
export function ChangePasswordForm() {
  const { changePassword } = useChangePassword();
  const [formState, setFormState] = useState<PasswordFormState>({
    formData: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    errors: {},
    isSubmitting: false,
    successMessage: null,
  });

  const passwordStrength = calculatePasswordStrength(formState.formData.newPassword);

  const handleInputChange = (field: keyof typeof formState.formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormState((prev) => ({
      ...prev,
      formData: {
        ...prev.formData,
        [field]: e.target.value,
      },
      errors: {
        ...prev.errors,
        [field]: undefined,
      },
      successMessage: null,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous messages
    setFormState((prev) => ({
      ...prev,
      errors: {},
      successMessage: null,
    }));

    // Validate form
    const validationErrors = validatePasswordForm(formState.formData);
    if (validationErrors) {
      setFormState((prev) => ({
        ...prev,
        errors: validationErrors,
      }));
      return;
    }

    // Submit password change
    setFormState((prev) => ({ ...prev, isSubmitting: true }));

    const result = await changePassword(formState.formData.newPassword);

    if (result.success) {
      setFormState({
        formData: {
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        },
        errors: {},
        isSubmitting: false,
        successMessage: "Password changed successfully",
      });
    } else {
      setFormState((prev) => ({
        ...prev,
        isSubmitting: false,
        errors: {
          general: result.error || "Failed to change password",
        },
      }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Success Message */}
      {formState.successMessage && (
        <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <AlertDescription className="text-green-800 dark:text-green-200">
            Hasło zostało pomyślnie zmienione
          </AlertDescription>
        </Alert>
      )}

      {/* General Error */}
      {formState.errors.general && (
        <Alert variant="destructive">
          <AlertDescription>{formState.errors.general}</AlertDescription>
        </Alert>
      )}

      {/* Current Password */}
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Aktualne hasło</Label>
        <Input
          id="currentPassword"
          type="password"
          value={formState.formData.currentPassword}
          onChange={handleInputChange("currentPassword")}
          disabled={formState.isSubmitting}
          className={formState.errors.currentPassword ? "border-red-500" : ""}
        />
        {formState.errors.currentPassword && <p className="text-sm text-red-500">{formState.errors.currentPassword}</p>}
      </div>

      {/* New Password */}
      <div className="space-y-2">
        <Label htmlFor="newPassword">Nowe hasło</Label>
        <Input
          id="newPassword"
          type="password"
          value={formState.formData.newPassword}
          onChange={handleInputChange("newPassword")}
          disabled={formState.isSubmitting}
          className={formState.errors.newPassword ? "border-red-500" : ""}
        />
        {formState.errors.newPassword && <p className="text-sm text-red-500">{formState.errors.newPassword}</p>}

        {/* Password Strength Indicator */}
        {formState.formData.newPassword && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${getPasswordStrengthColor(passwordStrength)}`}
                  style={{ width: `${(passwordStrength / 4) * 100}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground min-w-[60px]">
                {getPasswordStrengthLabel(passwordStrength)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Hasło musi mieć minimum 8 znaków, wielką literę, małą literę i cyfrę
            </p>
          </div>
        )}
      </div>

      {/* Confirm Password */}
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Potwierdź nowe hasło</Label>
        <Input
          id="confirmPassword"
          type="password"
          value={formState.formData.confirmPassword}
          onChange={handleInputChange("confirmPassword")}
          disabled={formState.isSubmitting}
          className={formState.errors.confirmPassword ? "border-red-500" : ""}
        />
        {formState.errors.confirmPassword && <p className="text-sm text-red-500">{formState.errors.confirmPassword}</p>}
      </div>

      {/* Submit Button */}
      <Button type="submit" disabled={formState.isSubmitting} className="w-full">
        {formState.isSubmitting ? "Zmiana hasła..." : "Zmień hasło"}
      </Button>
    </form>
  );
}
