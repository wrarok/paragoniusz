import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useExpenseForm } from '@/components/hooks/useExpenseForm';
import { server } from '../../mocks/server';
import { http, HttpResponse } from 'msw';
import { createExpense } from '../../fixtures/expense.factory';
import { createCategory } from '../../fixtures/category.factory';
import * as ExpenseMutationService from '@/lib/services/expense-mutation.service';

// Mock expense mutation service
vi.mock('@/lib/services/expense-mutation.service', () => ({
  ExpenseMutationService: {
    create: vi.fn(),
    update: vi.fn(),
  },
}));

describe('useExpenseForm', () => {
  const mockCategories = [
    createCategory({ id: 'cat-1', name: 'Żywność' }),
    createCategory({ id: 'cat-2', name: 'Transport' }),
  ];

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

  describe('initialization - add mode', () => {
    it('should initialize with empty form data for add mode', () => {
      const { result } = renderHook(() =>
        useExpenseForm({
          mode: 'add',
          categories: mockCategories,
        })
      );

      const values = result.current.form.getValues();
      expect(values.category_id).toBe('');
      expect(values.amount).toBe('');
      expect(values.currency).toBe('PLN');
      expect(values.expense_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should initialize with today\'s date', () => {
      const { result } = renderHook(() =>
        useExpenseForm({
          mode: 'add',
          categories: mockCategories,
        })
      );

      const today = new Date().toISOString().split('T')[0];
      const values = result.current.form.getValues();
      expect(values.expense_date).toBe(today);
    });

    it('should not be submitting or loading initially', () => {
      const { result } = renderHook(() =>
        useExpenseForm({
          mode: 'add',
          categories: mockCategories,
        })
      );

      expect(result.current.form.formState.isSubmitting).toBe(false);
      expect(Object.keys(result.current.form.formState.errors).length).toBe(0);
    });
  });

  describe('initialization - edit mode', () => {
    const initialExpense = createExpense({
      id: 'expense-1',
      category_id: 'cat-1',
      amount: 100.50,
      expense_date: '2024-01-15',
      currency: 'PLN',
    });

    it('should initialize with existing expense data', () => {
      const { result } = renderHook(() =>
        useExpenseForm({
          mode: 'edit',
          expenseId: 'expense-1',
          initialData: initialExpense as any,
          categories: mockCategories,
        })
      );

      const values = result.current.form.getValues();
      expect(values).toEqual({
        category_id: 'cat-1',
        amount: 100.50,
        expense_date: '2024-01-15',
        currency: 'PLN',
      });
    });
  });

  describe('form field updates', () => {
    it('should update amount field', () => {
      const { result } = renderHook(() =>
        useExpenseForm({
          mode: 'add',
          categories: mockCategories,
        })
      );

      act(() => {
        result.current.form.setValue('amount', '100.50');
      });

      const values = result.current.form.getValues();
      expect(values.amount).toBe('100.50');
    });

    it('should update category_id field', () => {
      const { result } = renderHook(() =>
        useExpenseForm({
          mode: 'add',
          categories: mockCategories,
        })
      );

      act(() => {
        result.current.form.setValue('category_id', 'cat-1');
      });

      const values = result.current.form.getValues();
      expect(values.category_id).toBe('cat-1');
    });

    // Note: Field validation and error handling tests are covered by E2E tests
    // React Hook Form's internal validation is difficult to test in unit tests
    // See e2e/expense.spec.ts for comprehensive validation testing
  });

  describe('handleCancel', () => {
    it('should call onCancel callback if provided', () => {
      const onCancel = vi.fn();
      const { result } = renderHook(() =>
        useExpenseForm({
          mode: 'add',
          categories: mockCategories,
          onCancel,
        })
      );

      act(() => {
        result.current.onCancel();
      });

      expect(onCancel).toHaveBeenCalled();
    });

    it('should redirect to dashboard if no callback provided', () => {
      const { result } = renderHook(() =>
        useExpenseForm({
          mode: 'add',
          categories: mockCategories,
        })
      );

      act(() => {
        result.current.onCancel();
      });

      expect(window.location.href).toBe('/');
    });
  });

  describe('form reset', () => {
    it('should reset form to initial state', () => {
      const { result } = renderHook(() =>
        useExpenseForm({
          mode: 'add',
          categories: mockCategories,
        })
      );

      // Modify form
      act(() => {
        result.current.form.setValue('amount', '100.50');
        result.current.form.setValue('category_id', 'cat-1');
      });

      expect(result.current.form.getValues().amount).toBe('100.50');

      // Reset
      act(() => {
        result.current.form.reset();
      });

      const values = result.current.form.getValues();
      expect(values.amount).toBe('');
      expect(values.category_id).toBe('');
      expect(Object.keys(result.current.form.formState.errors).length).toBe(0);
    });
  });

  // Note: Form submission and validation tests are covered by E2E tests
  // React Hook Form's internal submission handling is difficult to test in unit tests
  // See e2e/expense.spec.ts for comprehensive form submission testing including:
  // - Validation of required fields
  // - Successful form submission
  // - Error handling
  // - Focus management on validation errors
});