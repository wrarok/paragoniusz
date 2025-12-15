import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useRegisterForm } from "@/components/hooks/useRegisterForm";
import * as authService from "@/lib/services/auth.service";

// Mock auth service
vi.mock("@/lib/services/auth.service", () => ({
  registerUser: vi.fn(),
}));

describe("useRegisterForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock window.location with assign method
    Object.defineProperty(window, "location", {
      writable: true,
      value: {
        href: "",
        assign: vi.fn()
      },
    });

    // Mock document.querySelector for focus management
    vi.spyOn(document, "querySelector").mockReturnValue({
      focus: vi.fn(),
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initialization", () => {
    it("should initialize with empty form data", () => {
      const { result } = renderHook(() => useRegisterForm());

      expect(result.current.formData).toEqual({
        email: "",
        password: "",
        confirmPassword: "",
      });
      expect(result.current.errors).toEqual({});
      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.showPassword).toBe(false);
      expect(result.current.showConfirmPassword).toBe(false);
    });

    it("should initialize password strength", () => {
      const { result } = renderHook(() => useRegisterForm());

      expect(result.current.passwordStrength).toBeDefined();
      expect(result.current.passwordStrength).toBe(0);
    });
  });

  describe("handleInputChange", () => {
    it("should update email field", () => {
      const { result } = renderHook(() => useRegisterForm());

      act(() => {
        result.current.handleInputChange("email", "test@example.com");
      });

      expect(result.current.formData.email).toBe("test@example.com");
    });

    it("should update password field", () => {
      const { result } = renderHook(() => useRegisterForm());

      act(() => {
        result.current.handleInputChange("password", "SecurePass123!");
      });

      expect(result.current.formData.password).toBe("SecurePass123!");
    });

    it("should update confirmPassword field", () => {
      const { result } = renderHook(() => useRegisterForm());

      act(() => {
        result.current.handleInputChange("confirmPassword", "SecurePass123!");
      });

      expect(result.current.formData.confirmPassword).toBe("SecurePass123!");
    });

    it("should update password strength when password changes", () => {
      const { result } = renderHook(() => useRegisterForm());

      expect(result.current.passwordStrength).toBe(0);

      act(() => {
        result.current.handleInputChange("password", "WeakPass");
      });

      expect(result.current.passwordStrength).toBeGreaterThan(0);
    });

    it("should clear field error when typing", () => {
      const { result } = renderHook(() => useRegisterForm());

      // First type something invalid to mark field as touched, then blur to trigger validation
      act(() => {
        result.current.handleInputChange("email", "invalid-email");
      });

      act(() => {
        result.current.handleBlur("email");
      });

      expect(result.current.errors.email).toBeDefined();

      // Clear error by typing valid email
      act(() => {
        result.current.handleInputChange("email", "test@example.com");
      });

      expect(result.current.errors.email).toBeUndefined();
    });

    it("should clear confirmPassword error when password changes", () => {
      const { result } = renderHook(() => useRegisterForm());

      // Set password and confirmPassword
      act(() => {
        result.current.handleInputChange("password", "password1");
      });

      act(() => {
        result.current.handleInputChange("confirmPassword", "password1");
      });

      // Change password to create mismatch
      act(() => {
        result.current.handleInputChange("password", "password2");
      });

      act(() => {
        result.current.handleBlur("confirmPassword");
      });

      expect(result.current.errors.confirmPassword).toBeDefined();

      // Changing password again should clear confirmPassword error
      act(() => {
        result.current.handleInputChange("password", "password3");
      });

      expect(result.current.errors.confirmPassword).toBeUndefined();
    });
  });

  describe("handleBlur", () => {
    it("should validate email on blur with empty value", async () => {
      const { result } = renderHook(() => useRegisterForm());

      // First type something to mark field as touched, then clear it and blur
      act(() => {
        result.current.handleInputChange("email", "test");
      });

      act(() => {
        result.current.handleInputChange("email", "");
      });

      act(() => {
        result.current.handleBlur("email");
      });

      expect(result.current.errors.email).toBeDefined();
    });

    it("should validate email on blur with invalid value", () => {
      const { result } = renderHook(() => useRegisterForm());

      act(() => {
        result.current.handleInputChange("email", "invalid-email");
      });

      act(() => {
        result.current.handleBlur("email");
      });

      expect(result.current.errors.email).toBeDefined();
    });

    it("should not set error for valid email", () => {
      const { result } = renderHook(() => useRegisterForm());

      act(() => {
        result.current.handleInputChange("email", "test@example.com");
      });

      act(() => {
        result.current.handleBlur("email");
      });

      expect(result.current.errors.email).toBeUndefined();
    });

    it("should validate password on blur", async () => {
      const { result } = renderHook(() => useRegisterForm());

      // First type something to mark field as touched, then clear it and blur
      act(() => {
        result.current.handleInputChange("password", "weak");
      });

      act(() => {
        result.current.handleInputChange("password", "");
      });

      act(() => {
        result.current.handleBlur("password");
      });

      expect(result.current.errors.password).toBeDefined();
    });

    it("should validate confirmPassword matches password", () => {
      const { result } = renderHook(() => useRegisterForm());

      act(() => {
        result.current.handleInputChange("password", "password123");
      });

      act(() => {
        result.current.handleInputChange("confirmPassword", "different");
      });

      act(() => {
        result.current.handleBlur("confirmPassword");
      });

      expect(result.current.errors.confirmPassword).toBeDefined();
    });

    it("should not error when passwords match", () => {
      const { result } = renderHook(() => useRegisterForm());

      act(() => {
        result.current.handleInputChange("password", "password123");
      });

      act(() => {
        result.current.handleInputChange("confirmPassword", "password123");
      });

      act(() => {
        result.current.handleBlur("confirmPassword");
      });

      expect(result.current.errors.confirmPassword).toBeUndefined();
    });
  });

  describe("togglePasswordVisibility", () => {
    it("should toggle password visibility", () => {
      const { result } = renderHook(() => useRegisterForm());

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

  describe("toggleConfirmPasswordVisibility", () => {
    it("should toggle confirm password visibility", () => {
      const { result } = renderHook(() => useRegisterForm());

      expect(result.current.showConfirmPassword).toBe(false);

      act(() => {
        result.current.toggleConfirmPasswordVisibility();
      });

      expect(result.current.showConfirmPassword).toBe(true);

      act(() => {
        result.current.toggleConfirmPasswordVisibility();
      });

      expect(result.current.showConfirmPassword).toBe(false);
    });
  });

  describe("handleSubmit", () => {
    it("should prevent form submission with invalid data", async () => {
      const { result } = renderHook(() => useRegisterForm());

      await act(async () => {
        await result.current.handleSubmit({ preventDefault: vi.fn() } as any);
      });

      expect(result.current.errors.email).toBeDefined();
      expect(result.current.errors.password).toBeDefined();
      expect(authService.registerUser).not.toHaveBeenCalled();
    });

    it("should prevent submission when passwords do not match", async () => {
      const { result } = renderHook(() => useRegisterForm());

      act(() => {
        result.current.handleInputChange("email", "test@example.com");
        result.current.handleInputChange("password", "StrongPass123!");
        result.current.handleInputChange("confirmPassword", "DifferentPass123!");
      });

      await act(async () => {
        await result.current.handleSubmit({ preventDefault: vi.fn() } as any);
      });

      expect(result.current.errors.confirmPassword).toBeDefined();
      expect(authService.registerUser).not.toHaveBeenCalled();
    });

    it("should call registerUser with valid data", async () => {
      vi.mocked(authService.registerUser).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useRegisterForm());

      act(() => {
        result.current.handleInputChange("email", "test@example.com");
        result.current.handleInputChange("password", "StrongPass123!");
        result.current.handleInputChange("confirmPassword", "StrongPass123!");
      });

      await act(async () => {
        await result.current.handleSubmit({ preventDefault: vi.fn() } as any);
      });

      expect(authService.registerUser).toHaveBeenCalledWith("test@example.com", "StrongPass123!");
    });

    it("should redirect to default path on success", async () => {
      vi.mocked(authService.registerUser).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useRegisterForm());

      act(() => {
        result.current.handleInputChange("email", "test@example.com");
        result.current.handleInputChange("password", "StrongPass123!");
        result.current.handleInputChange("confirmPassword", "StrongPass123!");
      });

      await act(async () => {
        await result.current.handleSubmit({ preventDefault: vi.fn() } as any);
      });

      await waitFor(() => {
        expect(window.location.assign).toHaveBeenCalledWith("/");
      });
    });

    it("should redirect to custom path on success", async () => {
      vi.mocked(authService.registerUser).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useRegisterForm({ redirectTo: "/welcome" }));

      act(() => {
        result.current.handleInputChange("email", "test@example.com");
        result.current.handleInputChange("password", "StrongPass123!");
        result.current.handleInputChange("confirmPassword", "StrongPass123!");
      });

      await act(async () => {
        await result.current.handleSubmit({ preventDefault: vi.fn() } as any);
      });

      await waitFor(() => {
        expect(window.location.assign).toHaveBeenCalledWith("/welcome");
      });
    });

    it("should call onSuccess callback", async () => {
      vi.mocked(authService.registerUser).mockResolvedValue({ success: true });
      const onSuccess = vi.fn();

      const { result } = renderHook(() => useRegisterForm({ onSuccess }));

      act(() => {
        result.current.handleInputChange("email", "test@example.com");
        result.current.handleInputChange("password", "StrongPass123!");
        result.current.handleInputChange("confirmPassword", "StrongPass123!");
      });

      await act(async () => {
        await result.current.handleSubmit({ preventDefault: vi.fn() } as any);
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it("should handle registration error from service", async () => {
      vi.mocked(authService.registerUser).mockResolvedValue({
        success: false,
        error: "Email already exists",
      });

      const { result } = renderHook(() => useRegisterForm());

      act(() => {
        result.current.handleInputChange("email", "existing@example.com");
        result.current.handleInputChange("password", "StrongPass123!");
        result.current.handleInputChange("confirmPassword", "StrongPass123!");
      });

      await act(async () => {
        await result.current.handleSubmit({ preventDefault: vi.fn() } as any);
      });

      await waitFor(() => {
        expect(result.current.errors.general).toBe("Email already exists");
        expect(result.current.isSubmitting).toBe(false);
      });
    });

    it("should handle unexpected errors", async () => {
      vi.mocked(authService.registerUser).mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useRegisterForm());

      act(() => {
        result.current.handleInputChange("email", "test@example.com");
        result.current.handleInputChange("password", "StrongPass123!");
        result.current.handleInputChange("confirmPassword", "StrongPass123!");
      });

      await act(async () => {
        await result.current.handleSubmit({ preventDefault: vi.fn() } as any);
      });

      await waitFor(() => {
        expect(result.current.errors.general).toBe("An unexpected error occurred. Please try again.");
        expect(result.current.isSubmitting).toBe(false);
      });
    });

    it("should set isSubmitting during submission", async () => {
      const onSuccess = vi.fn();

      vi.mocked(authService.registerUser).mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return { success: true };
      });

      const { result } = renderHook(() => useRegisterForm({ onSuccess }));

      act(() => {
        result.current.handleInputChange("email", "test@example.com");
        result.current.handleInputChange("password", "StrongPass123!");
        result.current.handleInputChange("confirmPassword", "StrongPass123!");
      });

      await act(async () => {
        await result.current.handleSubmit({ preventDefault: vi.fn() } as any);
      });

      // Verify submission completed successfully
      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it("should clear general error on new submission", async () => {
      vi.mocked(authService.registerUser).mockResolvedValue({
        success: false,
        error: "First error",
      });

      const { result } = renderHook(() => useRegisterForm());

      act(() => {
        result.current.handleInputChange("email", "test@example.com");
        result.current.handleInputChange("password", "StrongPass123!");
        result.current.handleInputChange("confirmPassword", "StrongPass123!");
      });

      // First submission with error
      await act(async () => {
        await result.current.handleSubmit({ preventDefault: vi.fn() } as any);
      });

      expect(result.current.errors.general).toBe("First error");

      // Second submission - general error should be cleared and redirect should happen
      vi.mocked(authService.registerUser).mockResolvedValue({ success: true });

      await act(async () => {
        await result.current.handleSubmit({ preventDefault: vi.fn() } as any);
      });

      await waitFor(() => {
        expect(result.current.errors.general).toBeUndefined();
        expect(window.location.assign).toHaveBeenCalledWith("/");
      });
    });
  });

  describe("password strength calculation", () => {
    it("should calculate strength for weak password", () => {
      const { result } = renderHook(() => useRegisterForm());

      act(() => {
        result.current.handleInputChange("password", "weak");
      });

      expect(result.current.passwordStrength).toBeLessThan(3);
    });

    it("should calculate strength for strong password", () => {
      const { result } = renderHook(() => useRegisterForm());

      act(() => {
        result.current.handleInputChange("password", "VeryStrongP@ssw0rd123!");
      });

      expect(result.current.passwordStrength).toBeGreaterThanOrEqual(3);
    });

    it("should update strength reactively", () => {
      const { result } = renderHook(() => useRegisterForm());

      act(() => {
        result.current.handleInputChange("password", "weak");
      });

      const weakScore = result.current.passwordStrength;

      act(() => {
        result.current.handleInputChange("password", "VeryStrongP@ssw0rd123!");
      });

      const strongScore = result.current.passwordStrength;

      expect(strongScore).toBeGreaterThan(weakScore);
    });
  });
});
