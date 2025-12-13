/**
 * Integration tests for ReceiptService (Refactored)
 * 
 * Tests the complete receipt processing pipeline including:
 * - Service initialization
 * - File upload to Supabase Storage
 * - Pipeline orchestration (all 5 steps)
 * - Context data flow between steps
 * - Error propagation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReceiptService } from '../../../src/lib/services/receipt.service.refactored';
import type { SupabaseClient } from '../../../src/db/supabase.client';
import type {
  ProcessingContext,
  ProcessingStep,
} from '../../../src/lib/processing/receipt-processing-steps';

describe('ReceiptService - Integration Tests', () => {
  let mockSupabase: SupabaseClient;
  let service: ReceiptService;

  beforeEach(() => {
    // Mock Supabase client
    mockSupabase = {
      storage: {
        from: vi.fn(),
      },
      functions: {
        invoke: vi.fn(),
      },
      auth: {
        getSession: vi.fn(),
      },
      from: vi.fn(),
    } as unknown as SupabaseClient;

    // Create service instance
    service = new ReceiptService(mockSupabase);

    // Reset all mocks
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize service with processing pipeline', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(ReceiptService);
    });

    it('should initialize pipeline with 5 steps', () => {
      // Access private field for testing
      const pipeline = (service as any).processingPipeline;
      expect(pipeline).toHaveLength(5);
    });
  });

  describe('uploadReceipt()', () => {
    it('should upload file to storage successfully', async () => {
      // Arrange
      const mockFile = new File(['test content'], 'receipt.jpg', {
        type: 'image/jpeg',
      });
      const userId = 'user-123';
      const mockUploadData = { path: 'receipts/user-123/abc-123.jpg' };

      const mockUpload = vi.fn().mockResolvedValue({
        data: mockUploadData,
        error: null,
      });

      (mockSupabase.storage.from as any).mockReturnValue({
        upload: mockUpload,
      });

      // Mock crypto.randomUUID
      const mockUUID = 'abc-123';
      vi.stubGlobal('crypto', {
        randomUUID: vi.fn().mockReturnValue(mockUUID),
      });

      // Act
      const result = await service.uploadReceipt(mockFile, userId);

      // Assert
      expect(result).toEqual({
        file_id: mockUUID,
        file_path: mockUploadData.path,
        uploaded_at: expect.any(String),
      });

      expect(mockSupabase.storage.from).toHaveBeenCalledWith('receipts');
      expect(mockUpload).toHaveBeenCalledWith(
        `receipts/${userId}/${mockUUID}.jpg`,
        expect.any(ArrayBuffer),
        {
          contentType: 'image/jpeg',
          upsert: false,
        }
      );
    });

    it('should handle PNG files', async () => {
      // Arrange
      const mockFile = new File(['test content'], 'receipt.png', {
        type: 'image/png',
      });
      const userId = 'user-456';
      const mockUUID = 'def-456';

      vi.stubGlobal('crypto', {
        randomUUID: vi.fn().mockReturnValue(mockUUID),
      });

      const mockUpload = vi.fn().mockResolvedValue({
        data: { path: `receipts/${userId}/${mockUUID}.png` },
        error: null,
      });

      (mockSupabase.storage.from as any).mockReturnValue({
        upload: mockUpload,
      });

      // Act
      const result = await service.uploadReceipt(mockFile, userId);

      // Assert
      expect(result.file_path).toContain('.png');
      expect(mockUpload).toHaveBeenCalledWith(
        `receipts/${userId}/${mockUUID}.png`,
        expect.any(ArrayBuffer),
        expect.objectContaining({
          contentType: 'image/png',
        })
      );
    });

    it('should handle HEIC files', async () => {
      // Arrange
      const mockFile = new File(['test content'], 'receipt.heic', {
        type: 'image/heic',
      });
      const userId = 'user-789';
      const mockUUID = 'ghi-789';

      vi.stubGlobal('crypto', {
        randomUUID: vi.fn().mockReturnValue(mockUUID),
      });

      const mockUpload = vi.fn().mockResolvedValue({
        data: { path: `receipts/${userId}/${mockUUID}.heic` },
        error: null,
      });

      (mockSupabase.storage.from as any).mockReturnValue({
        upload: mockUpload,
      });

      // Act
      const result = await service.uploadReceipt(mockFile, userId);

      // Assert
      expect(result.file_path).toContain('.heic');
    });

    it('should default to .jpg for unknown MIME types', async () => {
      // Arrange
      const mockFile = new File(['test content'], 'receipt.unknown', {
        type: 'image/unknown',
      });
      const userId = 'user-000';
      const mockUUID = 'xyz-000';

      vi.stubGlobal('crypto', {
        randomUUID: vi.fn().mockReturnValue(mockUUID),
      });

      const mockUpload = vi.fn().mockResolvedValue({
        data: { path: `receipts/${userId}/${mockUUID}.jpg` },
        error: null,
      });

      (mockSupabase.storage.from as any).mockReturnValue({
        upload: mockUpload,
      });

      // Act
      const result = await service.uploadReceipt(mockFile, userId);

      // Assert
      expect(result.file_path).toContain('.jpg');
    });

    it('should throw error when upload fails', async () => {
      // Arrange
      const mockFile = new File(['test content'], 'receipt.jpg', {
        type: 'image/jpeg',
      });
      const userId = 'user-fail';
      const uploadError = { message: 'Storage quota exceeded' };

      const mockUpload = vi.fn().mockResolvedValue({
        data: null,
        error: uploadError,
      });

      (mockSupabase.storage.from as any).mockReturnValue({
        upload: mockUpload,
      });

      vi.stubGlobal('crypto', {
        randomUUID: vi.fn().mockReturnValue('test-uuid'),
      });

      // Act & Assert
      await expect(service.uploadReceipt(mockFile, userId)).rejects.toThrow(
        'Nie udało się przesłać pliku: Storage quota exceeded'
      );
    });

    it('should include user ID in file path for isolation', async () => {
      // Arrange
      const mockFile = new File(['test content'], 'receipt.jpg', {
        type: 'image/jpeg',
      });
      const userId = 'user-isolation-test';
      const mockUUID = 'test-uuid';

      vi.stubGlobal('crypto', {
        randomUUID: vi.fn().mockReturnValue(mockUUID),
      });

      const mockUpload = vi.fn().mockResolvedValue({
        data: { path: `receipts/${userId}/${mockUUID}.jpg` },
        error: null,
      });

      (mockSupabase.storage.from as any).mockReturnValue({
        upload: mockUpload,
      });

      // Act
      await service.uploadReceipt(mockFile, userId);

      // Assert - verify user ID is in the path
      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringContaining(userId),
        expect.any(ArrayBuffer),
        expect.any(Object)
      );
    });
  });

  describe('processReceipt() - Pipeline Integration', () => {
    it('should execute all steps in pipeline and return result', async () => {
      // Arrange
      const filePath = 'receipts/user-123/abc-123.jpg';
      const userId = 'user-123';

      // Mock all Supabase calls for pipeline steps
      // Step 1: Consent Validation
      const mockProfileSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { ai_consent_given: true },
            error: null,
          }),
        }),
      });

      // Step 3: Category Fetch
      const mockCategoriesSelect = vi.fn().mockResolvedValue({
        data: [
          { id: 'cat-1', name: 'Jedzenie' },
          { id: 'cat-2', name: 'Transport' },
        ],
        error: null,
      });

      (mockSupabase.from as any).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return { select: mockProfileSelect };
        }
        if (table === 'categories') {
          return { select: mockCategoriesSelect };
        }
        return {};
      });

      // Step 4: AI Processing
      (mockSupabase.auth.getSession as any).mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      });

      (mockSupabase.functions.invoke as any).mockResolvedValue({
        data: {
          items: [
            { name: 'Chleb', amount: 5.5, category: 'Jedzenie' },
            { name: 'Mleko', amount: 4.2, category: 'Jedzenie' },
          ],
          total: 9.7,
          date: '2024-03-15',
        },
        error: null,
      });

      // Act
      const result = await service.processReceipt(filePath, userId);

      // Assert
      expect(result).toEqual({
        expenses: expect.arrayContaining([
          expect.objectContaining({
            category_id: 'cat-1',
            category_name: 'Jedzenie',
            amount: '9.70',
            items: expect.arrayContaining([
              'Chleb - 5.50',
              'Mleko - 4.20',
            ]),
          }),
        ]),
        total_amount: '9.70',
        currency: 'PLN',
        receipt_date: '2024-03-15',
        processing_time_ms: expect.any(Number),
      });

      // Verify all steps were called
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
      expect(mockSupabase.from).toHaveBeenCalledWith('categories');
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
        'process-receipt',
        expect.any(Object)
      );
    });

    it('should propagate error from ConsentValidationStep', async () => {
      // Arrange
      const filePath = 'receipts/user-123/abc-123.jpg';
      const userId = 'user-123';

      // Mock consent check to fail
      const mockProfileSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { ai_consent_given: false },
            error: null,
          }),
        }),
      });

      (mockSupabase.from as any).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return { select: mockProfileSelect };
        }
        return {};
      });

      // Act & Assert
      await expect(service.processReceipt(filePath, userId)).rejects.toThrow(
        'AI_CONSENT_REQUIRED'
      );
    });

    it('should propagate error from FileOwnershipValidationStep', async () => {
      // Arrange - file path with different user ID
      const filePath = 'receipts/user-999/abc-123.jpg';
      const userId = 'user-123';

      // Mock consent check to pass
      const mockProfileSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { ai_consent_given: true },
            error: null,
          }),
        }),
      });

      (mockSupabase.from as any).mockReturnValue({
        select: mockProfileSelect,
      });

      // Act & Assert
      await expect(service.processReceipt(filePath, userId)).rejects.toThrow(
        'FORBIDDEN'
      );
    });

    it('should propagate error from CategoryFetchStep', async () => {
      // Arrange
      const filePath = 'receipts/user-123/abc-123.jpg';
      const userId = 'user-123';

      // Mock consent check to pass
      const mockProfileSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { ai_consent_given: true },
            error: null,
          }),
        }),
      });

      // Mock categories fetch to fail
      const mockCategoriesSelect = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      (mockSupabase.from as any).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return { select: mockProfileSelect };
        }
        if (table === 'categories') {
          return { select: mockCategoriesSelect };
        }
        return {};
      });

      // Act & Assert
      await expect(service.processReceipt(filePath, userId)).rejects.toThrow(
        'Nie udało się pobrać kategorii'
      );
    });

    it('should propagate error from AIProcessingStep', async () => {
      // Arrange
      const filePath = 'receipts/user-123/abc-123.jpg';
      const userId = 'user-123';

      // Mock consent check to pass
      const mockProfileSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { ai_consent_given: true },
            error: null,
          }),
        }),
      });

      // Mock categories fetch to pass
      const mockCategoriesSelect = vi.fn().mockResolvedValue({
        data: [{ id: 'cat-1', name: 'Jedzenie' }],
        error: null,
      });

      (mockSupabase.from as any).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return { select: mockProfileSelect };
        }
        if (table === 'categories') {
          return { select: mockCategoriesSelect };
        }
        return {};
      });

      // Mock AI processing to fail with rate limit
      (mockSupabase.auth.getSession as any).mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      });

      (mockSupabase.functions.invoke as any).mockResolvedValue({
        data: null,
        error: { message: 'Rate limit exceeded' },
      });

      // Act & Assert
      await expect(service.processReceipt(filePath, userId)).rejects.toThrow(
        'RATE_LIMIT_EXCEEDED'
      );
    });

    it('should handle multiple categories in AI response', async () => {
      // Arrange
      const filePath = 'receipts/user-123/abc-123.jpg';
      const userId = 'user-123';

      // Setup all mocks for successful processing
      const mockProfileSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { ai_consent_given: true },
            error: null,
          }),
        }),
      });

      const mockCategoriesSelect = vi.fn().mockResolvedValue({
        data: [
          { id: 'cat-1', name: 'Jedzenie' },
          { id: 'cat-2', name: 'Transport' },
          { id: 'cat-3', name: 'Inne' },
        ],
        error: null,
      });

      (mockSupabase.from as any).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return { select: mockProfileSelect };
        }
        if (table === 'categories') {
          return { select: mockCategoriesSelect };
        }
        return {};
      });

      (mockSupabase.auth.getSession as any).mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      });

      // Mock AI response with multiple categories
      (mockSupabase.functions.invoke as any).mockResolvedValue({
        data: {
          items: [
            { name: 'Chleb', amount: 5.5, category: 'Jedzenie' },
            { name: 'Bilet autobusowy', amount: 4.0, category: 'Transport' },
            { name: 'Inne', amount: 2.3, category: 'Różne' },
          ],
          total: 11.8,
          date: '2024-03-15',
        },
        error: null,
      });

      // Act
      const result = await service.processReceipt(filePath, userId);

      // Assert - should have 3 expense groups
      expect(result.expenses).toHaveLength(3);
      expect(result.total_amount).toBe('11.80');
      
      // Verify each category was mapped
      const categoryNames = result.expenses.map(e => e.category_name);
      expect(categoryNames).toContain('Jedzenie');
      expect(categoryNames).toContain('Transport');
    });

    it('should measure processing time', async () => {
      // Arrange
      const filePath = 'receipts/user-123/abc-123.jpg';
      const userId = 'user-123';

      // Setup minimal successful pipeline
      const mockProfileSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { ai_consent_given: true },
            error: null,
          }),
        }),
      });

      const mockCategoriesSelect = vi.fn().mockResolvedValue({
        data: [{ id: 'cat-1', name: 'Jedzenie' }],
        error: null,
      });

      (mockSupabase.from as any).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return { select: mockProfileSelect };
        }
        if (table === 'categories') {
          return { select: mockCategoriesSelect };
        }
        return {};
      });

      (mockSupabase.auth.getSession as any).mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      });

      (mockSupabase.functions.invoke as any).mockResolvedValue({
        data: {
          items: [{ name: 'Chleb', amount: 5.5, category: 'Jedzenie' }],
          total: 5.5,
          date: '2024-03-15',
        },
        error: null,
      });

      // Act
      const result = await service.processReceipt(filePath, userId);

      // Assert - processing time should be a non-negative number
      // In unit tests with mocks, operations are so fast they may measure as 0ms
      expect(result.processing_time_ms).toBeGreaterThanOrEqual(0);
      expect(typeof result.processing_time_ms).toBe('number');
    });

    it('should pass context through all pipeline steps', async () => {
      // Arrange
      const filePath = 'receipts/user-123/abc-123.jpg';
      const userId = 'user-123';

      // Setup successful pipeline
      const mockProfileSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { ai_consent_given: true },
            error: null,
          }),
        }),
      });

      const mockCategoriesSelect = vi.fn().mockResolvedValue({
        data: [{ id: 'cat-1', name: 'Jedzenie' }],
        error: null,
      });

      (mockSupabase.from as any).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return { select: mockProfileSelect };
        }
        if (table === 'categories') {
          return { select: mockCategoriesSelect };
        }
        return {};
      });

      (mockSupabase.auth.getSession as any).mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      });

      const mockEdgeFunctionData = {
        items: [{ name: 'Item', amount: 10, category: 'Jedzenie' }],
        total: 10,
        date: '2024-03-15',
      };

      (mockSupabase.functions.invoke as any).mockResolvedValue({
        data: mockEdgeFunctionData,
        error: null,
      });

      // Act
      const result = await service.processReceipt(filePath, userId);

      // Assert - verify context data was preserved
      expect(result.receipt_date).toBe(mockEdgeFunctionData.date);
      expect(result.total_amount).toBe(mockEdgeFunctionData.total.toFixed(2));
      expect(result.currency).toBe('PLN');
    });
  });

  describe('Error Handling', () => {
    it('should throw error if pipeline produces no result', async () => {
      // Arrange - create a service with modified pipeline that doesn't set result
      const mockStep: ProcessingStep = {
        execute: vi.fn().mockImplementation(async (context: ProcessingContext) => {
          // Return context without setting result
          return { ...context };
        }),
      };

      // Replace pipeline with mock step
      (service as any).processingPipeline = [mockStep];

      // Act & Assert
      await expect(
        service.processReceipt('receipts/user-123/test.jpg', 'user-123')
      ).rejects.toThrow('Pipeline failed to produce result');
    });
  });
});