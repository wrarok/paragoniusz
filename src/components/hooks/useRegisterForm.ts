import { useState, useCallback, useMemo, type FormEvent } from 'react';
import type { RegisterFormData, RegisterValidationErrors, RegisterFormProps } from '../../types/auth.types';
import {
  validateRegisterForm,
  validateEmail,
  validatePassword,
  validateConfirmPassword,
  hasValidationErrors,
  calculatePasswordStrength
} from '../../lib/validation/register.validation';
import { registerUser } from '../../lib/services/auth.service';

/**
 * Custom hook for managing register form state and logic
 * @param props - Optional configuration props
 * @returns Form state and handlers
 */
export function useRegisterForm(props?: RegisterFormProps) {
  const { redirectTo = '/', onSuccess } = props || {};

  // Form state
  const [formData, setFormData] = useState<RegisterFormData>({
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState<RegisterValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Calculate password strength
  const passwordStrength = useMemo(
    () => calculatePasswordStrength(formData.password),
    [formData.password]
  );

  /**
   * Handles input field changes
   * Clears error for the field being edited
   */
  const handleInputChange = useCallback((field: keyof RegisterFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error for this field when user starts typing
    if (errors[field as keyof RegisterValidationErrors]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }

    // Also clear confirmPassword error when password changes
    if (field === 'password' && errors.confirmPassword) {
      setErrors(prev => ({
        ...prev,
        confirmPassword: undefined
      }));
    }
  }, [errors]);

  /**
   * Handles field blur events for immediate validation feedback
   */
  const handleBlur = useCallback((field: keyof RegisterFormData) => {
    let error: string | undefined;

    if (field === 'email') {
      error = validateEmail(formData.email);
    } else if (field === 'password') {
      error = validatePassword(formData.password);
    } else if (field === 'confirmPassword') {
      error = validateConfirmPassword(formData.password, formData.confirmPassword);
    }

    if (error) {
      setErrors(prev => ({
        ...prev,
        [field]: error
      }));
    }
  }, [formData]);

  /**
   * Toggles password visibility
   */
  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  /**
   * Toggles confirm password visibility
   */
  const toggleConfirmPasswordVisibility = useCallback(() => {
    setShowConfirmPassword(prev => !prev);
  }, []);

  /**
   * Handles form submission
   */
  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();

    // Clear general error
    setErrors(prev => ({ ...prev, general: undefined }));

    // Validate all fields
    const validationErrors = validateRegisterForm(formData);

    if (hasValidationErrors(validationErrors)) {
      setErrors(validationErrors);
      
      // Focus first invalid field (only on client side)
      if (typeof window !== 'undefined') {
        const firstErrorField = Object.keys(validationErrors)[0];
        const fieldElement = document.querySelector(`[name="${firstErrorField}"]`) as HTMLElement;
        fieldElement?.focus();
      }
      
      return;
    }

    // Submit form
    setIsSubmitting(true);

    try {
      const result = await registerUser(
        formData.email,
        formData.password
      );

      if (!result.success) {
        setErrors({
          general: result.error || 'Registration failed. Please try again.'
        });
        setIsSubmitting(false);
        return;
      }

      // Success - call callback if provided
      if (onSuccess) {
        onSuccess();
      }

      // Redirect to target page
      window.location.href = redirectTo;
    } catch (error) {
      console.error('Registration error:', error);
      setErrors({
        general: 'An unexpected error occurred. Please try again.'
      });
      setIsSubmitting(false);
    }
  }, [formData, redirectTo, onSuccess]);

  return {
    formData,
    errors,
    isSubmitting,
    showPassword,
    showConfirmPassword,
    passwordStrength,
    handleInputChange,
    handleBlur,
    handleSubmit,
    togglePasswordVisibility,
    toggleConfirmPasswordVisibility
  };
}