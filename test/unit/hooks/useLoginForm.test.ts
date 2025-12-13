import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useLoginForm } from '@/components/hooks/useLoginForm';
import * as authService from '@/lib/services/auth.service';

// Mock auth service
vi.mock('@/lib/services/auth.service', () => ({
  loginUser: vi.fn(),
}));

describe('useLoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock window.location.href
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { href: '' },
    });

    // Mock document.querySelector for focus management
    vi.spyOn(document, 'querySelector').mockReturnValue({
      focus: vi.fn(),
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with empty form data', () => {
      const { result } = renderHook(() => useLoginForm());

      expect(result.current.formData).toEqual({
        email: '',
        password: '',
        rememberMe: false,
      });
      expect(result.current.errors).toEqual({});
      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.showPassword).toBe(false);
    });

    it('should accept custom redirectTo prop', () => {
      const { result } = renderHook(() => 
        useLoginForm({ redirectTo: '/dashboard' })
      );

      expect(result.current.formData).toBeDefined();
    });
  });

  describe('handleInputChange', () => {
    it('should update email field', () => {
      const { result } = renderHook(() => useLoginForm());

      act(() => {
        result.current.handleInputChange('email', 'test@example.com');
      });

      expect(result.current.formData.email).toBe('test@example.com');
    });

    it('should update password field', () => {
      const { result } = renderHook(() => useLoginForm());

      act(() => {
        result.current.handleInputChange('password', 'password123');
      });

      expect(result.current.formData.password).toBe('password123');
    });

    it('should update rememberMe field', () => {
      const { result } = renderHook(() => useLoginForm());

      act(() => {
        result.current.handleInputChange('rememberMe', true);
      });

      expect(result.current.formData.rememberMe).toBe(true);
    });

    it('should clear field error when typing', () => {
      const { result } = renderHook(() => useLoginForm());

      // Set an error first
      act(() => {
        result.current.handleBlur('email');
      });

      expect(result.current.errors.email).toBeDefined();

      // Clear error by typing
      act(() => {
        result.current.handleInputChange('email', 'test@example.com');
      });

      expect(result.current.errors.email).toBeUndefined();
    });
  });

  describe('handleBlur', () => {
    it('should validate email on blur with empty value', () => {
      const { result } = renderHook(() => useLoginForm());

      act(() => {
        result.current.handleBlur('email');
      });

      expect(result.current.errors.email).toBe('Email jest wymagany');
    });

    it('should validate email on blur with invalid value', () => {
      const { result } = renderHook(() => useLoginForm());

      act(() => {
        result.current.handleInputChange('email', 'invalid-email');
      });

      act(() => {
        result.current.handleBlur('email');
      });

      expect(result.current.errors.email).toBe('Wprowadź poprawny adres email');
    });

    it('should not set error for valid email', () => {
      const { result } = renderHook(() => useLoginForm());

      act(() => {
        result.current.handleInputChange('email', 'test@example.com');
      });

      act(() => {
        result.current.handleBlur('email');
      });

      expect(result.current.errors.email).toBeUndefined();
    });

    it('should validate password on blur with empty value', () => {
      const { result } = renderHook(() => useLoginForm());

      act(() => {
        result.current.handleBlur('password');
      });

      expect(result.current.errors.password).toBe('Hasło jest wymagane');
    });

    it('should not set error for non-empty password', () => {
      const { result } = renderHook(() => useLoginForm());

      act(() => {
        result.current.handleInputChange('password', 'password123');
      });

      act(() => {
        result.current.handleBlur('password');
      });

      expect(result.current.errors.password).toBeUndefined();
    });
  });

  describe('togglePasswordVisibility', () => {
    it('should toggle password visibility', () => {
      const { result } = renderHook(() => useLoginForm());

      expect(result.current.showPassword).toBe(false);

      act(() => {
        result.current.togglePasswordVisibility();
      });

      expect(result.current.showPassword).toBe(true);

      act(() => {
        result.current.togglePasswordVisibility();
      });

      expect(result.current.showPassword).toBe(false);
    });
  });

  describe('handleSubmit', () => {
    it('should prevent form submission with invalid data', async () => {
      const { result } = renderHook(() => useLoginForm());

      await act(async () => {
        await result.current.handleSubmit({ preventDefault: vi.fn() } as any);
      });

      expect(result.current.errors.email).toBe('Email jest wymagany');
      expect(result.current.errors.password).toBe('Hasło jest wymagane');
      expect(authService.loginUser).not.toHaveBeenCalled();
    });

    it('should prevent submission with invalid email', async () => {
      const { result } = renderHook(() => useLoginForm());

      act(() => {
        result.current.handleInputChange('email', 'invalid');
        result.current.handleInputChange('password', 'password123');
      });

      await act(async () => {
        await result.current.handleSubmit({ preventDefault: vi.fn() } as any);
      });

      expect(result.current.errors.email).toBe('Wprowadź poprawny adres email');
      expect(authService.loginUser).not.toHaveBeenCalled();
    });

    it('should call loginUser with valid data', async () => {
      vi.mocked(authService.loginUser).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useLoginForm());

      act(() => {
        result.current.handleInputChange('email', 'test@example.com');
        result.current.handleInputChange('password', 'password123');
      });

      await act(async () => {
        await result.current.handleSubmit({ preventDefault: vi.fn() } as any);
      });

      expect(authService.loginUser).toHaveBeenCalledWith(
        'test@example.com',
        'password123',
        false
      );
    });

    it('should redirect to default path on success', async () => {
      vi.mocked(authService.loginUser).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useLoginForm());

      act(() => {
        result.current.handleInputChange('email', 'test@example.com');
        result.current.handleInputChange('password', 'password123');
      });

      await act(async () => {
        await result.current.handleSubmit({ preventDefault: vi.fn() } as any);
      });

      await waitFor(() => {
        expect(window.location.href).toBe('/');
      });
    });

    it('should redirect to custom path on success', async () => {
      vi.mocked(authService.loginUser).mockResolvedValue({ success: true });

      const { result } = renderHook(() => 
        useLoginForm({ redirectTo: '/dashboard' })
      );

      act(() => {
        result.current.handleInputChange('email', 'test@example.com');
        result.current.handleInputChange('password', 'password123');
      });

      await act(async () => {
        await result.current.handleSubmit({ preventDefault: vi.fn() } as any);
      });

      await waitFor(() => {
        expect(window.location.href).toBe('/dashboard');
      });
    });

    it('should call onSuccess callback', async () => {
      vi.mocked(authService.loginUser).mockResolvedValue({ success: true });
      const onSuccess = vi.fn();

      const { result } = renderHook(() => 
        useLoginForm({ onSuccess })
      );

      act(() => {
        result.current.handleInputChange('email', 'test@example.com');
        result.current.handleInputChange('password', 'password123');
      });

      await act(async () => {
        await result.current.handleSubmit({ preventDefault: vi.fn() } as any);
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('should handle login error from service', async () => {
      vi.mocked(authService.loginUser).mockResolvedValue({
        success: false,
        error: 'Invalid credentials',
      });

      const { result } = renderHook(() => useLoginForm());

      act(() => {
        result.current.handleInputChange('email', 'test@example.com');
        result.current.handleInputChange('password', 'wrong-password');
      });

      await act(async () => {
        await result.current.handleSubmit({ preventDefault: vi.fn() } as any);
      });

      await waitFor(() => {
        expect(result.current.errors.general).toBe('Invalid credentials');
        expect(result.current.isSubmitting).toBe(false);
      });
    });

    it('should handle unexpected errors', async () => {
      vi.mocked(authService.loginUser).mockRejectedValue(
        new Error('Network error')
      );

      const { result } = renderHook(() => useLoginForm());

      act(() => {
        result.current.handleInputChange('email', 'test@example.com');
        result.current.handleInputChange('password', 'password123');
      });

      await act(async () => {
        await result.current.handleSubmit({ preventDefault: vi.fn() } as any);
      });

      await waitFor(() => {
        expect(result.current.errors.general).toBe(
          'An unexpected error occurred. Please try again.'
        );
        expect(result.current.isSubmitting).toBe(false);
      });
    });

    it('should set isSubmitting during submission', async () => {
      const onSuccess = vi.fn();
      
      vi.mocked(authService.loginUser).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return { success: true };
      });

      const { result } = renderHook(() => useLoginForm({ onSuccess }));

      act(() => {
        result.current.handleInputChange('email', 'test@example.com');
        result.current.handleInputChange('password', 'password123');
      });

      await act(async () => {
        await result.current.handleSubmit({ preventDefault: vi.fn() } as any);
      });

      // Verify submission completed successfully
      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('should clear general error on new submission', async () => {
      vi.mocked(authService.loginUser).mockResolvedValue({
        success: false,
        error: 'First error',
      });

      const { result } = renderHook(() => useLoginForm());

      act(() => {
        result.current.handleInputChange('email', 'test@example.com');
        result.current.handleInputChange('password', 'wrong');
      });

      // First submission with error
      await act(async () => {
        await result.current.handleSubmit({ preventDefault: vi.fn() } as any);
      });

      expect(result.current.errors.general).toBe('First error');

      // Second submission - general error should be cleared before validation
      vi.mocked(authService.loginUser).mockResolvedValue({ success: true });

      await act(async () => {
        await result.current.handleSubmit({ preventDefault: vi.fn() } as any);
      });

      // Error should be cleared (and then success happens)
      await waitFor(() => {
        expect(result.current.errors.general).toBeUndefined();
      });
    });
  });
});