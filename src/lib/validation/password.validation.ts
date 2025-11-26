import { z } from 'zod';

/**
 * Password validation schema for change password form
 * Enforces security requirements for new passwords
 */
export const passwordValidationSchema = z.object({
  currentPassword: z
    .string()
    .min(1, 'Current password is required'),
  
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  
  confirmPassword: z
    .string()
    .min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
}).refine((data) => data.newPassword !== data.currentPassword, {
  message: 'New password must be different from current password',
  path: ['newPassword'],
});

/**
 * Type for validated password form data
 */
export type ValidatedPasswordData = z.infer<typeof passwordValidationSchema>;

/**
 * Validates password form data and returns errors
 * @param data - Form data to validate
 * @returns Object with field-specific errors or null if valid
 */
export function validatePasswordForm(data: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  general?: string;
} | null {
  try {
    passwordValidationSchema.parse(data);
    return null;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      
      error.errors.forEach((err) => {
        const field = err.path[0] as string;
        if (field && !errors[field]) {
          errors[field] = err.message;
        }
      });
      
      return errors;
    }
    
    return { general: 'Validation failed' };
  }
}

/**
 * Calculates password strength score (0-4)
 * @param password - Password to evaluate
 * @returns Strength score: 0 (very weak) to 4 (very strong)
 */
export function calculatePasswordStrength(password: string): number {
  if (!password) return 0;
  
  let strength = 0;
  
  // Length check
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  
  // Character variety checks
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;
  
  return Math.min(strength, 4);
}

/**
 * Gets password strength label
 * @param strength - Strength score (0-4)
 * @returns Human-readable strength label
 */
export function getPasswordStrengthLabel(strength: number): string {
  const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  return labels[strength] || 'Very Weak';
}

/**
 * Gets password strength color class
 * @param strength - Strength score (0-4)
 * @returns Tailwind color class
 */
export function getPasswordStrengthColor(strength: number): string {
  const colors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-yellow-500',
    'bg-lime-500',
    'bg-green-500',
  ];
  return colors[strength] || 'bg-red-500';
}