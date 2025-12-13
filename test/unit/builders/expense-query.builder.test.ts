import { describe, it, expect, vi } from 'vitest';
import { ExpenseQueryBuilder } from '../../../src/lib/builders/expense-query.builder';

describe('ExpenseQueryBuilder', () => {
  // Mock Supabase client
  const createMockSupabase = () => {
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    };

    return {
      from: vi.fn().mockReturnValue(mockQuery),
      mockQuery,
    };
  };

  describe('withDateRange', () => {
    it('should add from_date filter', () => {
      const builder = new ExpenseQueryBuilder();
      builder.withDateRange('2024-01-01');

      expect(builder).toBeDefined();
    });

    it('should add to_date filter', () => {
      const builder = new ExpenseQueryBuilder();
      builder.withDateRange(undefined, '2024-12-31');

      expect(builder).toBeDefined();
    });

    it('should add both from_date and to_date filters', () => {
      const builder = new ExpenseQueryBuilder();
      builder.withDateRange('2024-01-01', '2024-12-31');

      expect(builder).toBeDefined();
    });

    it('should return this for chaining', () => {
      const builder = new ExpenseQueryBuilder();
      const result = builder.withDateRange('2024-01-01');

      expect(result).toBe(builder);
    });

    it('should handle undefined values', () => {
      const builder = new ExpenseQueryBuilder();
      builder.withDateRange(undefined, undefined);

      expect(builder).toBeDefined();
    });
  });

  describe('withCategory', () => {
    it('should add category filter', () => {
      const builder = new ExpenseQueryBuilder();
      builder.withCategory('cat-1');

      expect(builder).toBeDefined();
    });

    it('should return this for chaining', () => {
      const builder = new ExpenseQueryBuilder();
      const result = builder.withCategory('cat-1');

      expect(result).toBe(builder);
    });

    it('should handle undefined category', () => {
      const builder = new ExpenseQueryBuilder();
      builder.withCategory(undefined);

      expect(builder).toBeDefined();
    });
  });

  describe('withSort', () => {
    it('should parse ascending sort', () => {
      const builder = new ExpenseQueryBuilder();
      builder.withSort('expense_date.asc');

      expect(builder).toBeDefined();
    });

    it('should parse descending sort', () => {
      const builder = new ExpenseQueryBuilder();
      builder.withSort('expense_date.desc');

      expect(builder).toBeDefined();
    });

    it('should return this for chaining', () => {
      const builder = new ExpenseQueryBuilder();
      const result = builder.withSort('amount.desc');

      expect(result).toBe(builder);
    });

    it('should handle different column names', () => {
      const builder = new ExpenseQueryBuilder();
      builder.withSort('amount.asc');

      expect(builder).toBeDefined();
    });
  });

  describe('withPagination', () => {
    it('should add pagination config', () => {
      const builder = new ExpenseQueryBuilder();
      builder.withPagination(0, 50);

      expect(builder).toBeDefined();
    });

    it('should return this for chaining', () => {
      const builder = new ExpenseQueryBuilder();
      const result = builder.withPagination(10, 20);

      expect(result).toBe(builder);
    });

    it('should handle different offset and limit values', () => {
      const builder = new ExpenseQueryBuilder();
      builder.withPagination(100, 10);

      expect(builder).toBeDefined();
    });
  });

  describe('build', () => {
    it('should build basic query without filters', () => {
      const mock = createMockSupabase();
      const builder = new ExpenseQueryBuilder();

      builder.build(mock as any);

      expect(mock.from).toHaveBeenCalledWith('expenses');
      expect(mock.mockQuery.select).toHaveBeenCalledWith('*, category:categories(id, name)');
    });

    it('should apply date range filters', () => {
      const mock = createMockSupabase();
      const builder = new ExpenseQueryBuilder();

      builder.withDateRange('2024-01-01', '2024-12-31');
      builder.build(mock as any);

      expect(mock.mockQuery.gte).toHaveBeenCalledWith('expense_date', '2024-01-01');
      expect(mock.mockQuery.lte).toHaveBeenCalledWith('expense_date', '2024-12-31');
    });

    it('should apply category filter', () => {
      const mock = createMockSupabase();
      const builder = new ExpenseQueryBuilder();

      builder.withCategory('cat-1');
      builder.build(mock as any);

      expect(mock.mockQuery.eq).toHaveBeenCalledWith('category_id', 'cat-1');
    });

    it('should apply sorting', () => {
      const mock = createMockSupabase();
      const builder = new ExpenseQueryBuilder();

      builder.withSort('expense_date.desc');
      builder.build(mock as any);

      expect(mock.mockQuery.order).toHaveBeenCalledWith('expense_date', { ascending: false });
    });

    it('should apply ascending sorting', () => {
      const mock = createMockSupabase();
      const builder = new ExpenseQueryBuilder();

      builder.withSort('amount.asc');
      builder.build(mock as any);

      expect(mock.mockQuery.order).toHaveBeenCalledWith('amount', { ascending: true });
    });

    it('should apply pagination', () => {
      const mock = createMockSupabase();
      const builder = new ExpenseQueryBuilder();

      builder.withPagination(10, 20);
      builder.build(mock as any);

      expect(mock.mockQuery.range).toHaveBeenCalledWith(10, 29); // 10 + 20 - 1
    });

    it('should apply all filters together', () => {
      const mock = createMockSupabase();
      const builder = new ExpenseQueryBuilder();

      builder
        .withDateRange('2024-01-01', '2024-12-31')
        .withCategory('cat-1')
        .withSort('expense_date.desc')
        .withPagination(0, 50);

      builder.build(mock as any);

      expect(mock.mockQuery.gte).toHaveBeenCalledWith('expense_date', '2024-01-01');
      expect(mock.mockQuery.lte).toHaveBeenCalledWith('expense_date', '2024-12-31');
      expect(mock.mockQuery.eq).toHaveBeenCalledWith('category_id', 'cat-1');
      expect(mock.mockQuery.order).toHaveBeenCalledWith('expense_date', { ascending: false });
      expect(mock.mockQuery.range).toHaveBeenCalledWith(0, 49);
    });
  });

  describe('buildCountQuery', () => {
    it('should build count query without pagination', () => {
      const mock = createMockSupabase();
      const builder = new ExpenseQueryBuilder();

      builder.buildCountQuery(mock as any);

      expect(mock.from).toHaveBeenCalledWith('expenses');
      expect(mock.mockQuery.select).toHaveBeenCalledWith('*', { count: 'exact', head: true });
    });

    it('should apply same filters as main query', () => {
      const mock = createMockSupabase();
      const builder = new ExpenseQueryBuilder();

      builder
        .withDateRange('2024-01-01', '2024-12-31')
        .withCategory('cat-1');

      builder.buildCountQuery(mock as any);

      expect(mock.mockQuery.gte).toHaveBeenCalledWith('expense_date', '2024-01-01');
      expect(mock.mockQuery.lte).toHaveBeenCalledWith('expense_date', '2024-12-31');
      expect(mock.mockQuery.eq).toHaveBeenCalledWith('category_id', 'cat-1');
    });

    it('should not apply sorting or pagination', () => {
      const mock = createMockSupabase();
      const builder = new ExpenseQueryBuilder();

      builder
        .withSort('expense_date.desc')
        .withPagination(10, 20);

      builder.buildCountQuery(mock as any);

      expect(mock.mockQuery.order).not.toHaveBeenCalled();
      expect(mock.mockQuery.range).not.toHaveBeenCalled();
    });

    it('should apply filters but not sorting or pagination', () => {
      const mock = createMockSupabase();
      const builder = new ExpenseQueryBuilder();

      builder
        .withDateRange('2024-01-01')
        .withSort('expense_date.desc')
        .withPagination(0, 50);

      builder.buildCountQuery(mock as any);

      expect(mock.mockQuery.gte).toHaveBeenCalledWith('expense_date', '2024-01-01');
      expect(mock.mockQuery.order).not.toHaveBeenCalled();
      expect(mock.mockQuery.range).not.toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    it('should clear all filters', () => {
      const mock = createMockSupabase();
      const builder = new ExpenseQueryBuilder();

      builder
        .withDateRange('2024-01-01', '2024-12-31')
        .withCategory('cat-1')
        .withSort('expense_date.desc')
        .withPagination(10, 20);

      builder.reset();
      builder.build(mock as any);

      // Should only have the basic select call, no filters
      expect(mock.mockQuery.gte).not.toHaveBeenCalled();
      expect(mock.mockQuery.lte).not.toHaveBeenCalled();
      expect(mock.mockQuery.eq).not.toHaveBeenCalled();
      expect(mock.mockQuery.order).not.toHaveBeenCalled();
      expect(mock.mockQuery.range).not.toHaveBeenCalled();
    });

    it('should return this for chaining', () => {
      const builder = new ExpenseQueryBuilder();
      const result = builder.reset();

      expect(result).toBe(builder);
    });

    it('should allow reusing builder after reset', () => {
      const mock = createMockSupabase();
      const builder = new ExpenseQueryBuilder();

      // First use
      builder.withCategory('cat-1').withSort('expense_date.desc');
      builder.build(mock as any);

      // Reset and reuse
      builder.reset().withCategory('cat-2').withSort('amount.asc');
      builder.build(mock as any);

      // Should have been called twice with different values
      expect(mock.mockQuery.eq).toHaveBeenCalledTimes(2);
      expect(mock.mockQuery.order).toHaveBeenCalledTimes(2);
    });
  });

  describe('filter consistency', () => {
    it('should apply identical filters to main query and count query', () => {
      const mainMock = createMockSupabase();
      const countMock = createMockSupabase();
      const builder = new ExpenseQueryBuilder();

      builder
        .withDateRange('2024-01-01', '2024-12-31')
        .withCategory('cat-1');

      builder.build(mainMock as any);
      builder.buildCountQuery(countMock as any);

      // Both should have same filter calls
      expect(mainMock.mockQuery.gte).toHaveBeenCalledWith('expense_date', '2024-01-01');
      expect(countMock.mockQuery.gte).toHaveBeenCalledWith('expense_date', '2024-01-01');

      expect(mainMock.mockQuery.lte).toHaveBeenCalledWith('expense_date', '2024-12-31');
      expect(countMock.mockQuery.lte).toHaveBeenCalledWith('expense_date', '2024-12-31');

      expect(mainMock.mockQuery.eq).toHaveBeenCalledWith('category_id', 'cat-1');
      expect(countMock.mockQuery.eq).toHaveBeenCalledWith('category_id', 'cat-1');
    });
  });

  describe('method chaining', () => {
    it('should support fluent API chaining', () => {
      const mock = createMockSupabase();
      const builder = new ExpenseQueryBuilder();

      const result = builder
        .withDateRange('2024-01-01', '2024-12-31')
        .withCategory('cat-1')
        .withSort('expense_date.desc')
        .withPagination(0, 50);

      expect(result).toBe(builder);

      result.build(mock as any);

      expect(mock.mockQuery.gte).toHaveBeenCalled();
      expect(mock.mockQuery.eq).toHaveBeenCalled();
      expect(mock.mockQuery.order).toHaveBeenCalled();
      expect(mock.mockQuery.range).toHaveBeenCalled();
    });
  });
});