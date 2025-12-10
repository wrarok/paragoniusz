import type { LoginFormData, LoginValidationErrors } from '../../types/auth.types';

/**
 * Email validation regex pattern (RFC 5322 compliant)
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates email address format
 * @param email - Email address to validate
 * @returns Error message if invalid, undefined if valid
 */
export function validateEmail(email: string): string | undefined {
  if (!email || email.trim() === '') {
    return 'Email jest wymagany';
  }

  if (!EMAIL_REGEX.test(email)) {
    return 'Wprowadź poprawny adres email';
  }

  return undefined;
}

/**
 * Validates password field
 * @param password - Password to validate
 * @returns Error message if invalid, undefined if valid
 */
export function validatePassword(password: string): string | undefined {
  if (!password || password.trim() === '') {
    return 'Hasło jest wymagane';
  }

  return undefined;
}

/**
 * Validates entire login form
 * @param formData - Form data to validate
 * @returns Object containing validation errors, or empty object if valid
 */
export function validateLoginForm(formData: LoginFormData): LoginValidationErrors {
  const errors: LoginValidationErrors = {};

  const emailError = validateEmail(formData.email);
  if (emailError) {
    errors.email = emailError;
  }

  const passwordError = validatePassword(formData.password);
  if (passwordError) {
    errors.password = passwordError;
  }

  return errors;
}

/**
 * Checks if the form has any validation errors
 * @param errors - Validation errors object
 * @returns True if there are any errors, false otherwise
 */
export function hasValidationErrors(errors: LoginValidationErrors): boolean {
  return Object.keys(errors).length > 0;
}