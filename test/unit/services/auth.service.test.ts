import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { registerUser, loginUser, logoutUser } from '@/lib/services/auth.service';

// Mock supabaseClient
vi.mock('@/db/supabase.client', () => ({
  supabaseClient: {
    auth: {
      signUp: vi.fn(),
      getSession: vi.fn(),
    },
  },
}));

// Import mocked supabaseClient after mock is defined
import { supabaseClient } from '@/db/supabase.client';

describe('AuthService', () => {
  // Save original fetch
  const originalFetch = global.fetch;

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original fetch
    global.fetch = originalFetch;
  });

  describe('registerUser', () => {
    it('should return success for valid credentials', async () => {
      // Mock successful registration
      vi.mocked(supabaseClient.auth.signUp).mockResolvedValue({
        data: {
          user: {
            id: '123',
            email: 'test@test.pl',
            aud: 'authenticated',
            role: 'authenticated',
            created_at: new Date().toISOString(),
          },
          session: null,
        },
        error: null,
      } as any);

      const result = await registerUser('test@test.pl', 'Password123!');

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(supabaseClient.auth.signUp).toHaveBeenCalledWith({
        email: 'test@test.pl',
        password: 'Password123!',
      });
    });

    it('should handle rate limiting', async () => {
      // Mock rate limit error
      vi.mocked(supabaseClient.auth.signUp).mockResolvedValue({
        data: {
          user: null,
          session: null,
        },
        error: {
          message: 'rate limit exceeded',
          status: 429,
        } as any,
      } as any);

      const result = await registerUser('test@test.pl', 'Password123!');

      expect(result.success).toBe(false);
      expect(result.error).toContain('prób rejestracji');
      expect(result.error).toContain('później');
    });

    it('should detect duplicate email', async () => {
      // Mock duplicate email error
      vi.mocked(supabaseClient.auth.signUp).mockResolvedValue({
        data: {
          user: null,
          session: null,
        },
        error: {
          message: 'User already registered',
          status: 400,
        } as any,
      } as any);

      const result = await registerUser('test@test.pl', 'Password123!');

      expect(result.success).toBe(false);
      expect(result.error).toContain('już istnieje');
    });

    it('should detect duplicate email with alternative wording', async () => {
      // Mock duplicate email with "already exists" message
      vi.mocked(supabaseClient.auth.signUp).mockResolvedValue({
        data: {
          user: null,
          session: null,
        },
        error: {
          message: 'Email already exists',
          status: 400,
        } as any,
      } as any);

      const result = await registerUser('test@test.pl', 'Password123!');

      expect(result.success).toBe(false);
      expect(result.error).toContain('już istnieje');
    });

    it('should handle network errors', async () => {
      // Mock network error by throwing
      vi.mocked(supabaseClient.auth.signUp).mockRejectedValue(
        new Error('Network error')
      );

      const result = await registerUser('test@test.pl', 'Password123!');

      expect(result.success).toBe(false);
      expect(result.error).toContain('połączenia');
      expect(result.error).toContain('internetowe');
    });

    it('should handle generic Supabase errors', async () => {
      // Mock generic error
      vi.mocked(supabaseClient.auth.signUp).mockResolvedValue({
        data: {
          user: null,
          session: null,
        },
        error: {
          message: 'Some other error',
          status: 500,
        } as any,
      } as any);

      const result = await registerUser('test@test.pl', 'Password123!');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Rejestracja nie powiodła się. Spróbuj ponownie.');
    });

    it('should handle missing user in successful response', async () => {
      // Mock response without user (edge case)
      vi.mocked(supabaseClient.auth.signUp).mockResolvedValue({
        data: {
          user: null,
          session: null,
        },
        error: null,
      } as any);

      const result = await registerUser('test@test.pl', 'Password123!');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Rejestracja nie powiodła się. Spróbuj ponownie.');
    });
  });

  describe('loginUser', () => {
    it('should return success for valid credentials', async () => {
      // Mock successful login
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          user: {
            id: '123',
            email: 'test@test.pl',
          },
        }),
      } as any);

      const result = await loginUser('test@test.pl', 'Password123!', true);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@test.pl',
          password: 'Password123!',
        }),
      });
    });

    it('should handle rate limiting', async () => {
      // Mock rate limit error
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          error: 'rate limit exceeded',
        }),
      } as any);

      const result = await loginUser('test@test.pl', 'Password123!', false);

      expect(result.success).toBe(false);
      expect(result.error).toContain('prób logowania');
      expect(result.error).toContain('później');
    });

    it('should return generic error for invalid credentials', async () => {
      // Mock invalid credentials
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          error: 'Invalid credentials',
        }),
      } as any);

      const result = await loginUser('test@test.pl', 'WrongPassword', false);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Nieprawidłowy email lub hasło');
    });

    it('should handle network errors', async () => {
      // Mock network error
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await loginUser('test@test.pl', 'Password123!', false);

      expect(result.success).toBe(false);
      expect(result.error).toContain('połączenia');
      expect(result.error).toContain('internetowe');
    });

    it('should handle missing user in response', async () => {
      // Mock response without user
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          user: null,
        }),
      } as any);

      const result = await loginUser('test@test.pl', 'Password123!', false);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Nieprawidłowy email lub hasło');
    });

    it('should pass rememberMe parameter', async () => {
      // Mock successful login
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          user: { id: '123' },
        }),
      } as any);

      // Test with rememberMe = true
      const result = await loginUser('test@test.pl', 'Password123!', true);
      expect(result.success).toBe(true);

      // Test with rememberMe = false
      const result2 = await loginUser('test@test.pl', 'Password123!', false);
      expect(result2.success).toBe(true);
    });

    it('should handle malformed JSON response', async () => {
      // Mock response that throws on json()
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      } as any);

      const result = await loginUser('test@test.pl', 'Password123!', false);

      expect(result.success).toBe(false);
      expect(result.error).toContain('połączenia');
    });
  });

  describe('logoutUser', () => {
    it('should return success on successful logout', async () => {
      // Mock successful logout
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
      } as any);

      const result = await logoutUser();

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/logout', {
        method: 'POST',
      });
    });

    it('should handle logout API errors', async () => {
      // Mock failed logout
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
      } as any);

      const result = await logoutUser();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Nie udało się wylogować. Spróbuj ponownie.');
    });

    it('should handle network errors during logout', async () => {
      // Mock network error
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await logoutUser();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Nie udało się wylogować. Spróbuj ponownie.');
    });

    it('should handle timeout errors', async () => {
      // Mock timeout error
      global.fetch = vi.fn().mockRejectedValue(new Error('Request timeout'));

      const result = await logoutUser();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Nie udało się wylogować. Spróbuj ponownie.');
    });
  });
});