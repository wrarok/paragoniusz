import type { Tables, TablesInsert, TablesUpdate } from "./db/database.types";

// ============================================================================
// Entity Types (Direct references to database tables)
// ============================================================================

/**
 * Profile entity - represents a user profile from the database
 */
export type Profile = Tables<"profiles">;

/**
 * Category entity - represents an expense category from the database
 */
export type Category = Tables<"categories">;

/**
 * Expense entity - represents an expense record from the database
 */
export type Expense = Tables<"expenses">;

// ============================================================================
// Profile DTOs
// ============================================================================

/**
 * Profile DTO - returned when fetching user profile
 * Used in: GET /api/profiles/me
 */
export type ProfileDTO = Profile;

/**
 * Update Profile Command - request payload for updating user profile
 * Used in: PATCH /api/profiles/me
 */
export type UpdateProfileCommand = Pick<TablesUpdate<"profiles">, "ai_consent_given">;

// ============================================================================
// Category DTOs
// ============================================================================

/**
 * Category DTO - represents a single category in API responses
 * Used in: GET /api/categories, nested in expense responses
 */
export type CategoryDTO = Pick<Category, "id" | "name">;

/**
 * Category List DTO - response for listing all categories
 * Used in: GET /api/categories
 */
export interface CategoryListDTO {
  data: CategoryDTO[];
  count: number;
}

// ============================================================================
// Expense DTOs
// ============================================================================

/**
 * Expense DTO - full expense record with nested category information
 * Used in: GET /api/expenses/{id}, GET /api/expenses, POST /api/expenses, PATCH /api/expenses/{id}
 * Note: amount is returned as string in API responses
 */
export type ExpenseDTO = Omit<Expense, "category_id" | "amount"> & {
  category_id: string;
  amount: string;
  category: CategoryDTO;
};

/**
 * Expense List DTO - paginated response for listing expenses
 * Used in: GET /api/expenses
 */
export interface ExpenseListDTO {
  data: ExpenseDTO[];
  count: number;
  total: number;
}

/**
 * Create Expense Command - request payload for creating a single expense manually
 * Used in: POST /api/expenses
 */
export type CreateExpenseCommand = Pick<
  TablesInsert<"expenses">,
  "category_id" | "amount" | "expense_date" | "currency"
>;

/**
 * Batch Expense Item - single expense in a batch creation request
 * Used in: POST /api/expenses/batch
 * Note: amount is a string in the API but stored as number in database
 */
export type BatchExpenseItem = Omit<
  Pick<
    TablesInsert<"expenses">,
    "category_id" | "amount" | "expense_date" | "currency" | "created_by_ai" | "was_ai_suggestion_edited"
  >,
  "amount"
> & {
  amount: string;
};

/**
 * Create Expense Batch Command - request payload for creating multiple expenses
 * Used in: POST /api/expenses/batch
 */
export interface CreateExpenseBatchCommand {
  expenses: BatchExpenseItem[];
}

/**
 * Batch Expense Response DTO - response after creating multiple expenses
 * Used in: POST /api/expenses/batch
 */
export interface BatchExpenseResponseDTO {
  data: ExpenseDTO[];
  count: number;
}

/**
 * Update Expense Command - request payload for updating an expense
 * Used in: PATCH /api/expenses/{id}
 * Note: created_by_ai and was_ai_suggestion_edited are immutable after creation
 */
export type UpdateExpenseCommand = Pick<
  TablesUpdate<"expenses">,
  "category_id" | "amount" | "expense_date" | "currency"
>;

/**
 * Expense Query Params - query parameters for filtering and sorting expenses
 * Used in: GET /api/expenses
 */
export interface ExpenseQueryParams {
  limit?: number;
  offset?: number;
  from_date?: string; // YYYY-MM-DD format
  to_date?: string; // YYYY-MM-DD format
  category_id?: string;
  sort?: "expense_date.asc" | "expense_date.desc" | "amount.asc" | "amount.desc";
}

// ============================================================================
// Dashboard DTOs
// ============================================================================

/**
 * Category Summary DTO - category breakdown in dashboard
 * Used in: GET /api/dashboard/summary
 */
export interface CategorySummaryDTO {
  category_id: string | null;
  category_name: string;
  amount: string;
  percentage: number;
  count: number;
}

/**
 * AI Metrics DTO - AI usage statistics
 * Used in: GET /api/dashboard/summary
 */
export interface AIMetricsDTO {
  ai_created_count: number;
  ai_created_percentage: number;
  ai_edited_count: number;
  ai_accuracy_percentage: number;
}

/**
 * Dashboard Summary DTO - aggregated expense data for a period
 * Used in: GET /api/dashboard/summary
 */
export interface DashboardSummaryDTO {
  period: {
    month: string; // YYYY-MM format
    from_date: string; // YYYY-MM-DD format
    to_date: string; // YYYY-MM-DD format
  };
  total_amount: string;
  currency: string;
  expense_count: number;
  categories: CategorySummaryDTO[];
  ai_metrics: AIMetricsDTO;
}

/**
 * Dashboard Query Params - query parameters for dashboard summary
 * Used in: GET /api/dashboard/summary
 */
export interface DashboardQueryParams {
  month?: string; // YYYY-MM format, defaults to current month
}

// ============================================================================
// Receipt Processing DTOs
// ============================================================================

/**
 * Upload Receipt Response DTO - response after uploading a receipt image
 * Used in: POST /api/receipts/upload
 */
export interface UploadReceiptResponseDTO {
  file_id: string;
  file_path: string;
  uploaded_at: string;
}

/**
 * Receipt Expense DTO - individual expense extracted from receipt by AI
 * Used in: POST /api/receipts/process (response)
 */
export interface ReceiptExpenseDTO {
  category_id: string;
  category_name: string;
  amount: string;
  items: string[];
}

/**
 * Process Receipt Command - request payload for AI receipt processing
 * Used in: POST /api/receipts/process
 */
export interface ProcessReceiptCommand {
  file_path: string;
}

/**
 * Process Receipt Response DTO - AI processing result with extracted expenses
 * Used in: POST /api/receipts/process
 */
export interface ProcessReceiptResponseDTO {
  expenses: ReceiptExpenseDTO[];
  total_amount: string;
  currency: string;
  receipt_date: string; // YYYY-MM-DD format
  processing_time_ms: number;
}

// ============================================================================
// Common Response Types
// ============================================================================

/**
 * API Error Response - standardized error response format
 * Used in: All endpoints on error
 */
export interface APIErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Pagination Metadata - common pagination information
 */
export interface PaginationMetadata {
  limit: number;
  offset: number;
  total: number;
  count: number;
}
