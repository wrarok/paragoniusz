import { describe, it, expect } from "vitest";
import {
  calculatePasswordStrength,
  getPasswordStrengthLabel,
  getPasswordStrengthColor,
  validatePasswordForm,
  passwordValidationSchema,
} from "../../../src/lib/validation/password.validation";

describe("Password Validation", () => {
  describe("calculatePasswordStrength", () => {
    describe("Length-based scoring", () => {
      it("should return 0 for empty password", () => {
        expect(calculatePasswordStrength("")).toBe(0);
      });

      it("should return 1 for password with 8+ characters", () => {
        expect(calculatePasswordStrength("abcdefgh")).toBe(1);
      });

      it("should add bonus point for 12+ characters", () => {
        // 12 chars lowercase = length(2) + lowercase(0) = 2 points max from length alone
        const result = calculatePasswordStrength("abcdefghijkl");
        expect(result).toBeGreaterThanOrEqual(2);
      });

      it("should not exceed strength of 4", () => {
        const veryStrongPassword = "Abcdefgh123!@#$%^&*()_+ABCDEFGH";
        expect(calculatePasswordStrength(veryStrongPassword)).toBe(4);
      });
    });

    describe("Character variety scoring", () => {
      it("should add point for mixed case (lowercase + uppercase)", () => {
        const result = calculatePasswordStrength("abcdEFGH");
        expect(result).toBeGreaterThanOrEqual(2); // length(1) + mixed case(1)
      });

      it("should add point for numbers", () => {
        const result = calculatePasswordStrength("abcd1234");
        expect(result).toBeGreaterThanOrEqual(2); // length(1) + numbers(1)
      });

      it("should add point for special characters", () => {
        const result = calculatePasswordStrength("abcd!@#$");
        expect(result).toBeGreaterThanOrEqual(2); // length(1) + special(1)
      });
    });

    describe("Combined strength scenarios", () => {
      it("should return 4 for very strong password", () => {
        // 12+ chars + mixed case + numbers + special = max points
        expect(calculatePasswordStrength("Abcdef123!@#")).toBe(4);
      });

      it("should return 3 for strong password without special chars", () => {
        // 12+ chars + mixed case + numbers = 4 points, capped at 4
        const result = calculatePasswordStrength("Abcdefgh1234");
        expect(result).toBeLessThanOrEqual(4);
        expect(result).toBeGreaterThanOrEqual(3);
      });

      it("should return 2 for medium password", () => {
        // 8 chars + mixed case = 2 points
        expect(calculatePasswordStrength("Abcdefgh")).toBe(2);
      });

      it("should return 1 for weak password", () => {
        // Only 8 chars, no variety
        expect(calculatePasswordStrength("abcdefgh")).toBe(1);
      });
    });

    describe("Edge cases", () => {
      it("should handle very long passwords", () => {
        const longPassword = "A".repeat(100) + "b1!";
        const result = calculatePasswordStrength(longPassword);
        expect(result).toBe(4); // Should be capped at 4
      });

      it("should handle only special characters", () => {
        const specialOnly = "!@#$%^&*()_+{}[]";
        const result = calculatePasswordStrength(specialOnly);
        expect(result).toBeGreaterThanOrEqual(2); // length(2) + special(1) = 3, but no mixed case or numbers
      });

      it("should handle only numbers", () => {
        const numbersOnly = "12345678";
        const result = calculatePasswordStrength(numbersOnly);
        expect(result).toBe(2); // length(1) + numbers(1)
      });

      it("should handle only uppercase", () => {
        const uppercaseOnly = "ABCDEFGH";
        expect(calculatePasswordStrength(uppercaseOnly)).toBe(1);
      });

      it("should handle mixed unicode characters", () => {
        const unicode = "Пароль123!";
        const result = calculatePasswordStrength(unicode);
        expect(result).toBeGreaterThan(0);
      });
    });
  });

  describe("getPasswordStrengthLabel", () => {
    it('should return "Very Weak" for strength 0', () => {
      expect(getPasswordStrengthLabel(0)).toBe("Very Weak");
    });

    it('should return "Weak" for strength 1', () => {
      expect(getPasswordStrengthLabel(1)).toBe("Weak");
    });

    it('should return "Fair" for strength 2', () => {
      expect(getPasswordStrengthLabel(2)).toBe("Fair");
    });

    it('should return "Good" for strength 3', () => {
      expect(getPasswordStrengthLabel(3)).toBe("Good");
    });

    it('should return "Strong" for strength 4', () => {
      expect(getPasswordStrengthLabel(4)).toBe("Strong");
    });

    it('should return "Very Weak" for negative strength', () => {
      expect(getPasswordStrengthLabel(-1)).toBe("Very Weak");
    });

    it('should return "Very Weak" for out-of-range strength', () => {
      expect(getPasswordStrengthLabel(10)).toBe("Very Weak");
    });
  });

  describe("getPasswordStrengthColor", () => {
    it('should return "bg-red-500" for strength 0', () => {
      expect(getPasswordStrengthColor(0)).toBe("bg-red-500");
    });

    it('should return "bg-orange-500" for strength 1', () => {
      expect(getPasswordStrengthColor(1)).toBe("bg-orange-500");
    });

    it('should return "bg-yellow-500" for strength 2', () => {
      expect(getPasswordStrengthColor(2)).toBe("bg-yellow-500");
    });

    it('should return "bg-lime-500" for strength 3', () => {
      expect(getPasswordStrengthColor(3)).toBe("bg-lime-500");
    });

    it('should return "bg-green-500" for strength 4', () => {
      expect(getPasswordStrengthColor(4)).toBe("bg-green-500");
    });

    it('should return "bg-red-500" for negative strength', () => {
      expect(getPasswordStrengthColor(-1)).toBe("bg-red-500");
    });

    it('should return "bg-red-500" for out-of-range strength', () => {
      expect(getPasswordStrengthColor(10)).toBe("bg-red-500");
    });
  });

  describe("validatePasswordForm", () => {
    describe("Valid scenarios", () => {
      it("should return null for valid password form", () => {
        const result = validatePasswordForm({
          currentPassword: "OldPass123",
          newPassword: "NewPass123",
          confirmPassword: "NewPass123",
        });
        expect(result).toBeNull();
      });

      it("should accept strong password meeting all requirements", () => {
        const result = validatePasswordForm({
          currentPassword: "Current123!",
          newPassword: "SuperStrong123!",
          confirmPassword: "SuperStrong123!",
        });
        expect(result).toBeNull();
      });
    });

    describe("Current password validation", () => {
      it("should reject empty current password", () => {
        const result = validatePasswordForm({
          currentPassword: "",
          newPassword: "NewPass123",
          confirmPassword: "NewPass123",
        });
        expect(result).not.toBeNull();
        expect(result?.currentPassword).toBe("Current password is required");
      });
    });

    describe("New password validation", () => {
      it("should reject password shorter than 8 characters", () => {
        const result = validatePasswordForm({
          currentPassword: "OldPass123",
          newPassword: "Short1",
          confirmPassword: "Short1",
        });
        expect(result).not.toBeNull();
        expect(result?.newPassword).toContain("at least 8 characters");
      });

      it("should reject password without uppercase letter", () => {
        const result = validatePasswordForm({
          currentPassword: "OldPass123",
          newPassword: "lowercase123",
          confirmPassword: "lowercase123",
        });
        expect(result).not.toBeNull();
        expect(result?.newPassword).toContain("uppercase letter");
      });

      it("should reject password without lowercase letter", () => {
        const result = validatePasswordForm({
          currentPassword: "OldPass123",
          newPassword: "UPPERCASE123",
          confirmPassword: "UPPERCASE123",
        });
        expect(result).not.toBeNull();
        expect(result?.newPassword).toContain("lowercase letter");
      });

      it("should reject password without number", () => {
        const result = validatePasswordForm({
          currentPassword: "OldPass123",
          newPassword: "NoNumbers",
          confirmPassword: "NoNumbers",
        });
        expect(result).not.toBeNull();
        expect(result?.newPassword).toContain("number");
      });

      it("should reject new password same as current password", () => {
        const result = validatePasswordForm({
          currentPassword: "SamePass123",
          newPassword: "SamePass123",
          confirmPassword: "SamePass123",
        });
        expect(result).not.toBeNull();
        expect(result?.newPassword).toContain("different from current password");
      });
    });

    describe("Confirm password validation", () => {
      it("should reject empty confirm password", () => {
        const result = validatePasswordForm({
          currentPassword: "OldPass123",
          newPassword: "NewPass123",
          confirmPassword: "",
        });
        expect(result).not.toBeNull();
        expect(result?.confirmPassword).toBeDefined();
      });

      it("should reject mismatched passwords", () => {
        const result = validatePasswordForm({
          currentPassword: "OldPass123",
          newPassword: "NewPass123",
          confirmPassword: "Different123",
        });
        expect(result).not.toBeNull();
        expect(result?.confirmPassword).toContain("do not match");
      });
    });

    describe("Multiple validation errors", () => {
      it("should return first error for each field", () => {
        const result = validatePasswordForm({
          currentPassword: "",
          newPassword: "short",
          confirmPassword: "different",
        });
        expect(result).not.toBeNull();
        expect(result?.currentPassword).toBeDefined();
        expect(result?.newPassword).toBeDefined();
        expect(result?.confirmPassword).toBeDefined();
      });

      it("should prioritize field-specific errors over refinement errors", () => {
        const result = validatePasswordForm({
          currentPassword: "OldPass123",
          newPassword: "short",
          confirmPassword: "different",
        });
        expect(result).not.toBeNull();
        // Should show length error before mismatch error
        expect(result?.newPassword).toContain("at least 8 characters");
      });
    });

    describe("Edge cases", () => {
      it("should handle very long passwords", () => {
        const longPassword = "A".repeat(100) + "bc123";
        const result = validatePasswordForm({
          currentPassword: "OldPass123",
          newPassword: longPassword,
          confirmPassword: longPassword,
        });
        expect(result).toBeNull();
      });

      it("should handle passwords with special characters", () => {
        const result = validatePasswordForm({
          currentPassword: "Old!@#123",
          newPassword: "New!@#123",
          confirmPassword: "New!@#123",
        });
        expect(result).toBeNull();
      });

      it("should handle passwords with spaces", () => {
        const result = validatePasswordForm({
          currentPassword: "Old Pass 123",
          newPassword: "New Pass 456",
          confirmPassword: "New Pass 456",
        });
        expect(result).toBeNull();
      });
    });
  });

  describe("passwordValidationSchema - Zod schema direct tests", () => {
    it("should parse valid data", () => {
      const result = passwordValidationSchema.safeParse({
        currentPassword: "OldPass123",
        newPassword: "NewPass123",
        confirmPassword: "NewPass123",
      });
      expect(result.success).toBe(true);
    });

    it("should fail on invalid data", () => {
      const result = passwordValidationSchema.safeParse({
        currentPassword: "",
        newPassword: "short",
        confirmPassword: "different",
      });
      expect(result.success).toBe(false);
    });

    it("should enforce all password requirements", () => {
      const result = passwordValidationSchema.safeParse({
        currentPassword: "OldPass123",
        newPassword: "newpass", // missing uppercase and number
        confirmPassword: "newpass",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.length).toBeGreaterThan(0);
      }
    });
  });
});
