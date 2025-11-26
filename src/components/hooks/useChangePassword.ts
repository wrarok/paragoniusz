import { supabaseClient } from '../../db/supabase.client';

/**
 * Custom hook for changing user password via Supabase Auth
 * Uses supabase.auth.updateUser() to change the password
 */
export function useChangePassword() {
  const changePassword = async (
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabaseClient.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        // Handle specific Supabase Auth errors
        if (error.message.includes('session')) {
          return {
            success: false,
            error: 'Your session has expired. Please log in again.',
          };
        }

        if (error.message.includes('weak') || error.message.includes('password')) {
          return {
            success: false,
            error: 'Password does not meet requirements',
          };
        }

        return {
          success: false,
          error: error.message || 'Unable to change password. Please try again.',
        };
      }

      if (!data.user) {
        return {
          success: false,
          error: 'Unable to change password. Please try again.',
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: 'Unable to change password. Please check your connection and try again.',
      };
    }
  };

  return { changePassword };
}