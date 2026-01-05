# Plan Refaktoryzacji Serwisów TypeScript - Projekt Paragoniusz

## Kontekst Projektu

Pracujemy nad aplikacją **Paragoniusz** - systemem do zarządzania wydatkami wykorzystującym:

- **Backend:** Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Frontend:** Astro 5 + React 19 + TypeScript 5
- **Testing:** Vitest (70% coverage threshold), Playwright (E2E)
- **AI Integration:** OpenRouter.ai dla przetwarzania paragonów

Pełny stos technologiczny: [tech-stack.md](tech-stack.md)

## Zadanie

Przeprowadź kompleksową refaktoryzację trzech serwisów TypeScript, które obecnie naruszają zasady SOLID i mają wysoką złożoność cyklomatyczną:

1. **expense.service.ts** (428 LOC) - Operacje CRUD dla wydatków
2. **openrouter.service.ts** (418 LOC) - Klient API dla OpenRouter
3. **receipt.service.ts** (287 LOC) - Upload i przetwarzanie paragonów AI

---

## Zidentyfikowane Problemy

### 1. expense.service.ts (428 LOC)

#### Problemy:

- ❌ **Naruszenie SRP** - 7 różnych operacji w jednym pliku
  - `validateCategories()` - linie 18-42
  - `createExpensesBatch()` - linie 51-102
  - `listExpenses()` - linie 112-202
  - `getExpenseById()` - linie 213-252
  - `createExpense()` - linie 264-311
  - `updateExpense()` - linie 322-390
  - `deleteExpense()` - linie 400-428

- ❌ **Duplikacja kodu** - 4x identyczna transformacja do `ExpenseDTO`
  - Linie 86-101 (createExpensesBatch)
  - Linie 180-195 (listExpenses)
  - Linie 236-251 (getExpenseById)
  - Linie 295-310 (createExpense)
  - Linie 370-385 (updateExpense)

- ❌ **Query duplication** - Duplikacja filtrów między głównym zapytaniem a count query
  - Linie 142-150 (main query filters)
  - Linie 162-170 (count query filters)

- ❌ **Słaba separacja concerns** - mieszanie logiki biznesowej z transformacją danych

#### Metryki:

- **LOC:** 428
- **Funkcje:** 7
- **Złożoność cyklomatyczna:** ~8-12 per funkcja
- **Duplikacja:** ~25% kodu

---

### 2. openrouter.service.ts (418 LOC)

#### Problemy:

- ❌ **God Class** - jedna klasa łączy zbyt wiele odpowiedzialności:
  - HTTP client (linie 279-336)
  - Retry logic (linie 383-417)
  - Error handling (linie 348-367)
  - Timeout management (linie 280-281, 334)
  - Request building (linie 220-260)

- ❌ **Tight coupling** - bezpośrednie użycie `fetch` zamiast abstrakcji (linia 284)

- ❌ **Słaba testability** - trudno mockować:
  - `fetch` API
  - `setTimeout`
  - `AbortController`

- ❌ **Manual parameter building** - verbose kod (linie 246-257):
  ```typescript
  if (options.parameters) {
    if (options.parameters.temperature !== undefined) {
      request.temperature = options.parameters.temperature;
    }
    // ... 3 więcej takich bloków
  }
  ```

#### Metryki:

- **LOC:** 418
- **Metody:** 6 (1 public, 5 private)
- **Zależności:** Direct coupling do fetch, setTimeout
- **Złożoność cyklomatyczna:** ~15 dla `chatCompletion()`

---

### 3. receipt.service.ts (287 LOC)

#### Problemy:

- ❌ **Długa metoda** - `processReceipt()` ma 92 linie (linie 93-184):
  - Step 1: Verify AI consent (linie 100-112)
  - Step 2: Verify file ownership (linie 115-119)
  - Step 3: Fetch categories (linie 122-128)
  - Step 4: Call Edge Function (linie 131-153)
  - Step 5: Transform response (linie 159-183)

- ❌ **Mixed concerns** - łączy wiele odpowiedzialności:
  - Upload plików
  - Wywołanie AI
  - Mapowanie kategorii
  - Transformacja danych
  - Walidacja uprawnień

- ❌ **Pipeline bez abstrakcji** - sekwencyjne kroki bez możliwości:
  - Testowania osobno
  - Reużycia w innych kontekstach
  - Łatwej wymiany implementacji

#### Metryki:

- **LOC:** 287
- **Metody:** 5 (2 public, 3 private)
- **Złożoność:** `processReceipt()` - 92 LOC, 5 kroków
- **Testability:** Niska (monolityczna metoda)

---

## Wymagania Refaktoryzacji

### Zasady Ogólne

1. ✅ **Zastosuj SOLID principles**
   - **S**ingle Responsibility Principle
   - **O**pen/Closed Principle
   - **L**iskov Substitution Principle
   - **I**nterface Segregation Principle
   - **D**ependency Inversion Principle

2. ✅ **Eliminuj duplikację kodu** (DRY principle)

3. ✅ **Zwiększ testability** - łatwe mockowanie zależności

4. ✅ **Zachowaj backward compatibility** - nie zmieniaj public API bez zgody

5. ✅ **Dodaj testy jednostkowe** - minimum 70% coverage (Vitest)

### Metryki Docelowe

| Metryka                 | Przed | Po   | Cel                     |
| ----------------------- | ----- | ---- | ----------------------- |
| Średnia LOC per plik    | 378   | <150 | ✅ -60%                 |
| Liczba plików           | 3     | 13   | +10 modułów             |
| Duplikacja kodu         | ~25%  | <5%  | ✅ -80%                 |
| Test coverage           | ?     | >70% | ✅ Zgodnie z tech-stack |
| Złożoność cyklomatyczna | 8-15  | <5   | ✅ -67%                 |

---

## Wzorce do Zastosowania

### expense.service.ts → Cztery Moduły

#### A) Repository Pattern

**Plik:** `src/lib/repositories/expense.repository.ts` (NEW - 180 LOC)

**Odpowiedzialność:** Izolacja dostępu do danych (Supabase)

```typescript
import type { SupabaseClient } from "../../db/supabase.client";
import type { ExpenseQueryBuilder } from "../builders/expense-query.builder";

/**
 * Repository for expense data access operations
 *
 * Provides abstraction over Supabase client for expense-related queries.
 * All methods return database entities, not DTOs.
 */
export class ExpenseRepository {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Find expense by ID
   * @returns Database expense with nested category or null if not found
   */
  async findById(id: string): Promise<DatabaseExpense | null> {
    const { data, error } = await this.supabase
      .from("expenses")
      .select(`*, category:categories(id, name)`)
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }

    return data;
  }

  /**
   * Find multiple expenses using query builder
   * @returns Array of database expenses with nested categories
   */
  async findMany(queryBuilder: ExpenseQueryBuilder): Promise<DatabaseExpense[]> {
    const query = queryBuilder.build(this.supabase);
    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch expenses: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Count expenses matching query builder filters
   * @returns Total count of matching expenses
   */
  async count(queryBuilder: ExpenseQueryBuilder): Promise<number> {
    const query = queryBuilder.buildCountQuery(this.supabase);
    const { count, error } = await query;

    if (error) {
      throw new Error(`Failed to count expenses: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * Create single expense
   * @returns Created expense with nested category
   */
  async create(data: InsertExpense): Promise<DatabaseExpense> {
    const { data: created, error } = await this.supabase
      .from("expenses")
      .insert(data)
      .select(`*, category:categories(id, name)`)
      .single();

    if (error) throw error;
    return created;
  }

  /**
   * Create multiple expenses in single transaction
   * @returns Array of created expenses with nested categories
   */
  async createBatch(data: InsertExpense[]): Promise<DatabaseExpense[]> {
    const { data: created, error } = await this.supabase
      .from("expenses")
      .insert(data)
      .select(`*, category:categories(id, name)`);

    if (error) throw error;
    return created;
  }

  /**
   * Update expense by ID
   * @returns Updated expense with nested category or null if not found
   */
  async update(id: string, data: Partial<InsertExpense>): Promise<DatabaseExpense | null> {
    const { data: updated, error } = await this.supabase
      .from("expenses")
      .update(data)
      .eq("id", id)
      .select(`*, category:categories(id, name)`)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }

    return updated;
  }

  /**
   * Delete expense by ID
   * @returns true if deleted, false if not found
   */
  async delete(id: string): Promise<boolean> {
    const { error, count } = await this.supabase.from("expenses").delete({ count: "exact" }).eq("id", id);

    if (error) throw error;
    return count > 0;
  }

  /**
   * Validate that category IDs exist in database
   * @returns List of invalid IDs
   */
  async validateCategories(categoryIds: string[]): Promise<string[]> {
    if (categoryIds.length === 0) return [];

    const { data, error } = await this.supabase.from("categories").select("id").in("id", categoryIds);

    if (error) throw error;

    const validIds = new Set(data.map((c) => c.id));
    return categoryIds.filter((id) => !validIds.has(id));
  }
}

// Types
interface DatabaseExpense {
  id: string;
  user_id: string;
  category_id: string;
  amount: number;
  expense_date: string;
  currency: string;
  created_by_ai: boolean;
  was_ai_suggestion_edited: boolean;
  created_at: string;
  updated_at: string;
  category?: { id: string; name: string };
}

interface InsertExpense {
  user_id: string;
  category_id: string;
  amount: number;
  expense_date: string;
  currency: string;
  created_by_ai: boolean;
  was_ai_suggestion_edited: boolean;
}
```

**Korzyści:**

- ✅ Izolacja Supabase od logiki biznesowej
- ✅ Łatwe mockowanie w testach
- ✅ Możliwość zmiany storage backend bez zmian w service
- ✅ Reużywalność zapytań

---

#### B) Query Builder Pattern

**Plik:** `src/lib/builders/expense-query.builder.ts` (NEW - 120 LOC)

**Odpowiedzialność:** Budowanie zapytań Supabase z eliminacją duplikacji

```typescript
import type { SupabaseClient } from "../../db/supabase.client";
import type { PostgrestFilterBuilder } from "@supabase/postgrest-js";

/**
 * Builder for constructing Supabase queries for expenses
 *
 * Eliminates duplication between main queries and count queries.
 * Provides fluent API for building complex queries.
 */
export class ExpenseQueryBuilder {
  private filters: Record<string, any> = {};
  private sortConfig?: { column: string; ascending: boolean };
  private paginationConfig?: { offset: number; limit: number };

  /**
   * Add date range filter
   */
  withDateRange(from?: string, to?: string): this {
    if (from) this.filters.from_date = from;
    if (to) this.filters.to_date = to;
    return this;
  }

  /**
   * Add category filter
   */
  withCategory(categoryId?: string): this {
    if (categoryId) this.filters.category_id = categoryId;
    return this;
  }

  /**
   * Add sorting
   * @param sort Format: "column.direction" (e.g., "expense_date.desc")
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
   */
  withPagination(offset: number, limit: number): this {
    this.paginationConfig = { offset, limit };
    return this;
  }

  /**
   * Build main query with all filters, sorting, and pagination
   */
  build(supabase: SupabaseClient): PostgrestFilterBuilder<any, any, any> {
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
   */
  buildCountQuery(supabase: SupabaseClient): PostgrestFilterBuilder<any, any, any> {
    let query = supabase.from("expenses").select("*", { count: "exact", head: true });

    // Apply same filters as main query
    query = this.applyFilters(query);

    return query;
  }

  /**
   * Apply filters to query
   * @private
   */
  private applyFilters(query: PostgrestFilterBuilder<any, any, any>): PostgrestFilterBuilder<any, any, any> {
    if (this.filters.from_date) {
      query = query.gte("expense_date", this.filters.from_date);
    }
    if (this.filters.to_date) {
      query = query.lte("expense_date", this.filters.to_date);
    }
    if (this.filters.category_id) {
      query = query.eq("category_id", this.filters.category_id);
    }
    return query;
  }

  /**
   * Reset builder to initial state
   */
  reset(): this {
    this.filters = {};
    this.sortConfig = undefined;
    this.paginationConfig = undefined;
    return this;
  }
}
```

**Korzyści:**

- ✅ Eliminacja duplikacji filtrów (linie 142-150 vs 162-170)
- ✅ Fluent API dla czytelności
- ✅ Łatwe dodawanie nowych filtrów
- ✅ Testability - builder można testować niezależnie

---

#### C) Transformer Service

**Plik:** `src/lib/transformers/expense.transformer.ts` (NEW - 60 LOC)

**Odpowiedzialność:** Transformacja między database entities a DTOs

```typescript
import type { ExpenseDTO, CreateExpenseCommand, BatchExpenseItem, CategoryDTO } from "../../types";

/**
 * Transformer for converting between database entities and DTOs
 *
 * Eliminates duplication of transformation logic (4x in original code).
 * Provides single source of truth for data transformation.
 */
export class ExpenseTransformer {
  /**
   * Transform single database expense to DTO
   */
  static toDTO(dbExpense: DatabaseExpense): ExpenseDTO {
    return {
      id: dbExpense.id,
      user_id: dbExpense.user_id,
      category_id: dbExpense.category_id,
      amount: dbExpense.amount.toString(),
      expense_date: dbExpense.expense_date,
      currency: dbExpense.currency,
      created_by_ai: dbExpense.created_by_ai,
      was_ai_suggestion_edited: dbExpense.was_ai_suggestion_edited,
      created_at: dbExpense.created_at,
      updated_at: dbExpense.updated_at,
      category: {
        id: dbExpense.category.id,
        name: dbExpense.category.name,
      } as CategoryDTO,
    };
  }

  /**
   * Transform array of database expenses to DTOs
   */
  static toDTOList(dbExpenses: DatabaseExpense[]): ExpenseDTO[] {
    return dbExpenses.map((expense) => this.toDTO(expense));
  }

  /**
   * Transform CreateExpenseCommand to InsertExpense
   */
  static toInsertData(command: CreateExpenseCommand, userId: string): InsertExpense {
    return {
      user_id: userId,
      category_id: command.category_id,
      amount: command.amount,
      expense_date: command.expense_date,
      currency: command.currency || "PLN",
      created_by_ai: false,
      was_ai_suggestion_edited: false,
    };
  }

  /**
   * Transform batch items to insert data
   */
  static toBatchInsertData(items: BatchExpenseItem[], userId: string): InsertExpense[] {
    return items.map((item) => ({
      user_id: userId,
      category_id: item.category_id,
      amount: parseFloat(item.amount),
      expense_date: item.expense_date,
      currency: item.currency || "PLN",
      created_by_ai: item.created_by_ai ?? false,
      was_ai_suggestion_edited: item.was_ai_suggestion_edited ?? false,
    }));
  }

  /**
   * Transform UpdateExpenseCommand to partial InsertExpense
   */
  static toUpdateData(command: UpdateExpenseCommand): Partial<InsertExpense> {
    const updateData: Partial<InsertExpense> = {};

    if (command.category_id !== undefined) {
      updateData.category_id = command.category_id;
    }
    if (command.amount !== undefined) {
      updateData.amount = command.amount;
    }
    if (command.expense_date !== undefined) {
      updateData.expense_date = command.expense_date;
    }
    if (command.currency !== undefined) {
      updateData.currency = command.currency;
    }

    return updateData;
  }
}

// Types (same as in repository)
interface DatabaseExpense {
  id: string;
  user_id: string;
  category_id: string;
  amount: number;
  expense_date: string;
  currency: string;
  created_by_ai: boolean;
  was_ai_suggestion_edited: boolean;
  created_at: string;
  updated_at: string;
  category: { id: string; name: string };
}

interface InsertExpense {
  user_id: string;
  category_id: string;
  amount: number;
  expense_date: string;
  currency: string;
  created_by_ai: boolean;
  was_ai_suggestion_edited: boolean;
}
```

**Korzyści:**

- ✅ Eliminacja 4x duplikacji transformacji (linie 86-101, 180-195, 236-251, 295-310, 370-385)
- ✅ Single source of truth
- ✅ Łatwe testowanie transformacji
- ✅ Type safety

---

#### D) Service Layer (Refactored)

**Plik:** `src/lib/services/expense.service.ts` (REFACTORED - 150 LOC)

**Odpowiedzialność:** Tylko logika biznesowa + orchestration

```typescript
import { ExpenseRepository } from "../repositories/expense.repository";
import { ExpenseQueryBuilder } from "../builders/expense-query.builder";
import { ExpenseTransformer } from "../transformers/expense.transformer";
import type {
  ExpenseDTO,
  ExpenseListDTO,
  ExpenseQueryParams,
  CreateExpenseCommand,
  UpdateExpenseCommand,
  BatchExpenseItem,
} from "../../types";

/**
 * Service for expense business logic
 *
 * Orchestrates repository, query builder, and transformer.
 * Contains only business logic, no data access or transformation code.
 */
export class ExpenseService {
  constructor(
    private repository: ExpenseRepository,
    private queryBuilder: ExpenseQueryBuilder,
    private transformer: ExpenseTransformer
  ) {}

  /**
   * Validate that category IDs exist
   */
  async validateCategories(categoryIds: string[]): Promise<{ valid: boolean; invalidIds: string[] }> {
    const invalidIds = await this.repository.validateCategories(categoryIds);
    return {
      valid: invalidIds.length === 0,
      invalidIds,
    };
  }

  /**
   * Create multiple expenses in batch
   */
  async createBatch(userId: string, expenses: BatchExpenseItem[]): Promise<ExpenseDTO[]> {
    const insertData = this.transformer.toBatchInsertData(expenses, userId);
    const created = await this.repository.createBatch(insertData);
    return this.transformer.toDTOList(created);
  }

  /**
   * List expenses with filtering, sorting, and pagination
   */
  async list(params: ExpenseQueryParams): Promise<ExpenseListDTO> {
    const { limit = 50, offset = 0, from_date, to_date, category_id, sort = "expense_date.desc" } = params;

    // Build query using query builder
    this.queryBuilder
      .reset()
      .withDateRange(from_date, to_date)
      .withCategory(category_id)
      .withSort(sort)
      .withPagination(offset, limit);

    // Execute queries
    const [expenses, total] = await Promise.all([
      this.repository.findMany(this.queryBuilder),
      this.repository.count(this.queryBuilder),
    ]);

    // Transform to DTOs
    const expenseDTOs = this.transformer.toDTOList(expenses);

    return {
      data: expenseDTOs,
      count: expenseDTOs.length,
      total,
    };
  }

  /**
   * Get single expense by ID
   */
  async getById(expenseId: string): Promise<ExpenseDTO | null> {
    const expense = await this.repository.findById(expenseId);
    return expense ? this.transformer.toDTO(expense) : null;
  }

  /**
   * Create single expense
   */
  async create(userId: string, expenseData: CreateExpenseCommand): Promise<ExpenseDTO> {
    const insertData = this.transformer.toInsertData(expenseData, userId);
    const created = await this.repository.create(insertData);
    return this.transformer.toDTO(created);
  }

  /**
   * Update expense by ID
   */
  async update(expenseId: string, updateData: UpdateExpenseCommand): Promise<ExpenseDTO | null> {
    const updatePayload = this.transformer.toUpdateData(updateData);
    const updated = await this.repository.update(expenseId, updatePayload);
    return updated ? this.transformer.toDTO(updated) : null;
  }

  /**
   * Delete expense by ID
   */
  async delete(expenseId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const deleted = await this.repository.delete(expenseId);

      if (!deleted) {
        return { success: false, error: "Expense not found" };
      }

      return { success: true };
    } catch (error) {
      console.error("Unexpected error in deleteExpense:", error);
      return {
        success: false,
        error: "An unexpected error occurred",
      };
    }
  }
}

// Factory function for backward compatibility
export function createExpenseService(supabase: SupabaseClient): ExpenseService {
  const repository = new ExpenseRepository(supabase);
  const queryBuilder = new ExpenseQueryBuilder();
  const transformer = ExpenseTransformer;

  return new ExpenseService(repository, queryBuilder, transformer);
}

// Backward compatibility - export individual functions
export async function validateCategories(
  supabase: SupabaseClient,
  categoryIds: string[]
): Promise<{ valid: boolean; invalidIds: string[] }> {
  const service = createExpenseService(supabase);
  return service.validateCategories(categoryIds);
}

export async function createExpensesBatch(
  supabase: SupabaseClient,
  userId: string,
  expenses: BatchExpenseItem[]
): Promise<ExpenseDTO[]> {
  const service = createExpenseService(supabase);
  return service.createBatch(userId, expenses);
}

export async function listExpenses(supabase: SupabaseClient, params: ExpenseQueryParams): Promise<ExpenseListDTO> {
  const service = createExpenseService(supabase);
  return service.list(params);
}

export async function getExpenseById(supabase: SupabaseClient, expenseId: string): Promise<ExpenseDTO | null> {
  const service = createExpenseService(supabase);
  return service.getById(expenseId);
}

export async function createExpense(
  supabase: SupabaseClient,
  userId: string,
  expenseData: CreateExpenseCommand
): Promise<ExpenseDTO> {
  const service = createExpenseService(supabase);
  return service.create(userId, expenseData);
}

export async function updateExpense(
  supabase: SupabaseClient,
  expenseId: string,
  updateData: UpdateExpenseCommand
): Promise<ExpenseDTO | null> {
  const service = createExpenseService(supabase);
  return service.update(expenseId, updateData);
}

export async function deleteExpense(
  supabase: SupabaseClient,
  expenseId: string
): Promise<{ success: boolean; error?: string }> {
  const service = createExpenseService(supabase);
  return service.delete(expenseId);
}
```

**Korzyści:**

- ✅ Redukcja z 428 → 150 LOC (65% redukcja)
- ✅ Separation of concerns
- ✅ Łatwe testowanie (mockowanie zależności)
- ✅ Backward compatibility (export individual functions)
- ✅ Parallel queries dla lepszej wydajności (list method)

---

### openrouter.service.ts → Cztery Moduły

#### A) HTTP Client Service

**Plik:** `src/lib/http/http-client.service.ts` (NEW - 100 LOC)

**Odpowiedzialność:** Abstrakcja fetch API z timeout handling

```typescript
/**
 * HTTP Client Service with timeout support
 *
 * Provides abstraction over fetch API with:
 * - Timeout management using AbortController
 * - JSON parsing
 * - Error handling
 */
export class HTTPClientService {
  /**
   * POST request with timeout
   */
  async postWithTimeout<T>(url: string, body: unknown, timeout: number, headers?: Record<string, string>): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("REQUEST_TIMEOUT");
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * POST request without timeout
   */
  async post<T>(url: string, body: unknown, headers?: Record<string, string>): Promise<T> {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }
}
```

**Korzyści:**

- ✅ Abstrakcja fetch (łatwe mockowanie)
- ✅ Reużywalny timeout logic
- ✅ Testability

---

#### B) Retry Strategy

**Plik:** `src/lib/strategies/retry.strategy.ts` (NEW - 60 LOC)

**Odpowiedzialność:** Izolacja retry logic z exponential backoff

```typescript
/**
 * Interface for retry strategies
 */
export interface RetryStrategy {
  shouldRetry(error: Error, attempt: number): boolean;
  getDelay(attempt: number): number;
}

/**
 * Exponential backoff retry strategy
 *
 * Implements exponential backoff with configurable parameters.
 * Does not retry for certain error types (auth, validation, timeout).
 */
export class ExponentialBackoffStrategy implements RetryStrategy {
  constructor(
    private maxAttempts: number = 3,
    private baseDelay: number = 1000,
    private nonRetryableErrors: Set<string> = new Set(["AuthenticationError", "ValidationError", "TimeoutError"])
  ) {}

  /**
   * Determine if error should be retried
   */
  shouldRetry(error: Error, attempt: number): boolean {
    // Don't retry on last attempt
    if (attempt >= this.maxAttempts) {
      return false;
    }

    // Don't retry certain error types
    if (this.nonRetryableErrors.has(error.constructor.name)) {
      return false;
    }

    return true;
  }

  /**
   * Calculate delay for retry attempt using exponential backoff
   */
  getDelay(attempt: number): number {
    return this.baseDelay * Math.pow(2, attempt);
  }
}

/**
 * Helper to execute operation with retry logic
 */
export async function withRetry<T>(operation: () => Promise<T>, strategy: RetryStrategy): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (!strategy.shouldRetry(lastError, attempt)) {
        throw error;
      }

      const delay = strategy.getDelay(attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}
```

**Korzyści:**

- ✅ Strategy Pattern (wymienne strategie)
- ✅ Testable bez czekania na timeouty
- ✅ Reużywalny w innych serwisach

---

#### C) Request Builder

**Plik:** `src/lib/builders/openrouter-request.builder.ts` (NEW - 80 LOC)

**Odpowiedzialność:** Fluent API dla budowania requestów OpenRouter

```typescript
import type {
  OpenRouterRequest,
  ResponseSchema,
  ResponseFormat,
  ContentMessage,
  ModelParameters,
} from "../../types/openrouter.types";

/**
 * Builder for OpenRouter API requests
 *
 * Provides fluent API for constructing requests.
 * Eliminates verbose conditional parameter building.
 */
export class OpenRouterRequestBuilder {
  private request: Partial<OpenRouterRequest> = {};

  /**
   * Set model
   */
  withModel(model: string): this {
    this.request.model = model;
    return this;
  }

  /**
   * Set system message
   */
  withSystemMessage(message: string): this {
    if (!this.request.messages) {
      this.request.messages = [];
    }
    this.request.messages.push({
      role: "system",
      content: message,
    });
    return this;
  }

  /**
   * Set user message
   */
  withUserMessage(message: ContentMessage): this {
    if (!this.request.messages) {
      this.request.messages = [];
    }
    this.request.messages.push({
      role: "user",
      content: message,
    });
    return this;
  }

  /**
   * Set response schema
   */
  withResponseSchema(schema: ResponseSchema): this {
    this.request.response_format = this.buildResponseFormat(schema);
    return this;
  }

  /**
   * Set model parameters (temperature, max_tokens, top_p)
   */
  withParameters(params: ModelParameters): this {
    if (params.temperature !== undefined) {
      this.request.temperature = params.temperature;
    }
    if (params.max_tokens !== undefined) {
      this.request.max_tokens = params.max_tokens;
    }
    if (params.top_p !== undefined) {
      this.request.top_p = params.top_p;
    }
    return this;
  }

  /**
   * Build final request
   */
  build(): OpenRouterRequest {
    if (!this.request.model || !this.request.messages) {
      throw new Error("Model and messages are required");
    }
    return this.request as OpenRouterRequest;
  }

  /**
   * Reset builder
   */
  reset(): this {
    this.request = {};
    return this;
  }

  /**
   * Build response format from schema
   */
  private buildResponseFormat(schema: ResponseSchema): ResponseFormat {
    return {
      type: "json_schema",
      json_schema: {
        name: schema.name,
        strict: true,
        schema: schema.schema,
      },
    };
  }
}
```

**Korzyści:**

- ✅ Eliminacja verbose conditional building (linie 246-257)
- ✅ Fluent API dla czytelności
- ✅ Walidacja przed build()
- ✅ Reużywalny

---

#### D) Service Layer (Refactored)

**Plik:** `src/lib/services/openrouter.service.ts` (REFACTORED - 200 LOC)

**Odpowiedzialność:** Orchestration + business logic

```typescript
import { HTTPClientService } from "../http/http-client.service";
import { ExponentialBackoffStrategy, withRetry } from "../strategies/retry.strategy";
import { OpenRouterRequestBuilder } from "../builders/openrouter-request.builder";
import {
  OpenRouterError,
  NetworkError,
  TimeoutError,
  AuthenticationError,
  RateLimitError,
  ValidationError,
  APIError,
} from "../errors/openrouter.errors";
import type {
  OpenRouterConfig,
  ChatCompletionOptions,
  ChatCompletionResponse,
  OpenRouterAPIResponse,
  OpenRouterAPIError,
} from "../../types/openrouter.types";

/**
 * OpenRouter Service (Refactored)
 *
 * Orchestrates HTTP client, retry strategy, and request builder.
 * Contains only business logic and error handling.
 */
export class OpenRouterService {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly defaultModel: string;
  private readonly httpClient: HTTPClientService;
  private readonly retryStrategy: ExponentialBackoffStrategy;
  private readonly requestBuilder: OpenRouterRequestBuilder;

  constructor(config: OpenRouterConfig) {
    // Validate API key
    if (!config.apiKey || config.apiKey.trim() === "") {
      throw new ValidationError("API key is required");
    }

    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || "https://openrouter.ai/api/v1";
    this.timeout = config.timeout || 20000;
    this.defaultModel = config.defaultModel || "openai/gpt-4o-mini";

    // Initialize dependencies
    this.httpClient = new HTTPClientService();
    this.retryStrategy = new ExponentialBackoffStrategy(config.retryAttempts || 3);
    this.requestBuilder = new OpenRouterRequestBuilder();
  }

  /**
   * Perform chat completion with retry logic
   */
  async chatCompletion<T>(options: ChatCompletionOptions): Promise<ChatCompletionResponse<T>> {
    try {
      // Build request using builder
      const request = this.buildRequest(options);

      console.log(`[OpenRouter] Calling LLM: ${request.model}`);

      // Execute with retry logic
      const response = await withRetry(() => this.executeRequest(request), this.retryStrategy);

      // Parse and validate response
      return this.parseResponse<T>(response as OpenRouterAPIResponse);
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Build request using request builder
   */
  private buildRequest(options: ChatCompletionOptions) {
    this.requestBuilder
      .reset()
      .withModel(options.model || this.defaultModel)
      .withSystemMessage(options.systemMessage)
      .withUserMessage(options.userMessage)
      .withResponseSchema(options.responseSchema);

    if (options.parameters) {
      this.requestBuilder.withParameters(options.parameters);
    }

    return this.requestBuilder.build();
  }

  /**
   * Execute HTTP request
   */
  private async executeRequest(request: any): Promise<unknown> {
    try {
      const response = await this.httpClient.postWithTimeout<OpenRouterAPIResponse>(
        `${this.baseUrl}/chat/completions`,
        request,
        this.timeout,
        {
          Authorization: `Bearer ${this.apiKey}`,
          "HTTP-Referer": "https://paragoniusz.app",
          "X-Title": "Paragoniusz",
        }
      );

      return response;
    } catch (error) {
      // Classify errors
      if (error instanceof Error) {
        if (error.message === "REQUEST_TIMEOUT") {
          throw new TimeoutError();
        }
        if (error.message.includes("HTTP 401") || error.message.includes("HTTP 403")) {
          throw new AuthenticationError(error.message);
        }
        if (error.message.includes("HTTP 429")) {
          throw new RateLimitError(error.message);
        }
        if (error.message.includes("HTTP 400")) {
          throw new ValidationError(error.message);
        }
      }
      throw error;
    }
  }

  /**
   * Parse and validate API response
   */
  private parseResponse<T>(apiResponse: OpenRouterAPIResponse): ChatCompletionResponse<T> {
    const content = apiResponse.choices[0]?.message?.content;

    if (!content) {
      throw new ValidationError("No content in API response");
    }

    // Parse JSON content
    let data: T;
    try {
      data = JSON.parse(content) as T;
    } catch (error) {
      throw new ValidationError("Failed to parse response as JSON", error instanceof Error ? error.message : undefined);
    }

    // Log success
    console.log(`[OpenRouter] Response received from: ${apiResponse.model}`);
    if (apiResponse.usage) {
      console.log(
        `[OpenRouter] Token usage - Prompt: ${apiResponse.usage.prompt_tokens}, ` +
          `Completion: ${apiResponse.usage.completion_tokens}, ` +
          `Total: ${apiResponse.usage.total_tokens}`
      );
    }

    return {
      data,
      model: apiResponse.model,
      usage: apiResponse.usage,
    };
  }

  /**
   * Handle and classify errors
   */
  private handleError(error: unknown): never {
    // Re-throw if already our custom error
    if (error instanceof OpenRouterError) {
      throw error;
    }

    // Handle network errors
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new NetworkError(error.message);
    }

    // Generic fallback
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    throw new OpenRouterError(message, "UNKNOWN_ERROR");
  }
}
```

**Korzyści:**

- ✅ Redukcja z 418 → 200 LOC (52% redukcja)
- ✅ Dependency Injection (łatwe testowanie)
- ✅ Separation of concerns
- ✅ Reużywalne komponenty (HTTP client, retry strategy)

---

### receipt.service.ts → Chain of Responsibility

#### A) Processing Steps

**Plik:** `src/lib/processing/receipt-processing-steps.ts` (NEW - 200 LOC)

**Odpowiedzialność:** Poszczególne kroki pipeline'u przetwarzania paragonu

```typescript
import type { SupabaseClient } from "../../db/supabase.client";
import type { CategoryMappingService } from "./category-mapping.service";

/**
 * Processing context passed through pipeline
 */
export interface ProcessingContext {
  // Input
  filePath: string;
  userId: string;
  startTime: number;

  // Intermediate data
  aiConsentGiven?: boolean;
  categories?: Array<{ id: string; name: string }>;
  edgeFunctionData?: {
    items: Array<{ name: string; amount: number; category: string }>;
    total: number;
    date: string;
  };

  // Output
  result?: ProcessReceiptResponseDTO;
}

/**
 * Base interface for processing steps
 */
export interface ProcessingStep {
  execute(context: ProcessingContext): Promise<ProcessingContext>;
}

/**
 * Step 1: Verify AI consent
 */
export class ConsentValidationStep implements ProcessingStep {
  constructor(private supabase: SupabaseClient) {}

  async execute(context: ProcessingContext): Promise<ProcessingContext> {
    const { data: profile, error } = await this.supabase
      .from("profiles")
      .select("ai_consent_given")
      .eq("id", context.userId)
      .single();

    if (error) {
      throw new Error("Nie udało się pobrać profilu użytkownika");
    }

    if (!profile.ai_consent_given) {
      throw new Error("AI_CONSENT_REQUIRED");
    }

    return {
      ...context,
      aiConsentGiven: true,
    };
  }
}

/**
 * Step 2: Verify file ownership
 */
export class FileOwnershipValidationStep implements ProcessingStep {
  async execute(context: ProcessingContext): Promise<ProcessingContext> {
    // Extract user_id from file path (receipts/{user_id}/{uuid}.ext)
    const fileUserId = context.filePath.split("/")[1];

    if (fileUserId !== context.userId) {
      throw new Error("FORBIDDEN");
    }

    return context;
  }
}

/**
 * Step 3: Fetch categories for mapping
 */
export class CategoryFetchStep implements ProcessingStep {
  constructor(private supabase: SupabaseClient) {}

  async execute(context: ProcessingContext): Promise<ProcessingContext> {
    const { data: categories, error } = await this.supabase.from("categories").select("id, name");

    if (error || !categories || categories.length === 0) {
      throw new Error("Nie udało się pobrać kategorii");
    }

    return {
      ...context,
      categories,
    };
  }
}

/**
 * Step 4: Call Edge Function for AI processing
 */
export class AIProcessingStep implements ProcessingStep {
  constructor(private supabase: SupabaseClient) {}

  async execute(context: ProcessingContext): Promise<ProcessingContext> {
    const {
      data: { session },
    } = await this.supabase.auth.getSession();

    const { data: edgeFunctionData, error } = await this.supabase.functions.invoke("process-receipt", {
      body: { file_path: context.filePath },
      headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
    });

    if (error) {
      if (error.message?.includes("Rate limit")) {
        throw new Error("RATE_LIMIT_EXCEEDED");
      }
      if (error.message?.includes("timeout")) {
        throw new Error("PROCESSING_TIMEOUT");
      }
      throw new Error(`Przetwarzanie AI nie powiodło się: ${error.message}`);
    }

    if (!edgeFunctionData) {
      throw new Error("Brak danych zwróconych z przetwarzania AI");
    }

    return {
      ...context,
      edgeFunctionData: edgeFunctionData as {
        items: Array<{ name: string; amount: number; category: string }>;
        total: number;
        date: string;
      },
    };
  }
}

/**
 * Step 5: Map categories and transform response
 */
export class CategoryMappingStep implements ProcessingStep {
  constructor(private categoryMapper: CategoryMappingService) {}

  async execute(context: ProcessingContext): Promise<ProcessingContext> {
    if (!context.edgeFunctionData || !context.categories) {
      throw new Error("Missing data for category mapping");
    }

    const expenses = await this.categoryMapper.mapExpensesWithCategories(
      context.edgeFunctionData.items,
      context.categories
    );

    return {
      ...context,
      result: {
        expenses,
        total_amount: context.edgeFunctionData.total.toFixed(2),
        currency: "PLN",
        receipt_date: context.edgeFunctionData.date,
        processing_time_ms: Date.now() - context.startTime,
      },
    };
  }
}
```

**Korzyści:**

- ✅ Każdy krok testowalny osobno
- ✅ Łatwe dodawanie/usuwanie kroków
- ✅ Reużywalność kroków
- ✅ Separation of concerns

---

#### B) Category Mapping Service

**Plik:** `src/lib/processing/category-mapping.service.ts` (NEW - 80 LOC)

**Odpowiedzialność:** Mapowanie kategorii AI na kategorie bazodanowe

```typescript
import type { ProcessReceiptResponseDTO } from "../../types";

/**
 * Service for mapping AI-suggested categories to database categories
 */
export class CategoryMappingService {
  /**
   * Map AI categories to database categories and build expense DTOs
   */
  async mapExpensesWithCategories(
    items: Array<{ name: string; amount: number; category: string }>,
    dbCategories: Array<{ id: string; name: string }>
  ): Promise<ProcessReceiptResponseDTO["expenses"]> {
    // Group items by AI-suggested category
    const grouped = this.groupItemsByCategory(items);

    const expenses: ProcessReceiptResponseDTO["expenses"] = [];

    for (const [aiCategoryName, categoryItems] of grouped.entries()) {
      // Find best matching database category
      const matchedCategory = this.findBestCategoryMatch(aiCategoryName, dbCategories);

      // Calculate total amount for this category
      const categoryTotal = categoryItems.reduce((sum, item) => sum + item.amount, 0);

      // Format items as strings with amounts
      const formattedItems = categoryItems.map((item) => `${item.name} - ${item.amount.toFixed(2)}`);

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
   * Group items by category name
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
   * Find best matching database category using fuzzy matching
   */
  private findBestCategoryMatch(
    aiCategoryName: string,
    dbCategories: Array<{ id: string; name: string }>
  ): { id: string; name: string } {
    const normalizedAiName = aiCategoryName.toLowerCase().trim();

    // Try exact match first
    const exactMatch = dbCategories.find((cat) => cat.name.toLowerCase() === normalizedAiName);
    if (exactMatch) return exactMatch;

    // Try partial match
    const partialMatch = dbCategories.find(
      (cat) => normalizedAiName.includes(cat.name.toLowerCase()) || cat.name.toLowerCase().includes(normalizedAiName)
    );
    if (partialMatch) return partialMatch;

    // Fallback to "Inne" (Other) category
    const otherCategory = dbCategories.find(
      (cat) => cat.name.toLowerCase() === "inne" || cat.name.toLowerCase() === "other"
    );

    // Ultimate fallback: first category
    return otherCategory || dbCategories[0];
  }
}
```

**Korzyści:**

- ✅ Ekstrakcja złożonej logiki mapowania
- ✅ Testability (mockowanie kategorii)
- ✅ Reużywalność

---

#### C) Service Layer (Refactored)

**Plik:** `src/lib/services/receipt.service.ts` (REFACTORED - 100 LOC)

**Odpowiedzialność:** Pipeline orchestration + upload

```typescript
import type { SupabaseClient } from "../../db/supabase.client";
import type { UploadReceiptResponseDTO, ProcessReceiptResponseDTO } from "../../types";
import {
  ConsentValidationStep,
  FileOwnershipValidationStep,
  CategoryFetchStep,
  AIProcessingStep,
  CategoryMappingStep,
  type ProcessingStep,
  type ProcessingContext,
} from "../processing/receipt-processing-steps";
import { CategoryMappingService } from "../processing/category-mapping.service";

/**
 * Service for receipt operations (Refactored)
 *
 * Uses Chain of Responsibility pattern for processing pipeline.
 * Orchestrates processing steps without containing business logic.
 */
export class ReceiptService {
  private readonly processingPipeline: ProcessingStep[];

  constructor(private supabase: SupabaseClient) {
    // Initialize processing pipeline
    const categoryMapper = new CategoryMappingService();

    this.processingPipeline = [
      new ConsentValidationStep(supabase),
      new FileOwnershipValidationStep(),
      new CategoryFetchStep(supabase),
      new AIProcessingStep(supabase),
      new CategoryMappingStep(categoryMapper),
    ];
  }

  /**
   * Upload receipt to storage
   */
  async uploadReceipt(file: File, userId: string): Promise<UploadReceiptResponseDTO> {
    const fileId = crypto.randomUUID();
    const extension = this.getFileExtension(file.type);
    const filePath = `receipts/${userId}/${fileId}${extension}`;
    const arrayBuffer = await file.arrayBuffer();

    const { data, error } = await this.supabase.storage.from("receipts").upload(filePath, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    });

    if (error) {
      throw new Error(`Nie udało się przesłać pliku: ${error.message}`);
    }

    return {
      file_id: fileId,
      file_path: data.path,
      uploaded_at: new Date().toISOString(),
    };
  }

  /**
   * Process receipt using pipeline
   */
  async processReceipt(filePath: string, userId: string): Promise<ProcessReceiptResponseDTO> {
    // Initialize context
    let context: ProcessingContext = {
      filePath,
      userId,
      startTime: Date.now(),
    };

    // Execute pipeline
    for (const step of this.processingPipeline) {
      context = await step.execute(context);
    }

    // Return result
    if (!context.result) {
      throw new Error("Pipeline failed to produce result");
    }

    return context.result;
  }

  /**
   * Map MIME type to file extension
   */
  private getFileExtension(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/heic": ".heic",
    };
    return mimeToExt[mimeType] || ".jpg";
  }
}
```

**Korzyści:**

- ✅ Redukcja z 287 → 100 LOC (65% redukcja)
- ✅ Chain of Responsibility pattern
- ✅ Każdy krok testowalny osobno
- ✅ Łatwe dodawanie nowych kroków

---

## Struktura Plików (Po Refaktoryzacji)

```
src/lib/
├── services/
│   ├── expense.service.ts (150 LOC) ← REFACTORED from 428
│   ├── openrouter.service.ts (200 LOC) ← REFACTORED from 418
│   ├── receipt.service.ts (100 LOC) ← REFACTORED from 287
│   ├── api-client.service.ts
│   ├── auth.service.ts
│   ├── category.service.ts
│   ├── dashboard.service.ts
│   ├── expense-mutation.service.ts
│   ├── profile.service.ts
│   └── scan-flow.service.ts
├── repositories/
│   └── expense.repository.ts (NEW - 180 LOC)
├── builders/
│   ├── expense-query.builder.ts (NEW - 120 LOC)
│   └── openrouter-request.builder.ts (NEW - 80 LOC)
├── transformers/
│   ├── expense.transformer.ts (NEW - 60 LOC)
│   ├── expense-form.transformer.ts
│   └── verification-form.transformer.ts
├── strategies/
│   └── retry.strategy.ts (NEW - 60 LOC)
├── http/
│   └── http-client.service.ts (NEW - 100 LOC)
├── processing/
│   ├── receipt-processing-steps.ts (NEW - 200 LOC)
│   └── category-mapping.service.ts (NEW - 80 LOC)
├── validators/
│   └── expense.validator.ts (NEW - 80 LOC)
├── errors/
│   └── openrouter.errors.ts (existing)
└── validation/
    └── (existing files)
```

### Metryki Po Refaktoryzacji

| Metryka                          | Przed | Po  | Zmiana |
| -------------------------------- | ----- | --- | ------ |
| **Łączna LOC (3 serwisy)**       | 1133  | 450 | -60%   |
| **Liczba plików**                | 3     | 13  | +10    |
| **Średnia LOC per plik**         | 378   | 97  | -74%   |
| **Duplikacja kodu**              | ~25%  | <5% | -80%   |
| **Liczba modułów do testowania** | 3     | 13  | +10    |
| **Zależności per moduł**         | 5-7   | 1-3 | -60%   |

---

## Zadania Implementacyjne

### Faza 1: expense.service.ts (PRIORYTET 1)

**Czas: 2-3 dni**

#### Dzień 1: Repository + Query Builder

1. ✅ Stwórz `ExpenseRepository` - izolacja dostępu do danych
   - [ ] Plik: `src/lib/repositories/expense.repository.ts`
   - [ ] Implementuj wszystkie metody (findById, findMany, count, create, createBatch, update, delete, validateCategories)
   - [ ] Dodaj JSDoc documentation
   - [ ] Napisz testy jednostkowe (Vitest)

2. ✅ Stwórz `ExpenseQueryBuilder` - eliminacja duplikacji filtrów
   - [ ] Plik: `src/lib/builders/expense-query.builder.ts`
   - [ ] Implementuj fluent API (withDateRange, withCategory, withSort, withPagination)
   - [ ] Implementuj build() i buildCountQuery()
   - [ ] Napisz testy jednostkowe

#### Dzień 2: Transformer + Validator

3. ✅ Stwórz `ExpenseTransformer` - eliminacja 4x duplikacji transformacji
   - [ ] Plik: `src/lib/transformers/expense.transformer.ts`
   - [ ] Implementuj wszystkie metody transformacji
   - [ ] Napisz testy jednostkowe

4. ✅ Stwórz `ExpenseValidator` (opcjonalnie, jeśli potrzebny)
   - [ ] Plik: `src/lib/validators/expense.validator.ts`
   - [ ] Ekstrakcja walidacji kategorii
   - [ ] Napisz testy jednostkowe

#### Dzień 3: Service Refactor + Integration

5. ✅ Refaktoruj `ExpenseService`
   - [ ] Plik: `src/lib/services/expense.service.ts`
   - [ ] Dependency injection (repository, queryBuilder, transformer)
   - [ ] Dodaj factory function dla backward compatibility
   - [ ] Export individual functions dla kompatybilności
   - [ ] Napisz testy integracyjne

6. ✅ Testy E2E
   - [ ] Uruchom istniejące testy E2E (Playwright)
   - [ ] Upewnij się, że wszystko działa

**Acceptance Criteria:**

- ✅ Wszystkie istniejące testy przechodzą (unit, integration, E2E)
- ✅ Backward compatibility zachowana
- ✅ Coverage ≥70% dla nowych modułów
- ✅ Brak duplikacji kodu
- ✅ Redukcja LOC o min. 60%

---

### Faza 2: openrouter.service.ts (PRIORYTET 2)

**Czas: 2-3 dni**

#### Dzień 1: HTTP Client + Retry Strategy

1. ✅ Stwórz `HTTPClientService`
   - [ ] Plik: `src/lib/http/http-client.service.ts`
   - [ ] Abstrakcja fetch + timeout handling
   - [ ] Napisz testy jednostkowe z mockowanym fetch

2. ✅ Stwórz `ExponentialBackoffStrategy`
   - [ ] Plik: `src/lib/strategies/retry.strategy.ts`
   - [ ] Interface + implementacja + helper function
   - [ ] Napisz testy jednostkowe

#### Dzień 2: Request Builder + Service Refactor

3. ✅ Stwórz `OpenRouterRequestBuilder`
   - [ ] Plik: `src/lib/builders/openrouter-request.builder.ts`
   - [ ] Fluent API dla budowania requestów
   - [ ] Napisz testy jednostkowe

4. ✅ Refaktoruj `OpenRouterService`
   - [ ] Plik: `src/lib/services/openrouter.service.ts`
   - [ ] Dependency injection
   - [ ]
