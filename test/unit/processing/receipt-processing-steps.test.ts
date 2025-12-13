import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ConsentValidationStep,
  FileOwnershipValidationStep,
  CategoryFetchStep,
  AIProcessingStep,
  CategoryMappingStep,
  type ProcessingContext,
} from '../../../src/lib/processing/receipt-processing-steps';
import type { SupabaseClient } from '../../../src/db/supabase.client';

/**
 * Unit tests for Receipt Processing Steps
 * 
 * Tests each step in the processing pipeline independently.
 * Each step receives context, performs operation, returns updated context.
 * 
 * Test coverage:
 * - ConsentValidationStep: AI consent verification
 * - FileOwnershipValidationStep: File ownership validation
 * - CategoryFetchStep: Category retrieval
 * - AIProcessingStep: Edge Function invocation
 * - CategoryMappingStep: Category mapping and response building
 */
describe('Receipt Processing Steps', () => {
  let mockSupabase: SupabaseClient;
  let baseContext: ProcessingContext;

  beforeEach(() => {
    // Mock Supabase client
    mockSupabase = {
      from: vi.fn(),
      auth: {
        getSession: vi.fn(),
      },
      functions: {
        invoke: vi.fn(),
      },
    } as any;

    // Base context for all tests
    baseContext = {
      filePath: 'receipts/user-123/file-456.jpg',
      userId: 'user-123',
      startTime: Date.now(),
    };
  });

  describe('ConsentValidationStep', () => {
    let step: ConsentValidationStep;

    beforeEach(() => {
      step = new ConsentValidationStep(mockSupabase);
    });

    it('should pass when user has given AI consent', async () => {
      // Arrange
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: { ai_consent_given: true },
        error: null,
      });

      vi.mocked(mockSupabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      } as any);

      // Act
      const result = await step.execute(baseContext);

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
      expect(mockSelect).toHaveBeenCalledWith('ai_consent_given');
      expect(mockEq).toHaveBeenCalledWith('id', 'user-123');
      expect(result.aiConsentGiven).toBe(true);
      expect(result).toMatchObject(baseContext);
    });

    it('should throw AI_CONSENT_REQUIRED when consent not given', async () => {
      // Arrange
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: { ai_consent_given: false },
        error: null,
      });

      vi.mocked(mockSupabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      } as any);

      // Act & Assert
      await expect(step.execute(baseContext)).rejects.toThrow('AI_CONSENT_REQUIRED');
    });

    it('should throw error when profile fetch fails', async () => {
      // Arrange
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      vi.mocked(mockSupabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      } as any);

      // Act & Assert
      await expect(step.execute(baseContext)).rejects.toThrow(
        'Nie udało się pobrać profilu użytkownika'
      );
    });

    it('should preserve existing context data', async () => {
      // Arrange
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: { ai_consent_given: true },
        error: null,
      });

      vi.mocked(mockSupabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      } as any);

      const contextWithData = {
        ...baseContext,
        categories: [{ id: 'cat-1', name: 'Food' }],
      };

      // Act
      const result = await step.execute(contextWithData);

      // Assert
      expect(result.categories).toEqual([{ id: 'cat-1', name: 'Food' }]);
    });
  });

  describe('FileOwnershipValidationStep', () => {
    let step: FileOwnershipValidationStep;

    beforeEach(() => {
      step = new FileOwnershipValidationStep();
    });

    it('should pass when file belongs to user', async () => {
      // Arrange
      const context: ProcessingContext = {
        filePath: 'receipts/user-123/file-456.jpg',
        userId: 'user-123',
        startTime: Date.now(),
      };

      // Act
      const result = await step.execute(context);

      // Assert
      expect(result).toEqual(context);
    });

    it('should throw FORBIDDEN when file belongs to different user', async () => {
      // Arrange
      const context: ProcessingContext = {
        filePath: 'receipts/user-999/file-456.jpg', // Different user
        userId: 'user-123',
        startTime: Date.now(),
      };

      // Act & Assert
      await expect(step.execute(context)).rejects.toThrow('FORBIDDEN');
    });

    it('should extract user ID from second path segment', async () => {
      // Arrange - test path parsing
      const context: ProcessingContext = {
        filePath: 'receipts/abc-def-123/image.png',
        userId: 'abc-def-123',
        startTime: Date.now(),
      };

      // Act
      const result = await step.execute(context);

      // Assert
      expect(result).toEqual(context);
    });

    it('should handle different file extensions', async () => {
      // Arrange
      const contexts = [
        { filePath: 'receipts/user-123/file.jpg', userId: 'user-123' },
        { filePath: 'receipts/user-123/file.png', userId: 'user-123' },
        { filePath: 'receipts/user-123/file.heic', userId: 'user-123' },
      ];

      // Act & Assert
      for (const ctx of contexts) {
        const fullContext = { ...ctx, startTime: Date.now() };
        await expect(step.execute(fullContext)).resolves.not.toThrow();
      }
    });
  });

  describe('CategoryFetchStep', () => {
    let step: CategoryFetchStep;

    beforeEach(() => {
      step = new CategoryFetchStep(mockSupabase);
    });

    it('should fetch and return categories', async () => {
      // Arrange
      const mockCategories = [
        { id: 'cat-1', name: 'Food' },
        { id: 'cat-2', name: 'Transport' },
        { id: 'cat-3', name: 'Entertainment' },
      ];

      const mockSelect = vi.fn().mockResolvedValue({
        data: mockCategories,
        error: null,
      });

      vi.mocked(mockSupabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      // Act
      const result = await step.execute(baseContext);

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('categories');
      expect(mockSelect).toHaveBeenCalledWith('id, name');
      expect(result.categories).toEqual(mockCategories);
    });

    it('should throw error when database query fails', async () => {
      // Arrange
      const mockSelect = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      vi.mocked(mockSupabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      // Act & Assert
      await expect(step.execute(baseContext)).rejects.toThrow(
        'Nie udało się pobrać kategorii'
      );
    });

    it('should throw error when no categories exist', async () => {
      // Arrange
      const mockSelect = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      vi.mocked(mockSupabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      // Act & Assert
      await expect(step.execute(baseContext)).rejects.toThrow(
        'Nie udało się pobrać kategorii'
      );
    });

    it('should throw error when categories is null', async () => {
      // Arrange
      const mockSelect = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      vi.mocked(mockSupabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      // Act & Assert
      await expect(step.execute(baseContext)).rejects.toThrow(
        'Nie udało się pobrać kategorii'
      );
    });

    it('should preserve existing context data', async () => {
      // Arrange
      const mockSelect = vi.fn().mockResolvedValue({
        data: [{ id: 'cat-1', name: 'Food' }],
        error: null,
      });

      vi.mocked(mockSupabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const contextWithConsent = {
        ...baseContext,
        aiConsentGiven: true,
      };

      // Act
      const result = await step.execute(contextWithConsent);

      // Assert
      expect(result.aiConsentGiven).toBe(true);
    });
  });

  describe('AIProcessingStep', () => {
    let step: AIProcessingStep;

    beforeEach(() => {
      step = new AIProcessingStep(mockSupabase);
    });

    it('should successfully process receipt and return data', async () => {
      // Arrange
      const mockSession = { access_token: 'test-token' };
      const mockEdgeFunctionData = {
        items: [
          { name: 'Milk', amount: 5.5, category: 'Food' },
          { name: 'Bread', amount: 3.0, category: 'Food' },
        ],
        total: 8.5,
        date: '2024-01-15',
      };

      vi.mocked(mockSupabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      } as any);

      vi.mocked(mockSupabase.functions.invoke).mockResolvedValue({
        data: mockEdgeFunctionData,
        error: null,
      } as any);

      // Act
      const result = await step.execute(baseContext);

      // Assert
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
        'process-receipt',
        {
          body: { file_path: 'receipts/user-123/file-456.jpg' },
          headers: { Authorization: 'Bearer test-token' },
        }
      );
      expect(result.edgeFunctionData).toEqual(mockEdgeFunctionData);
    });

    it('should handle missing session (no auth token)', async () => {
      // Arrange
      const mockEdgeFunctionData = {
        items: [{ name: 'Item', amount: 10, category: 'Food' }],
        total: 10,
        date: '2024-01-15',
      };

      vi.mocked(mockSupabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      } as any);

      vi.mocked(mockSupabase.functions.invoke).mockResolvedValue({
        data: mockEdgeFunctionData,
        error: null,
      } as any);

      // Act
      const result = await step.execute(baseContext);

      // Assert
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
        'process-receipt',
        {
          body: { file_path: 'receipts/user-123/file-456.jpg' },
          headers: undefined,
        }
      );
      expect(result.edgeFunctionData).toEqual(mockEdgeFunctionData);
    });

    it('should throw RATE_LIMIT_EXCEEDED when rate limit hit', async () => {
      // Arrange
      vi.mocked(mockSupabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      } as any);

      vi.mocked(mockSupabase.functions.invoke).mockResolvedValue({
        data: null,
        error: { message: 'Rate limit exceeded' },
      } as any);

      // Act & Assert
      await expect(step.execute(baseContext)).rejects.toThrow('RATE_LIMIT_EXCEEDED');
    });

    it('should throw PROCESSING_TIMEOUT when timeout occurs', async () => {
      // Arrange
      vi.mocked(mockSupabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      } as any);

      vi.mocked(mockSupabase.functions.invoke).mockResolvedValue({
        data: null,
        error: { message: 'Request timeout' },
      } as any);

      // Act & Assert
      await expect(step.execute(baseContext)).rejects.toThrow('PROCESSING_TIMEOUT');
    });

    it('should throw generic error for other failures', async () => {
      // Arrange
      vi.mocked(mockSupabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      } as any);

      vi.mocked(mockSupabase.functions.invoke).mockResolvedValue({
        data: null,
        error: { message: 'Unknown error' },
      } as any);

      // Act & Assert
      await expect(step.execute(baseContext)).rejects.toThrow(
        'Przetwarzanie AI nie powiodło się: Unknown error'
      );
    });

    it('should throw error when Edge Function returns no data', async () => {
      // Arrange
      vi.mocked(mockSupabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      } as any);

      vi.mocked(mockSupabase.functions.invoke).mockResolvedValue({
        data: null,
        error: null,
      } as any);

      // Act & Assert
      await expect(step.execute(baseContext)).rejects.toThrow(
        'Brak danych zwróconych z przetwarzania AI'
      );
    });
  });

  describe('CategoryMappingStep', () => {
    let step: CategoryMappingStep;
    let mockCategoryMapper: any;

    beforeEach(() => {
      mockCategoryMapper = {
        mapExpensesWithCategories: vi.fn(),
      };
      step = new CategoryMappingStep(mockCategoryMapper);
    });

    it('should successfully map categories and build response', async () => {
      // Arrange
      const contextWithData: ProcessingContext = {
        ...baseContext,
        categories: [
          { id: 'cat-1', name: 'Food' },
          { id: 'cat-2', name: 'Transport' },
        ],
        edgeFunctionData: {
          items: [
            { name: 'Milk', amount: 5.5, category: 'Food' },
            { name: 'Bread', amount: 3.0, category: 'Food' },
          ],
          total: 8.5,
          date: '2024-01-15',
        },
      };

      const mockMappedExpenses = [
        {
          category_id: 'cat-1',
          category_name: 'Food',
          amount: '8.50',
          items: ['Milk - 5.50', 'Bread - 3.00'],
        },
      ];

      mockCategoryMapper.mapExpensesWithCategories.mockResolvedValue(mockMappedExpenses);

      // Act
      const result = await step.execute(contextWithData);

      // Assert
      expect(mockCategoryMapper.mapExpensesWithCategories).toHaveBeenCalledWith(
        contextWithData.edgeFunctionData!.items,
        contextWithData.categories
      );
      expect(result.result).toMatchObject({
        expenses: mockMappedExpenses,
        total_amount: '8.50',
        currency: 'PLN',
        receipt_date: '2024-01-15',
      });
      expect(result.result?.processing_time_ms).toBeGreaterThanOrEqual(0);
    });

    it('should throw error when edgeFunctionData is missing', async () => {
      // Arrange
      const contextMissingData: ProcessingContext = {
        ...baseContext,
        categories: [{ id: 'cat-1', name: 'Food' }],
        // edgeFunctionData missing
      };

      // Act & Assert
      await expect(step.execute(contextMissingData)).rejects.toThrow(
        'Missing data for category mapping'
      );
    });

    it('should throw error when categories are missing', async () => {
      // Arrange
      const contextMissingCategories: ProcessingContext = {
        ...baseContext,
        edgeFunctionData: {
          items: [{ name: 'Milk', amount: 5.5, category: 'Food' }],
          total: 5.5,
          date: '2024-01-15',
        },
        // categories missing
      };

      // Act & Assert
      await expect(step.execute(contextMissingCategories)).rejects.toThrow(
        'Missing data for category mapping'
      );
    });

    it('should calculate processing time correctly', async () => {
      // Arrange
      const startTime = Date.now() - 1500; // 1.5 seconds ago
      const contextWithData: ProcessingContext = {
        filePath: 'receipts/user-123/file.jpg',
        userId: 'user-123',
        startTime,
        categories: [{ id: 'cat-1', name: 'Food' }],
        edgeFunctionData: {
          items: [{ name: 'Item', amount: 10, category: 'Food' }],
          total: 10,
          date: '2024-01-15',
        },
      };

      mockCategoryMapper.mapExpensesWithCategories.mockResolvedValue([
        {
          category_id: 'cat-1',
          category_name: 'Food',
          amount: '10.00',
          items: ['Item - 10.00'],
        },
      ]);

      // Act
      const result = await step.execute(contextWithData);

      // Assert
      expect(result.result?.processing_time_ms).toBeGreaterThanOrEqual(1500);
      expect(result.result?.processing_time_ms).toBeLessThan(3000);
    });

    it('should format total amount with 2 decimal places', async () => {
      // Arrange
      const contextWithData: ProcessingContext = {
        ...baseContext,
        categories: [{ id: 'cat-1', name: 'Food' }],
        edgeFunctionData: {
          items: [{ name: 'Item', amount: 10.5, category: 'Food' }],
          total: 10.5,
          date: '2024-01-15',
        },
      };

      mockCategoryMapper.mapExpensesWithCategories.mockResolvedValue([
        {
          category_id: 'cat-1',
          category_name: 'Food',
          amount: '10.50',
          items: ['Item - 10.50'],
        },
      ]);

      // Act
      const result = await step.execute(contextWithData);

      // Assert
      expect(result.result?.total_amount).toBe('10.50');
    });

    it('should always use PLN as currency', async () => {
      // Arrange
      const contextWithData: ProcessingContext = {
        ...baseContext,
        categories: [{ id: 'cat-1', name: 'Food' }],
        edgeFunctionData: {
          items: [{ name: 'Item', amount: 100, category: 'Food' }],
          total: 100,
          date: '2024-01-15',
        },
      };

      mockCategoryMapper.mapExpensesWithCategories.mockResolvedValue([
        {
          category_id: 'cat-1',
          category_name: 'Food',
          amount: '100.00',
          items: ['Item - 100.00'],
        },
      ]);

      // Act
      const result = await step.execute(contextWithData);

      // Assert
      expect(result.result?.currency).toBe('PLN');
    });
  });
});