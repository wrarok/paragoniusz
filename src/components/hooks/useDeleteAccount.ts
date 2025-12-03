/**
 * Custom hook for deleting user account
 * Calls DELETE /api/profiles/me and redirects to goodbye page
 */
export function useDeleteAccount() {
  const deleteAccount = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      // Call DELETE /api/profiles/me
      // Cookies are automatically sent with fetch request
      const response = await fetch('/api/profiles/me', {
        method: 'DELETE',
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Session expired, redirect to login
          window.location.href = '/login';
          return { success: false };
        }

        // Try to get error message from response
        try {
          const errorData = await response.json();
          return {
            success: false,
            error: errorData.error?.message || 'Nie udało się usunąć konta. Spróbuj ponownie.',
          };
        } catch {
          return {
            success: false,
            error: 'Nie udało się usunąć konta. Spróbuj ponownie.',
          };
        }
      }

      // Success - redirect to goodbye page
      // The endpoint handles logout and session cleanup
      window.location.href = '/goodbye';
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting account:', error);
      return {
        success: false,
        error: 'Nie udało się połączyć z serwerem. Sprawdź połączenie i spróbuj ponownie.',
      };
    }
  };

  return { deleteAccount };
}