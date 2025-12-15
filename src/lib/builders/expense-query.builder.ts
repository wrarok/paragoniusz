import type { SupabaseClient } from "../../db/supabase.client";

/**
 * Builder for constructing Supabase queries for expenses
 *
 * Eliminates duplication between main queries and count queries.
 * Provides fluent API for building complex queries with filters, sorting, and pagination.
 *
 * @example
 * ```typescript
 * const builder = new ExpenseQueryBuilder()
 *   .withDateRange('2024-01-01', '2024-12-31')
 *   .withCategory('uuid-here')
 *   .withSort('expense_date.desc')
 *   .withPagination(0, 50);
 *
 * const expenses = await repository.findMany(builder);
 * const total = await repository.count(builder);
 * ```
 */
export class ExpenseQueryBuilder {
  private filters: Record<string, unknown> = {};
  private sortConfig?: { column: string; ascending: boolean };
  private paginationConfig?: { offset: number; limit: number };

  /**
   * Add date range filter
   * @param from - Start date (ISO format YYYY-MM-DD)
   * @param to - End date (ISO format YYYY-MM-DD)
   * @returns this builder for chaining
   */
  withDateRange(from?: string, to?: string): this {
    if (from) {
      this.filters.from_date = from;
    }
    if (to) {
      this.filters.to_date = to;
    }
    return this;
  }

  /**
   * Add category filter
   * @param categoryId - Category UUID
   * @returns this builder for chaining
   */
  withCategory(categoryId?: string): this {
    if (categoryId) {
      this.filters.category_id = categoryId;
    }
    return this;
  }

  /**
   * Add sorting
   * @param sort - Format: "column.direction" (e.g., "expense_date.desc")
   * @returns this builder for chaining
   */
  withSort(sort: string): this {
    const [column, direction] = sort.split(".");
    this.sortConfig = {
      column,
      ascending: direction === "asc",
    };
    return this;
  }

  /**
   * Add pagination
   * @param offset - Number of records to skip
   * @param limit - Maximum number of records to return
   * @returns this builder for chaining
   */
  withPagination(offset: number, limit: number): this {
    this.paginationConfig = { offset, limit };
    return this;
  }

  /**
   * Build main query with all filters, sorting, and pagination
   * @param supabase - Supabase client instance
   * @returns Postgrest query ready for execution
   */
  build(supabase: SupabaseClient) {
    let query = supabase.from("expenses").select(`*, category:categories(id, name)`);

    // Apply filters
    query = this.applyFilters(query);

    // Apply sorting
    if (this.sortConfig) {
      query = query.order(this.sortConfig.column, {
        ascending: this.sortConfig.ascending,
      });
    }

    // Apply pagination
    if (this.paginationConfig) {
      const { offset, limit } = this.paginationConfig;
      query = query.range(offset, offset + limit - 1);
    }

    return query;
  }

  /**
   * Build count query with same filters but no pagination
   *
   * This ensures that filters are applied consistently between
   * the main data query and the count query, eliminating duplication.
   *
   * @param supabase - Supabase client instance
   * @returns Postgrest count query ready for execution
   */
  buildCountQuery(supabase: SupabaseClient) {
    let query = supabase.from("expenses").select("*", { count: "exact", head: true });

    // Apply same filters as main query (no pagination or sorting)
    query = this.applyFilters(query);

    return query;
  }

  /**
   * Apply filters to query
   *
   * Centralizes filter application logic to ensure consistency
   * between main queries and count queries.
   *
   * @param query - Postgrest query builder
   * @returns Modified query with filters applied
   * @private
   */
  private applyFilters(query: unknown): unknown {
    const typedQuery = query as Record<string, (...args: unknown[]) => unknown>;
    if (this.filters.from_date) {
      query = typedQuery.gte("expense_date", this.filters.from_date);
    }
    if (this.filters.to_date) {
      query = typedQuery.lte("expense_date", this.filters.to_date);
    }
    if (this.filters.category_id) {
      query = typedQuery.eq("category_id", this.filters.category_id);
    }
    return query;
  }

  /**
   * Reset builder to initial state
   *
   * Useful for reusing the same builder instance for multiple queries.
   *
   * @returns this builder for chaining
   */
  reset(): this {
    this.filters = {};
    this.sortConfig = undefined;
    this.paginationConfig = undefined;
    return this;
  }
}
