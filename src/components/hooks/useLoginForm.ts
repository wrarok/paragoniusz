import { useState, useCallback, type FormEvent } from "react";
import type { LoginFormData, LoginValidationErrors, LoginFormProps } from "../../types/auth.types";
import {
  validateLoginForm,
  validateEmail,
  validatePassword,
  hasValidationErrors,
} from "../../lib/validation/login.validation";
import { loginUser } from "../../lib/services/auth.service";

/**
 * Custom hook for managing login form state and logic
 * @param props - Optional configuration props
 * @returns Form state and handlers
 */
export function useLoginForm(props?: LoginFormProps) {
  const { redirectTo = "/", onSuccess } = props || {};

  // Form state
  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
    rememberMe: false,
  });

  const [errors, setErrors] = useState<LoginValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  /**
   * Handles input field changes
   * Clears error for the field being edited
   */
  const handleInputChange = useCallback(
    (field: keyof LoginFormData, value: string | boolean) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));

      // Clear error for this field when user starts typing
      if (errors[field as keyof LoginValidationErrors]) {
        setErrors((prev) => ({
          ...prev,
          [field]: undefined,
        }));
      }
    },
    [errors]
  );

  /**
   * Handles field blur events for immediate validation feedback
   */
  const handleBlur = useCallback(
    (field: keyof LoginFormData) => {
      let error: string | undefined;

      if (field === "email") {
        error = validateEmail(formData.email);
      } else if (field === "password") {
        error = validatePassword(formData.password);
      }

      if (error) {
        setErrors((prev) => ({
          ...prev,
          [field]: error,
        }));
      }
    },
    [formData]
  );

  /**
   * Toggles password visibility
   */
  const togglePasswordVisibility = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  /**
   * Handles form submission
   */
  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();

      // Clear general error
      setErrors((prev) => ({ ...prev, general: undefined }));

      // Validate all fields
      const validationErrors = validateLoginForm(formData);

      if (hasValidationErrors(validationErrors)) {
        setErrors(validationErrors);

        // Focus first invalid field (only on client side)
        if (typeof window !== "undefined") {
          const firstErrorField = Object.keys(validationErrors)[0];
          const fieldElement = document.querySelector(`[name="${firstErrorField}"]`) as HTMLElement;
          fieldElement?.focus();
        }

        return;
      }

      // Submit form
      setIsSubmitting(true);

      try {
        const result = await loginUser(formData.email, formData.password);

        if (!result.success) {
          setErrors({
            general: result.error || "Login failed. Please try again.",
          });
          setIsSubmitting(false);
          return;
        }

        // Success - call callback if provided
        if (onSuccess) {
          onSuccess();
        }

        // Redirect to target page
        window.location.assign(redirectTo);
      } catch (error) {
        console.error("Login error:", error);
        setErrors({
          general: "An unexpected error occurred. Please try again.",
        });
        setIsSubmitting(false);
      }
    },
    [formData, redirectTo, onSuccess]
  );

  return {
    formData,
    errors,
    isSubmitting,
    showPassword,
    handleInputChange,
    handleBlur,
    handleSubmit,
    togglePasswordVisibility,
  };
}
