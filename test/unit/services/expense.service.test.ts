import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateCategories } from '@/lib/services/expense.service';
import type { SupabaseClient } from '@/db/supabase.client';

describe('ExpenseService', () => {
  let mockSupabase: SupabaseClient;

  beforeEach(() => {
    // Create mock Supabase client
    mockSupabase = {
      from: vi.fn(),
    } as any;
  });

  describe('validateCategories', () => {
    it('should return valid=true for existing categories', async () => {
      // Mock Supabase query to return valid categories
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [
              { id: 'uuid-1' },
              { id: 'uuid-2' },
            ],
            error: null,
          }),
        }),
      });
      
      mockSupabase.from = mockFrom;

      const result = await validateCategories(mockSupabase, ['uuid-1', 'uuid-2']);

      expect(result.valid).toBe(true);
      expect(result.invalidIds).toHaveLength(0);
      expect(result.invalidIds).toEqual([]);
      
      // Verify correct table and query were called
      expect(mockFrom).toHaveBeenCalledWith('categories');
    });

    it('should detect invalid category IDs', async () => {
      // Mock Supabase query to return empty data (category doesn't exist)
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });
      
      mockSupabase.from = mockFrom;

      const result = await validateCategories(mockSupabase, ['invalid-uuid']);

      expect(result.valid).toBe(false);
      expect(result.invalidIds).toContain('invalid-uuid');
      expect(result.invalidIds).toHaveLength(1);
    });

    it('should handle empty array', async () => {
      // No database call should be made for empty array
      const mockFrom = vi.fn();
      mockSupabase.from = mockFrom;

      const result = await validateCategories(mockSupabase, []);

      expect(result.valid).toBe(true);
      expect(result.invalidIds).toEqual([]);
      expect(result.invalidIds).toHaveLength(0);
      
      // Verify no database query was made
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('should handle mixed valid/invalid IDs', async () => {
      // Mock Supabase query to return only valid categories
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [
              { id: 'valid-1' },
              { id: 'valid-2' },
            ],
            error: null,
          }),
        }),
      });
      
      mockSupabase.from = mockFrom;

      const result = await validateCategories(
        mockSupabase,
        ['valid-1', 'invalid-1', 'valid-2', 'invalid-2']
      );

      expect(result.valid).toBe(false);
      expect(result.invalidIds).toEqual(['invalid-1', 'invalid-2']);
      expect(result.invalidIds).toHaveLength(2);
      
      // Verify valid IDs are not in invalidIds
      expect(result.invalidIds).not.toContain('valid-1');
      expect(result.invalidIds).not.toContain('valid-2');
    });

    it('should preserve order of invalid IDs', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [{ id: 'valid-1' }],
            error: null,
          }),
        }),
      });
      
      mockSupabase.from = mockFrom;

      const result = await validateCategories(
        mockSupabase,
        ['invalid-a', 'valid-1', 'invalid-b', 'invalid-c']
      );

      expect(result.valid).toBe(false);
      expect(result.invalidIds).toEqual(['invalid-a', 'invalid-b', 'invalid-c']);
    });

    it('should throw error on database error', async () => {
      // Mock Supabase query to return error
      const dbError = new Error('Database connection failed');
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: null,
            error: dbError,
          }),
        }),
      });
      
      mockSupabase.from = mockFrom;

      await expect(
        validateCategories(mockSupabase, ['uuid-1'])
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle single valid category', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [{ id: 'single-uuid' }],
            error: null,
          }),
        }),
      });
      
      mockSupabase.from = mockFrom;

      const result = await validateCategories(mockSupabase, ['single-uuid']);

      expect(result.valid).toBe(true);
      expect(result.invalidIds).toEqual([]);
    });

    it('should handle duplicate category IDs in input', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [{ id: 'uuid-1' }],
            error: null,
          }),
        }),
      });
      
      mockSupabase.from = mockFrom;

      const result = await validateCategories(
        mockSupabase,
        ['uuid-1', 'uuid-1', 'uuid-1'] // Duplicates
      );

      expect(result.valid).toBe(true);
      expect(result.invalidIds).toEqual([]);
    });

    it('should handle many category IDs efficiently', async () => {
      const validIds = Array.from({ length: 100 }, (_, i) => `valid-${i}`);
      
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: validIds.map(id => ({ id })),
            error: null,
          }),
        }),
      });
      
      mockSupabase.from = mockFrom;

      const result = await validateCategories(mockSupabase, validIds);

      expect(result.valid).toBe(true);
      expect(result.invalidIds).toEqual([]);
    });

    it('should handle UUID format variations', async () => {
      // Test with actual UUID formats
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [
              { id: '550e8400-e29b-41d4-a716-446655440000' },
              { id: '123e4567-e89b-12d3-a456-426614174000' },
            ],
            error: null,
          }),
        }),
      });
      
      mockSupabase.from = mockFrom;

      const result = await validateCategories(mockSupabase, [
        '550e8400-e29b-41d4-a716-446655440000',
        '123e4567-e89b-12d3-a456-426614174000',
      ]);

      expect(result.valid).toBe(true);
      expect(result.invalidIds).toEqual([]);
    });
  });
});