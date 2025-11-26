import { supabaseClient } from '../../db/supabase.client';

/**
 * Custom hook for deleting user account
 * Calls DELETE /api/profiles/me, signs out, and redirects to goodbye page
 */
export function useDeleteAccount() {
  const deleteAccount = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      // Get current session for authorization
      const { data: { session } } = await supabaseClient.auth.getSession();
      
      if (!session) {
        return {
          success: false,
          error: 'Your session has expired. Please log in again.',
        };
      }

      // Call DELETE /api/profiles/me
      const response = await fetch('/api/profiles/me', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Session expired, redirect to login
          window.location.href = '/login';
          return { success: false };
        }

        const errorData = await response.json();
        return {
          success: false,
          error: errorData.error?.message || 'Unable to delete account. Please try again or contact support.',
        };
      }

      // Success - clear session and redirect
      await supabaseClient.auth.signOut();
      window.location.href = '/goodbye';
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: 'Unable to delete account. Please check your connection and try again.',
      };
    }
  };

  return { deleteAccount };
}