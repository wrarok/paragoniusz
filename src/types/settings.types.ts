import type { ProfileDTO } from "../types";

/**
 * Password change form data structure
 */
export interface ChangePasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Password validation error messages
 */
export interface PasswordValidationErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  general?: string;
}

/**
 * Password change form state
 */
export interface PasswordFormState {
  formData: ChangePasswordFormData;
  errors: PasswordValidationErrors;
  isSubmitting: boolean;
  successMessage: string | null;
}

/**
 * Delete account modal state
 */
export interface DeleteAccountModalState {
  isOpen: boolean;
  confirmationText: string;
  isDeleting: boolean;
  error: string | null;
}

/**
 * Settings tab identifier
 */
export type SettingsTab = "account" | "security";

/**
 * Profile loading state
 */
export interface ProfileState {
  profile: ProfileDTO | null;
  isLoading: boolean;
  error: string | null;
}
