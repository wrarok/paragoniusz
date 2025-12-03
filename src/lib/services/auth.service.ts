import { supabaseClient } from '../../db/supabase.client';

/**
 * Login service response type
 */
export type LoginResult = {
  success: boolean;
  error?: string;
};

/**
 * Register service response type
 */
export type RegisterResult = {
  success: boolean;
  error?: string;
};

/**
 * Registers a new user with email and password
 * @param email - User's email address
 * @param password - User's password
 * @returns Promise with success status and optional error message
 */
export async function registerUser(
  email: string,
  password: string
): Promise<RegisterResult> {
  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password
    });

    if (error) {
      // Map specific errors to user-friendly messages in Polish
      if (error.message.includes('rate limit')) {
        return {
          success: false,
          error: 'Zbyt wiele prób rejestracji. Spróbuj ponownie później.'
        };
      }

      if (error.message.includes('already registered') || error.message.includes('already exists')) {
        return {
          success: false,
          error: 'Konto z tym adresem email już istnieje'
        };
      }

      // Generic error message
      return {
        success: false,
        error: 'Rejestracja nie powiodła się. Spróbuj ponownie.'
      };
    }

    if (!data.user) {
      return {
        success: false,
        error: 'Rejestracja nie powiodła się. Spróbuj ponownie.'
      };
    }

    return { success: true };
  } catch (error) {
    // Network or unexpected errors
    console.error('Registration error:', error);
    return {
      success: false,
      error: 'Brak połączenia. Sprawdź połączenie internetowe.'
    };
  }
}

/**
 * Authenticates a user with email and password
 *
 * @param email - User's email address
 * @param password - User's password
 * @param rememberMe - Whether to persist the session (currently uses localStorage by default)
 * @returns Promise with success status and optional error message
 */
export async function loginUser(
  email: string,
  password: string,
  rememberMe: boolean
): Promise<LoginResult> {
  try {
    // Call API endpoint which uses SSR client to set session in cookies
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Map specific errors to user-friendly messages in Polish
      if (data.error?.includes('rate limit')) {
        return {
          success: false,
          error: 'Zbyt wiele prób logowania. Spróbuj ponownie później.'
        };
      }

      // Generic error message for security (don't reveal if email exists)
      return {
        success: false,
        error: 'Nieprawidłowy email lub hasło'
      };
    }

    if (!data.user) {
      return {
        success: false,
        error: 'Nieprawidłowy email lub hasło'
      };
    }

    return { success: true };
  } catch (error) {
    // Network or unexpected errors
    console.error('Login error:', error);
    return {
      success: false,
      error: 'Brak połączenia. Sprawdź połączenie internetowe.'
    };
  }
}

/**
 * Checks if a user is currently authenticated
 * @returns Promise with the current session or null
 */
export async function getCurrentSession() {
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    return session;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

/**
 * Signs out the current user
 * @returns Promise with success status
 */
export async function logoutUser(): Promise<LoginResult> {
  try {
    // Call API endpoint which uses SSR client to clear session cookies
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
    });

    if (!response.ok) {
      return {
        success: false,
        error: 'Nie udało się wylogować. Spróbuj ponownie.'
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    return {
      success: false,
      error: 'Nie udało się wylogować. Spróbuj ponownie.'
    };
  }
}