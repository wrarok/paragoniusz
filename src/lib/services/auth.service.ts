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
      // Map specific errors to user-friendly messages
      if (error.message.includes('rate limit')) {
        return {
          success: false,
          error: 'Too many registration attempts. Please try again later.'
        };
      }

      if (error.message.includes('already registered') || error.message.includes('already exists')) {
        return {
          success: false,
          error: 'An account with this email already exists'
        };
      }

      // Generic error message
      return {
        success: false,
        error: error.message || 'Registration failed. Please try again.'
      };
    }

    if (!data.user) {
      return {
        success: false,
        error: 'Registration failed. Please try again.'
      };
    }

    return { success: true };
  } catch (error) {
    // Network or unexpected errors
    console.error('Registration error:', error);
    return {
      success: false,
      error: 'Unable to connect. Please check your internet connection.'
    };
  }
}

/**
 * Authenticates a user with email and password
 * @param email - User's email address
 * @param password - User's password
 * @param rememberMe - Whether to persist the session across browser sessions
 * @returns Promise with success status and optional error message
 */
export async function loginUser(
  email: string,
  password: string,
  rememberMe: boolean
): Promise<LoginResult> {
  try {
    // Note: Supabase automatically persists sessions in localStorage by default
    // The rememberMe parameter could be used to switch between localStorage and sessionStorage
    // For now, we'll use the default behavior (localStorage)
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      // Map specific errors to user-friendly messages
      if (error.message.includes('rate limit')) {
        return {
          success: false,
          error: 'Too many login attempts. Please try again later.'
        };
      }

      // Generic error message for security (don't reveal if email exists)
      return {
        success: false,
        error: 'Invalid email or password'
      };
    }

    if (!data.user || !data.session) {
      return {
        success: false,
        error: 'Invalid email or password'
      };
    }

    return { success: true };
  } catch (error) {
    // Network or unexpected errors
    console.error('Login error:', error);
    return {
      success: false,
      error: 'Unable to connect. Please check your internet connection.'
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
    const { error } = await supabaseClient.auth.signOut();
    
    if (error) {
      return {
        success: false,
        error: 'Failed to sign out. Please try again.'
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    return {
      success: false,
      error: 'Unable to sign out. Please try again.'
    };
  }
}