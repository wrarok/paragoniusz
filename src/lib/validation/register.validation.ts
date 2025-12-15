import type { RegisterFormData, RegisterValidationErrors } from "../../types/auth.types";

/**
 * Email validation regex pattern (RFC 5322 compliant)
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Password requirements:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 */
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

/**
 * Validates email address format
 * @param email - Email address to validate
 * @returns Error message if invalid, undefined if valid
 */
export function validateEmail(email: string): string | undefined {
  if (!email || email.trim() === "") {
    return "Email jest wymagany";
  }

  if (!EMAIL_REGEX.test(email)) {
    return "Wprowadź poprawny adres email";
  }

  return undefined;
}

/**
 * Validates password meets security requirements
 * @param password - Password to validate
 * @returns Error message if invalid, undefined if valid
 */
export function validatePassword(password: string): string | undefined {
  if (!password || password.trim() === "") {
    return "Hasło jest wymagane";
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Hasło musi mieć minimum ${PASSWORD_MIN_LENGTH} znaków`;
  }

  if (!PASSWORD_REGEX.test(password)) {
    return "Hasło musi zawierać wielką literę, małą literę i cyfrę";
  }

  return undefined;
}

/**
 * Validates password confirmation matches password
 * @param password - Original password
 * @param confirmPassword - Password confirmation
 * @returns Error message if invalid, undefined if valid
 */
export function validateConfirmPassword(password: string, confirmPassword: string): string | undefined {
  if (!confirmPassword || confirmPassword.trim() === "") {
    return "Potwierdź swoje hasło";
  }

  if (password !== confirmPassword) {
    return "Hasła nie pasują do siebie";
  }

  return undefined;
}

/**
 * Validates entire register form
 * @param formData - Form data to validate
 * @returns Object containing validation errors, or empty object if valid
 */
export function validateRegisterForm(formData: RegisterFormData): RegisterValidationErrors {
  const errors: RegisterValidationErrors = {};

  const emailError = validateEmail(formData.email);
  if (emailError) {
    errors.email = emailError;
  }

  const passwordError = validatePassword(formData.password);
  if (passwordError) {
    errors.password = passwordError;
  }

  const confirmPasswordError = validateConfirmPassword(formData.password, formData.confirmPassword);
  if (confirmPasswordError) {
    errors.confirmPassword = confirmPasswordError;
  }

  return errors;
}

/**
 * Checks if the form has any validation errors
 * @param errors - Validation errors object
 * @returns True if there are any errors, false otherwise
 */
export function hasValidationErrors(errors: RegisterValidationErrors): boolean {
  return Object.keys(errors).length > 0;
}

/**
 * Calculates password strength score (0-4)
 * @param password - Password to evaluate
 * @returns Strength score: 0 (weak) to 4 (very strong)
 */
export function calculatePasswordStrength(password: string): number {
  if (!password) return 0;

  let strength = 0;

  // Length check
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;

  // Character variety checks
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
  if (/\d/.test(password)) strength++;
  if (/[^a-zA-Z0-9]/.test(password)) strength++;

  return Math.min(strength, 4);
}

/**
 * Gets password strength label
 * @param strength - Strength score (0-4)
 * @returns Human-readable strength label
 */
export function getPasswordStrengthLabel(strength: number): string {
  const labels = ["Bardzo słabe", "Słabe", "Średnie", "Silne", "Bardzo silne"];
  return labels[strength] || "Bardzo słabe";
}
