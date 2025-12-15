/**
 * Custom hook for changing user password via API endpoint
 * Uses SSR client through API to ensure session access
 */
export function useChangePassword() {
  const changePassword = async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Call API endpoint which uses SSR client with access to session cookies
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific Supabase Auth errors with Polish messages
        if (data.error?.includes("session")) {
          return {
            success: false,
            error: "Twoja sesja wygasła. Zaloguj się ponownie.",
          };
        }

        if (data.error?.includes("weak") || data.error?.includes("password")) {
          return {
            success: false,
            error: "Hasło nie spełnia wymagań",
          };
        }

        return {
          success: false,
          error: "Nie udało się zmienić hasła. Spróbuj ponownie.",
        };
      }

      if (!data.user) {
        return {
          success: false,
          error: "Nie udało się zmienić hasła. Spróbuj ponownie.",
        };
      }

      return { success: true };
    } catch {
      return {
        success: false,
        error: "Nie udało się zmienić hasła. Sprawdź połączenie i spróbuj ponownie.",
      };
    }
  };

  return { changePassword };
}
