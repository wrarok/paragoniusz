/**
 * Category Mapping Service
 * 
 * Responsible for mapping AI-suggested categories to database categories.
 * Uses fuzzy matching to find the best match for each AI-suggested category.
 * 
 * This service is used by CategoryMappingStep in the receipt processing pipeline.
 */

import type { ProcessReceiptResponseDTO } from '../../types';

/**
 * Service for mapping AI-suggested categories to database categories
 * 
 * Implements intelligent category matching:
 * 1. Exact match (case-insensitive)
 * 2. Partial match (substring matching)
 * 3. Fallback to "Inne" (Other) category
 * 4. Ultimate fallback to first category
 */
export class CategoryMappingService {
  /**
   * Maps AI categories to database categories and builds expense DTOs
   * 
   * Flow:
   * 1. Group items by AI-suggested category
   * 2. For each group:
   *    a. Find best matching database category
   *    b. Calculate total amount for the group
   *    c. Format items with amounts
   *    d. Create expense DTO
   * 
   * @param items - Array of items from AI response with name, amount, and category
   * @param dbCategories - Available database categories with id and name
   * @returns Array of expense DTOs grouped by category
   * 
   * @example
   * ```typescript
   * const mapper = new CategoryMappingService();
   * const expenses = await mapper.mapExpensesWithCategories(
   *   [
   *     { name: 'Jabłka', amount: 5.99, category: 'Jedzenie' },
   *     { name: 'Mleko', amount: 3.99, category: 'Jedzenie' },
   *     { name: 'Benzyna', amount: 200, category: 'Transport' }
   *   ],
   *   [
   *     { id: '1', name: 'Żywność' },
   *     { id: '2', name: 'Transport' },
   *     { id: '3', name: 'Inne' }
   *   ]
   * );
   * // Result: [
   * //   { category_id: '1', category_name: 'Żywność', amount: '9.98', items: ['Jabłka - 5.99', 'Mleko - 3.99'] },
   * //   { category_id: '2', category_name: 'Transport', amount: '200.00', items: ['Benzyna - 200.00'] }
   * // ]
   * ```
   */
  async mapExpensesWithCategories(
    items: Array<{ name: string; amount: number; category: string }>,
    dbCategories: Array<{ id: string; name: string }>
  ): Promise<ProcessReceiptResponseDTO['expenses']> {
    // Group items by AI-suggested category
    const grouped = this.groupItemsByCategory(items);

    const expenses: ProcessReceiptResponseDTO['expenses'] = [];

    for (const [aiCategoryName, categoryItems] of grouped.entries()) {
      // Find best matching database category
      const matchedCategory = this.findBestCategoryMatch(aiCategoryName, dbCategories);

      // Calculate total amount for this category
      const categoryTotal = categoryItems.reduce((sum, item) => sum + item.amount, 0);

      // Format items as strings with amounts
      const formattedItems = categoryItems.map(
        (item) => `${item.name} - ${item.amount.toFixed(2)}`
      );

      expenses.push({
        category_id: matchedCategory.id,
        category_name: matchedCategory.name,
        amount: categoryTotal.toFixed(2),
        items: formattedItems,
      });
    }

    return expenses;
  }

  /**
   * Groups receipt items by their AI-suggested category
   * 
   * Takes flat array of items and groups them by category name.
   * Items with the same category name are grouped together.
   * 
   * @param items - Array of items from AI response
   * @returns Map of category name to array of items
   * @private
   * 
   * @example
   * ```typescript
   * const grouped = this.groupItemsByCategory([
   *   { name: 'Jabłka', amount: 5.99, category: 'Jedzenie' },
   *   { name: 'Mleko', amount: 3.99, category: 'Jedzenie' },
   *   { name: 'Benzyna', amount: 200, category: 'Transport' }
   * ]);
   * // Result: Map {
   * //   'Jedzenie' => [{ name: 'Jabłka', amount: 5.99 }, { name: 'Mleko', amount: 3.99 }],
   * //   'Transport' => [{ name: 'Benzyna', amount: 200 }]
   * // }
   * ```
   */
  private groupItemsByCategory(
    items: Array<{ name: string; amount: number; category: string }>
  ): Map<string, Array<{ name: string; amount: number }>> {
    const grouped = new Map<string, Array<{ name: string; amount: number }>>();

    for (const item of items) {
      const categoryName = item.category;
      const existing = grouped.get(categoryName) || [];
      existing.push({ name: item.name, amount: item.amount });
      grouped.set(categoryName, existing);
    }

    return grouped;
  }

  /**
   * Finds the best matching database category for an AI-suggested category name
   * 
   * Matching strategy (in order of preference):
   * 1. Exact match (case-insensitive) - e.g., "Jedzenie" matches "jedzenie"
   * 2. Partial match (substring) - e.g., "Jedzenie i napoje" matches "Jedzenie"
   * 3. Fallback to "Inne" or "Other" category
   * 4. Ultimate fallback to first category in list
   * 
   * @param aiCategoryName - Category name suggested by AI
   * @param dbCategories - Available database categories
   * @returns Best matching database category
   * @private
   * 
   * @example
   * ```typescript
   * // Exact match
   * findBestCategoryMatch('Jedzenie', [{ id: '1', name: 'Jedzenie' }])
   * // Returns: { id: '1', name: 'Jedzenie' }
   * 
   * // Partial match
   * findBestCategoryMatch('Jedzenie i napoje', [{ id: '1', name: 'Jedzenie' }])
   * // Returns: { id: '1', name: 'Jedzenie' }
   * 
   * // Fallback to "Inne"
   * findBestCategoryMatch('Unknown', [{ id: '1', name: 'Food' }, { id: '2', name: 'Inne' }])
   * // Returns: { id: '2', name: 'Inne' }
   * ```
   */
  private findBestCategoryMatch(
    aiCategoryName: string,
    dbCategories: Array<{ id: string; name: string }>
  ): { id: string; name: string } {
    const normalizedAiName = aiCategoryName.toLowerCase().trim();

    // Try exact match first (case-insensitive)
    const exactMatch = dbCategories.find(
      (cat) => cat.name.toLowerCase() === normalizedAiName
    );
    if (exactMatch) return exactMatch;

    // Try partial match (AI category contains DB category name or vice versa)
    const partialMatch = dbCategories.find(
      (cat) =>
        normalizedAiName.includes(cat.name.toLowerCase()) ||
        cat.name.toLowerCase().includes(normalizedAiName)
    );
    if (partialMatch) return partialMatch;

    // Fallback to "Inne" (Other) category
    const otherCategory = dbCategories.find(
      (cat) => cat.name.toLowerCase() === 'inne' || cat.name.toLowerCase() === 'other'
    );

    // Ultimate fallback: use the first category
    // This ensures the function always returns a valid category
    return otherCategory || dbCategories[0];
  }
}