import type { ProfileDTO, APIErrorResponse } from '../types';

/**
 * Password change form data structure
 */
export type ChangePasswordFormData = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

/**
 * Password validation error messages
 */
export type PasswordValidationErrors = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  general?: string;
};

/**
 * Password change form state
 */
export type PasswordFormState = {
  formData: ChangePasswordFormData;
  errors: PasswordValidationErrors;
  isSubmitting: boolean;
  successMessage: string | null;
};

/**
 * Delete account modal state
 */
export type DeleteAccountModalState = {
  isOpen: boolean;
  confirmationText: string;
  isDeleting: boolean;
  error: string | null;
};

/**
 * Settings tab identifier
 */
export type SettingsTab = 'account' | 'security';

/**
 * Profile loading state
 */
export type ProfileState = {
  profile: ProfileDTO | null;
  isLoading: boolean;
  error: string | null;
};