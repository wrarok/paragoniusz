import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validatePassword,
  validateLoginForm,
  hasValidationErrors,
} from '@/lib/validation/login.validation';
import type { LoginFormData } from '@/types/auth.types';

describe('Login Validation', () => {
  describe('validateEmail', () => {
    it('should return undefined for valid email addresses', () => {
      expect(validateEmail('user@example.com')).toBeUndefined();
      expect(validateEmail('test.user@domain.co.uk')).toBeUndefined();
      expect(validateEmail('user+tag@example.com')).toBeUndefined();
    });

    it('should return error for empty email', () => {
      expect(validateEmail('')).toBe('Email jest wymagany');
      expect(validateEmail('   ')).toBe('Email jest wymagany');
    });

    it('should return error for invalid email format', () => {
      expect(validateEmail('invalid')).toBe('Wprowadź poprawny adres email');
      expect(validateEmail('user@')).toBe('Wprowadź poprawny adres email');
      expect(validateEmail('@example.com')).toBe('Wprowadź poprawny adres email');
      expect(validateEmail('user@domain')).toBe('Wprowadź poprawny adres email');
    });

    it('should return error for email with spaces', () => {
      expect(validateEmail('user @example.com')).toBe('Wprowadź poprawny adres email');
      expect(validateEmail('user@example .com')).toBe('Wprowadź poprawny adres email');
    });
  });

  describe('validatePassword', () => {
    it('should return undefined for non-empty password', () => {
      expect(validatePassword('password123')).toBeUndefined();
      expect(validatePassword('a')).toBeUndefined();
      expect(validatePassword('very-long-password-123')).toBeUndefined();
    });

    it('should return error for empty password', () => {
      expect(validatePassword('')).toBe('Hasło jest wymagane');
      expect(validatePassword('   ')).toBe('Hasło jest wymagane');
    });
  });

  describe('validateLoginForm', () => {
    it('should return empty errors object for valid form data', () => {
      const formData: LoginFormData = {
        email: 'user@example.com',
        password: 'password123',
        rememberMe: false,
      };

      const errors = validateLoginForm(formData);
      expect(errors).toEqual({});
    });

    it('should return email error for invalid email', () => {
      const formData: LoginFormData = {
        email: 'invalid-email',
        password: 'password123',
        rememberMe: false,
      };

      const errors = validateLoginForm(formData);
      expect(errors.email).toBe('Wprowadź poprawny adres email');
      expect(errors.password).toBeUndefined();
    });

    it('should return password error for empty password', () => {
      const formData: LoginFormData = {
        email: 'user@example.com',
        password: '',
        rememberMe: false,
      };

      const errors = validateLoginForm(formData);
      expect(errors.email).toBeUndefined();
      expect(errors.password).toBe('Hasło jest wymagane');
    });

    it('should return both email and password errors for invalid data', () => {
      const formData: LoginFormData = {
        email: 'invalid',
        password: '',
        rememberMe: false,
      };

      const errors = validateLoginForm(formData);
      expect(errors.email).toBe('Wprowadź poprawny adres email');
      expect(errors.password).toBe('Hasło jest wymagane');
    });
  });

  describe('hasValidationErrors', () => {
    it('should return false for empty errors object', () => {
      expect(hasValidationErrors({})).toBe(false);
    });

    it('should return true for errors object with email error', () => {
      expect(hasValidationErrors({ email: 'Invalid email' })).toBe(true);
    });

    it('should return true for errors object with password error', () => {
      expect(hasValidationErrors({ password: 'Password required' })).toBe(true);
    });

    it('should return true for errors object with multiple errors', () => {
      expect(
        hasValidationErrors({
          email: 'Invalid email',
          password: 'Password required',
        })
      ).toBe(true);
    });
  });
});