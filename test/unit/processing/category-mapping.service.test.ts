import { describe, it, expect, beforeEach } from 'vitest';
import { CategoryMappingService } from '../../../src/lib/processing/category-mapping.service';

/**
 * Unit tests for CategoryMappingService
 * 
 * Tests fuzzy category matching logic and expense grouping.
 * 
 * Test coverage:
 * - mapExpensesWithCategories: Main public API
 * - Exact match (case-insensitive)
 * - Partial match (substring matching)
 * - Fallback to "Inne"/"Other"
 * - Ultimate fallback to first category
 * - Item grouping by category
 * - Amount calculation and formatting
 * - Multiple items and categories
 */
describe('CategoryMappingService', () => {
  let service: CategoryMappingService;

  beforeEach(() => {
    service = new CategoryMappingService();
  });

  describe('mapExpensesWithCategories()', () => {
    it('should map single item to exact matching category', async () => {
      // Arrange
      const items = [
        { name: 'Jabłka', amount: 5.99, category: 'Jedzenie' },
      ];
      const dbCategories = [
        { id: 'cat-1', name: 'Jedzenie' },
        { id: 'cat-2', name: 'Transport' },
      ];

      // Act
      const result = await service.mapExpensesWithCategories(items, dbCategories);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        category_id: 'cat-1',
        category_name: 'Jedzenie',
        amount: '5.99',
        items: ['Jabłka - 5.99'],
      });
    });

    it('should group multiple items with same category', async () => {
      // Arrange
      const items = [
        { name: 'Jabłka', amount: 5.99, category: 'Jedzenie' },
        { name: 'Mleko', amount: 3.99, category: 'Jedzenie' },
        { name: 'Chleb', amount: 4.50, category: 'Jedzenie' },
      ];
      const dbCategories = [{ id: 'cat-1', name: 'Jedzenie' }];

      // Act
      const result = await service.mapExpensesWithCategories(items, dbCategories);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        category_id: 'cat-1',
        category_name: 'Jedzenie',
        amount: '14.48', // 5.99 + 3.99 + 4.50
        items: ['Jabłka - 5.99', 'Mleko - 3.99', 'Chleb - 4.50'],
      });
    });

    it('should handle multiple different categories', async () => {
      // Arrange
      const items = [
        { name: 'Jabłka', amount: 5.99, category: 'Jedzenie' },
        { name: 'Mleko', amount: 3.99, category: 'Jedzenie' },
        { name: 'Benzyna', amount: 200, category: 'Transport' },
        { name: 'Bilet autobusowy', amount: 4.50, category: 'Transport' },
      ];
      const dbCategories = [
        { id: 'cat-1', name: 'Jedzenie' },
        { id: 'cat-2', name: 'Transport' },
      ];

      // Act
      const result = await service.mapExpensesWithCategories(items, dbCategories);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        category_id: 'cat-1',
        category_name: 'Jedzenie',
        amount: '9.98',
        items: ['Jabłka - 5.99', 'Mleko - 3.99'],
      });
      expect(result[1]).toEqual({
        category_id: 'cat-2',
        category_name: 'Transport',
        amount: '204.50',
        items: ['Benzyna - 200.00', 'Bilet autobusowy - 4.50'],
      });
    });

    it('should perform case-insensitive exact match', async () => {
      // Arrange
      const items = [
        { name: 'Item', amount: 10, category: 'JEDZENIE' }, // Uppercase
      ];
      const dbCategories = [
        { id: 'cat-1', name: 'jedzenie' }, // Lowercase
      ];

      // Act
      const result = await service.mapExpensesWithCategories(items, dbCategories);

      // Assert
      expect(result[0].category_id).toBe('cat-1');
      expect(result[0].category_name).toBe('jedzenie');
    });

    it('should match when AI category contains DB category name', async () => {
      // Arrange
      const items = [
        { name: 'Item', amount: 10, category: 'Jedzenie i napoje' }, // Contains "Jedzenie"
      ];
      const dbCategories = [
        { id: 'cat-1', name: 'Jedzenie' },
      ];

      // Act
      const result = await service.mapExpensesWithCategories(items, dbCategories);

      // Assert
      expect(result[0].category_id).toBe('cat-1');
      expect(result[0].category_name).toBe('Jedzenie');
    });

    it('should match when DB category contains AI category name', async () => {
      // Arrange
      const items = [
        { name: 'Item', amount: 10, category: 'Jedzenie' },
      ];
      const dbCategories = [
        { id: 'cat-1', name: 'Jedzenie i napoje' }, // Contains "Jedzenie"
      ];

      // Act
      const result = await service.mapExpensesWithCategories(items, dbCategories);

      // Assert
      expect(result[0].category_id).toBe('cat-1');
      expect(result[0].category_name).toBe('Jedzenie i napoje');
    });

    it('should fallback to "Inne" category when no match found', async () => {
      // Arrange
      const items = [
        { name: 'Item', amount: 10, category: 'UnknownCategory' },
      ];
      const dbCategories = [
        { id: 'cat-1', name: 'Jedzenie' },
        { id: 'cat-2', name: 'Transport' },
        { id: 'cat-99', name: 'Inne' }, // Fallback category
      ];

      // Act
      const result = await service.mapExpensesWithCategories(items, dbCategories);

      // Assert
      expect(result[0].category_id).toBe('cat-99');
      expect(result[0].category_name).toBe('Inne');
    });

    it('should fallback to "Other" category when no match found', async () => {
      // Arrange
      const items = [
        { name: 'Item', amount: 10, category: 'UnknownCategory' },
      ];
      const dbCategories = [
        { id: 'cat-1', name: 'Food' },
        { id: 'cat-2', name: 'Transport' },
        { id: 'cat-99', name: 'Other' }, // English fallback category
      ];

      // Act
      const result = await service.mapExpensesWithCategories(items, dbCategories);

      // Assert
      expect(result[0].category_id).toBe('cat-99');
      expect(result[0].category_name).toBe('Other');
    });

    it('should use first category as ultimate fallback', async () => {
      // Arrange
      const items = [
        { name: 'Item', amount: 10, category: 'UnknownCategory' },
      ];
      const dbCategories = [
        { id: 'cat-1', name: 'Food' },
        { id: 'cat-2', name: 'Transport' },
        // No "Inne" or "Other" category
      ];

      // Act
      const result = await service.mapExpensesWithCategories(items, dbCategories);

      // Assert
      expect(result[0].category_id).toBe('cat-1'); // First category
      expect(result[0].category_name).toBe('Food');
    });

    it('should format amounts with 2 decimal places', async () => {
      // Arrange
      const items = [
        { name: 'Item 1', amount: 5, category: 'Test' },
        { name: 'Item 2', amount: 3.5, category: 'Test' },
        { name: 'Item 3', amount: 1.123, category: 'Test' },
      ];
      const dbCategories = [{ id: 'cat-1', name: 'Test' }];

      // Act
      const result = await service.mapExpensesWithCategories(items, dbCategories);

      // Assert
      expect(result[0].amount).toBe('9.62'); // 5 + 3.5 + 1.123
      expect(result[0].items).toEqual([
        'Item 1 - 5.00',
        'Item 2 - 3.50',
        'Item 3 - 1.12',
      ]);
    });

    it('should handle empty items array', async () => {
      // Arrange
      const items: Array<{ name: string; amount: number; category: string }> = [];
      const dbCategories = [{ id: 'cat-1', name: 'Test' }];

      // Act
      const result = await service.mapExpensesWithCategories(items, dbCategories);

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle Polish category names with special characters', async () => {
      // Arrange
      const items = [
        { name: 'Item', amount: 10, category: 'Żywność' },
      ];
      const dbCategories = [
        { id: 'cat-1', name: 'Żywność' },
      ];

      // Act
      const result = await service.mapExpensesWithCategories(items, dbCategories);

      // Assert
      expect(result[0].category_id).toBe('cat-1');
      expect(result[0].category_name).toBe('Żywność');
    });

    it('should trim whitespace in category names', async () => {
      // Arrange
      const items = [
        { name: 'Item', amount: 10, category: '  Jedzenie  ' }, // Whitespace
      ];
      const dbCategories = [
        { id: 'cat-1', name: 'Jedzenie' },
      ];

      // Act
      const result = await service.mapExpensesWithCategories(items, dbCategories);

      // Assert
      expect(result[0].category_id).toBe('cat-1');
    });

    it('should preserve item order within category', async () => {
      // Arrange
      const items = [
        { name: 'First', amount: 1, category: 'Test' },
        { name: 'Second', amount: 2, category: 'Test' },
        { name: 'Third', amount: 3, category: 'Test' },
      ];
      const dbCategories = [{ id: 'cat-1', name: 'Test' }];

      // Act
      const result = await service.mapExpensesWithCategories(items, dbCategories);

      // Assert
      expect(result[0].items).toEqual([
        'First - 1.00',
        'Second - 2.00',
        'Third - 3.00',
      ]);
    });

    it('should handle zero amounts', async () => {
      // Arrange
      const items = [
        { name: 'Free item', amount: 0, category: 'Test' },
      ];
      const dbCategories = [{ id: 'cat-1', name: 'Test' }];

      // Act
      const result = await service.mapExpensesWithCategories(items, dbCategories);

      // Assert
      expect(result[0].amount).toBe('0.00');
      expect(result[0].items).toEqual(['Free item - 0.00']);
    });

    it('should handle large amounts', async () => {
      // Arrange
      const items = [
        { name: 'Expensive item', amount: 999999.99, category: 'Test' },
      ];
      const dbCategories = [{ id: 'cat-1', name: 'Test' }];

      // Act
      const result = await service.mapExpensesWithCategories(items, dbCategories);

      // Assert
      expect(result[0].amount).toBe('999999.99');
      expect(result[0].items).toEqual(['Expensive item - 999999.99']);
    });

    it('should prefer exact match over partial match', async () => {
      // Arrange
      const items = [
        { name: 'Item', amount: 10, category: 'Transport' },
      ];
      const dbCategories = [
        { id: 'cat-1', name: 'Transport i logistyka' }, // Partial match
        { id: 'cat-2', name: 'Transport' }, // Exact match
      ];

      // Act
      const result = await service.mapExpensesWithCategories(items, dbCategories);

      // Assert
      expect(result[0].category_id).toBe('cat-2'); // Exact match preferred
      expect(result[0].category_name).toBe('Transport');
    });

    it('should handle real-world receipt scenario', async () => {
      // Arrange - realistic receipt with mixed categories
      const items = [
        { name: 'Chleb', amount: 3.50, category: 'Pieczywo' },
        { name: 'Mleko', amount: 4.20, category: 'Nabiał' },
        { name: 'Ser żółty', amount: 12.99, category: 'Nabiał' },
        { name: 'Jabłka', amount: 5.99, category: 'Owoce i warzywa' },
        { name: 'Ziemniaki', amount: 3.50, category: 'Owoce i warzywa' },
      ];
      const dbCategories = [
        { id: 'cat-1', name: 'Żywność' },
        { id: 'cat-2', name: 'Transport' },
        { id: 'cat-3', name: 'Inne' },
      ];

      // Act
      const result = await service.mapExpensesWithCategories(items, dbCategories);

      // Assert
      expect(result).toHaveLength(3); // 3 different AI categories
      
      // All should fallback to "Inne" since no exact match exists
      const inneExpenses = result.filter(e => e.category_name === 'Inne');
      expect(inneExpenses.length).toBeGreaterThan(0);
    });
  });
});