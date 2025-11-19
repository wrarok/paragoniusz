# REST API Plan - Paragoniusz

## 1. Resources

### Core Resources
- **Profiles** - User profile data (maps to `profiles` table)
- **Categories** - Predefined expense categories (maps to `categories` table)
- **Expenses** - User expense records (maps to `expenses` table)
- **Receipt Processing** - AI-powered receipt scanning (serverless function)

## 2. Endpoints

### 2.1 Profile Endpoints

#### Get Current User Profile ✅ IMPLEMENTED
- **HTTP Method**: GET
- **URL Path**: `/api/profiles/me`
- **Description**: Retrieves the authenticated user's profile
- **Headers**: `Authorization: Bearer {access_token}` (Note: Auth not yet implemented)
- **Implementation Status**:
  - ✅ Route handler: [`src/pages/api/profiles/me.ts`](src/pages/api/profiles/me.ts:1)
  - ✅ Service: [`ProfileService.getProfile()`](src/lib/services/profile.service.ts:26)
  - ⚠️ Authentication: Not yet implemented
- **Response Payload** (Success):
```json
{
  "id": "uuid",
  "ai_consent_given": false,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```
- **Success Code**: 200 OK
- **Error Codes**:
  - 401 Unauthorized - Invalid or expired token
  - 404 Not Found - Profile not found

#### Update User Profile ✅ IMPLEMENTED
- **HTTP Method**: PATCH
- **URL Path**: `/api/profiles/me`
- **Description**: Updates the authenticated user's profile (primarily for AI consent)
- **Headers**: `Authorization: Bearer {access_token}` (Note: Auth not yet implemented)
- **Implementation Status**:
  - ✅ Route handler: [`src/pages/api/profiles/me.ts`](src/pages/api/profiles/me.ts:1)
  - ✅ Service: [`ProfileService.updateProfile()`](src/lib/services/profile.service.ts:56)
  - ⚠️ Authentication: Not yet implemented
- **Request Payload**:
```json
{
  "ai_consent_given": true
}
```
- **Response Payload** (Success):
```json
{
  "id": "uuid",
  "ai_consent_given": true,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T12:00:00Z"
}
```
- **Success Code**: 200 OK
- **Error Codes**:
  - 401 Unauthorized - Invalid or expired token
  - 400 Bad Request - Invalid payload

#### Delete User Account ✅ IMPLEMENTED
- **HTTP Method**: DELETE
- **URL Path**: `/api/profiles/me`
- **Description**: Permanently deletes user account and all associated data
- **Headers**: `Authorization: Bearer {access_token}` (Note: Auth not yet implemented)
- **Implementation Status**:
  - ✅ Route handler: [`src/pages/api/profiles/me.ts`](src/pages/api/profiles/me.ts:1)
  - ✅ Service: [`ProfileService.deleteProfile()`](src/lib/services/profile.service.ts:96)
  - ⚠️ Authentication: Not yet implemented
- **Response Payload**: Empty
- **Success Code**: 204 No Content
- **Error Codes**:
  - 401 Unauthorized - Invalid or expired token

### 2.2 Category Endpoints

#### List All Categories ✅ IMPLEMENTED
- **HTTP Method**: GET
- **URL Path**: `/api/categories`
- **Description**: Retrieves all predefined expense categories. This endpoint should be called when the user opens the expense form to populate the category dropdown/selector.
- **Headers**: `Authorization: Bearer {access_token}` (Note: Auth not yet implemented)
- **Implementation Status**:
  - ✅ Route handler: [`src/pages/api/categories.ts`](src/pages/api/categories.ts:1)
  - ✅ Service: [`getAllCategories()`](src/lib/services/category.service.ts:10)
  - ⚠️ Authentication: Not yet implemented
- **Response Payload** (Success):
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Groceries"
    },
    {
      "id": "uuid",
      "name": "Transport"
    }
  ],
  "count": 2
}
```
- **Success Code**: 200 OK
- **Error Codes**:
  - 401 Unauthorized - Invalid or expired token
- **Usage Note**: The frontend should cache this list locally (e.g., in React state or localStorage) since categories are predefined and rarely change. This avoids unnecessary API calls.

### 2.3 Expense Endpoints

#### List User Expenses ✅ IMPLEMENTED
- **HTTP Method**: GET
- **URL Path**: `/api/expenses`
- **Description**: Retrieves paginated list of user's expenses with filtering and sorting
- **Headers**: `Authorization: Bearer {access_token}` (Note: Auth not yet implemented)
- **Implementation Status**:
  - ✅ Route handler: [`src/pages/api/expenses/index.ts`](src/pages/api/expenses/index.ts:1)
  - ✅ Service: [`listExpenses()`](src/lib/services/expense.service.ts:104)
  - ✅ Validation: Query parameter validation included
  - ⚠️ Authentication: Not yet implemented
- **Query Parameters**:
  - `limit` (optional, default: 50, max: 100) - Number of records per page
  - `offset` (optional, default: 0) - Pagination offset
  - `from_date` (optional, format: YYYY-MM-DD) - Filter expenses from this date
  - `to_date` (optional, format: YYYY-MM-DD) - Filter expenses to this date
  - `category_id` (optional, uuid) - Filter by category
  - `sort` (optional, default: expense_date.desc) - Sort order (expense_date.asc, expense_date.desc, amount.asc, amount.desc)
- **Response Payload** (Success):
```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "category_id": "uuid",
      "category": {
        "id": "uuid",
        "name": "Groceries"
      },
      "amount": "45.50",
      "expense_date": "2024-01-15",
      "currency": "PLN",
      "created_by_ai": false,
      "was_ai_suggestion_edited": false,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ],
  "count": 1,
  "total": 150
}
```
- **Success Code**: 200 OK
- **Error Codes**:
  - 401 Unauthorized - Invalid or expired token
  - 400 Bad Request - Invalid query parameters

#### Get Single Expense ✅ IMPLEMENTED
- **HTTP Method**: GET
- **URL Path**: `/api/expenses/{id}`
- **Description**: Retrieves a specific expense by ID
- **Headers**: `Authorization: Bearer {access_token}` (Note: Auth not yet implemented)
- **Implementation Status**:
  - ✅ Route handler created: [`src/pages/api/expenses/[id].ts`](src/pages/api/expenses/[id].ts:1)
  - ✅ Service method: [`getExpenseById()`](src/lib/services/expense.service.ts:205)
  - ✅ Validation schema: [`ExpenseIdSchema`](src/lib/validation/expense.validation.ts:69)
  - ⚠️ Authentication: Not yet implemented (will be added later)
- **Response Payload** (Success):
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "category_id": "uuid",
  "category": {
    "id": "uuid",
    "name": "Groceries"
  },
  "amount": "45.50",
  "expense_date": "2024-01-15",
  "currency": "PLN",
  "created_by_ai": false,
  "was_ai_suggestion_edited": false,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```
- **Success Code**: 200 OK
- **Error Codes**:
  - 401 Unauthorized - Invalid or expired token
  - 404 Not Found - Expense not found or doesn't belong to user

#### Create Expense (Manual) ✅ IMPLEMENTED
- **HTTP Method**: POST
- **URL Path**: `/api/expenses`
- **Description**: Creates a new expense manually
- **Headers**: `Authorization: Bearer {access_token}` (Note: Auth not yet implemented)
- **Implementation Status**:
  - ✅ Route handler: [`src/pages/api/expenses/index.ts`](src/pages/api/expenses/index.ts:95)
  - ✅ Service method: [`createExpense()`](src/lib/services/expense.service.ts:247)
  - ✅ Validation schema: [`CreateExpenseSchema`](src/lib/validation/expense.validation.ts:76)
  - ⚠️ Authentication: Not yet implemented (will be added later)
- **Request Payload**:
```json
{
  "category_id": "uuid",
  "amount": "45.50",
  "expense_date": "2024-01-15",
  "currency": "PLN"
}
```
- **Validation Rules**:
  - `category_id` (required):
    - Must be a valid UUID format
    - Must reference an existing category in the database
    - Error: 400 if invalid UUID format, 422 if category doesn't exist
  - `amount` (required):
    - Must be a positive number greater than 0
    - Must have maximum 2 decimal places
    - Must not exceed 99,999,999.99
    - Error: 400 with message "Amount must be a positive number with max 2 decimal places"
  - `expense_date` (required):
    - Must be in YYYY-MM-DD format
    - Must be a valid date
    - Cannot be in the future
    - Warning (not error) if more than 1 year in the past
    - Error: 400 with message "Invalid date format or date cannot be in the future"
  - `currency` (optional, defaults to 'PLN'):
    - Must be a valid 3-letter ISO currency code
    - MVP only supports 'PLN'
    - Error: 400 with message "Only PLN currency is supported in MVP"
- **Note**: The `category_id` must be a valid UUID obtained from the `/api/categories` endpoint. The frontend should first fetch the list of categories and present them to the user (e.g., as a dropdown), then submit the selected category's UUID when creating the expense.
- **Response Payload** (Success):
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "category_id": "uuid",
  "category": {
    "id": "uuid",
    "name": "Groceries"
  },
  "amount": "45.50",
  "expense_date": "2024-01-15",
  "currency": "PLN",
  "created_by_ai": false,
  "was_ai_suggestion_edited": false,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```
- **Success Code**: 201 Created
- **Error Codes**:
  - 401 Unauthorized - Invalid or expired token
  - 400 Bad Request - Invalid payload (missing required fields, invalid amount format, invalid date)
  - 422 Unprocessable Entity - Category doesn't exist

#### Create Multiple Expenses (From AI) ✅ IMPLEMENTED
- **HTTP Method**: POST
- **URL Path**: `/api/expenses/batch`
- **Description**: Creates multiple expenses at once (used after AI receipt processing)
- **Headers**: `Authorization: Bearer {access_token}` (Note: Auth not yet implemented)
- **Implementation Status**:
  - ✅ Route handler: [`src/pages/api/expenses/batch.ts`](src/pages/api/expenses/batch.ts:1)
  - ✅ Service: [`createExpensesBatch()`](src/lib/services/expense.service.ts:43)
  - ✅ Helper: [`validateCategories()`](src/lib/services/expense.service.ts:10)
  - ⚠️ Authentication: Not yet implemented
- **Request Payload**:
```json
{
  "expenses": [
    {
      "category_id": "uuid",
      "amount": "35.50",
      "expense_date": "2024-01-15",
      "currency": "PLN",
      "created_by_ai": true,
      "was_ai_suggestion_edited": false
    },
    {
      "category_id": "uuid",
      "amount": "15.20",
      "expense_date": "2024-01-15",
      "currency": "PLN",
      "created_by_ai": true,
      "was_ai_suggestion_edited": true
    }
  ]
}
```
- **Validation Rules**:
  - `expenses` (required):
    - Must be a non-empty array
    - Maximum 50 expenses per batch request
    - Error: 400 with message "Expenses array cannot be empty" or "Maximum 50 expenses per batch"
  - For each expense in the array:
    - `category_id` (required): Same validation as Create Expense endpoint
    - `amount` (required): Same validation as Create Expense endpoint
    - `expense_date` (required): Same validation as Create Expense endpoint
    - `currency` (optional): Same validation as Create Expense endpoint
    - `created_by_ai` (optional, defaults to false):
      - Must be boolean
      - Error: 400 with message "created_by_ai must be boolean"
    - `was_ai_suggestion_edited` (optional, defaults to false):
      - Must be boolean
      - Only meaningful when created_by_ai is true
      - Error: 400 with message "was_ai_suggestion_edited must be boolean"
  - If any expense fails validation, the entire batch is rejected (atomic operation)
  - Error response includes details about which expense(s) failed and why
- **Note**: The `category_id` values come from the AI processing response, which includes both the UUID and human-readable category name. Users can modify the suggested categories before submitting.
- **Response Payload** (Success):
```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "category_id": "uuid",
      "category": {
        "id": "uuid",
        "name": "Groceries"
      },
      "amount": "35.50",
      "expense_date": "2024-01-15",
      "currency": "PLN",
      "created_by_ai": true,
      "was_ai_suggestion_edited": false,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    },
    {
      "id": "uuid",
      "user_id": "uuid",
      "category_id": "uuid",
      "category": {
        "id": "uuid",
        "name": "Household"
      },
      "amount": "15.20",
      "expense_date": "2024-01-15",
      "currency": "PLN",
      "created_by_ai": true,
      "was_ai_suggestion_edited": true,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ],
  "count": 2
}
```
- **Success Code**: 201 Created
- **Error Codes**:
  - 401 Unauthorized - Invalid or expired token
  - 400 Bad Request - Invalid payload or empty expenses array
  - 422 Unprocessable Entity - One or more categories don't exist

#### Update Expense ✅ IMPLEMENTED
- **HTTP Method**: PATCH
- **URL Path**: `/api/expenses/{id}`
- **Description**: Updates an existing expense with partial data
- **Headers**: `Authorization: Bearer {access_token}` (Note: Auth not yet implemented)
- **Implementation Status**:
  - ✅ Route handler: [`src/pages/api/expenses/[id].ts`](src/pages/api/expenses/[id].ts:173)
  - ✅ Service method: [`updateExpense()`](src/lib/services/expense.service.ts:312)
  - ✅ Validation schema: [`UpdateExpenseSchema`](src/lib/validation/expense.validation.ts:117)
  - ⚠️ Authentication: Not yet implemented (will be added later)
- **Request Payload**:
```json
{
  "category_id": "uuid",
  "amount": "50.00",
  "expense_date": "2024-01-16"
}
```
- **Validation Rules**:
  - `id` (URL parameter, required):
    - Must be a valid UUID format
    - Must reference an existing expense
    - Expense must belong to the authenticated user (enforced by RLS)
    - Error: 400 if invalid UUID format, 404 if expense not found or doesn't belong to user
  - All fields are optional (partial update), but at least one field must be provided:
    - Error: 400 with message "At least one field must be provided for update"
  - `category_id` (optional):
    - If provided: Same validation as Create Expense endpoint
  - `amount` (optional):
    - If provided: Same validation as Create Expense endpoint
  - `expense_date` (optional):
    - If provided: Same validation as Create Expense endpoint
  - `currency` (optional):
    - If provided: Same validation as Create Expense endpoint
  - `created_by_ai` and `was_ai_suggestion_edited` cannot be modified via this endpoint (immutable after creation)
- **Note**: All fields are optional. Only provided fields will be updated. The `category_id` must be a valid UUID from the categories list.
- **Response Payload** (Success):
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "category_id": "uuid",
  "category": {
    "id": "uuid",
    "name": "Transport"
  },
  "amount": "50.00",
  "expense_date": "2024-01-16",
  "currency": "PLN",
  "created_by_ai": false,
  "was_ai_suggestion_edited": false,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-16T14:20:00Z"
}
```
- **Success Code**: 200 OK
- **Error Codes**:
  - 401 Unauthorized - Invalid or expired token
  - 404 Not Found - Expense not found or doesn't belong to user
  - 400 Bad Request - Invalid payload
  - 422 Unprocessable Entity - Category doesn't exist

#### Delete Expense ✅ IMPLEMENTED
- **HTTP Method**: DELETE
- **URL Path**: `/api/expenses/{id}`
- **Description**: Deletes an expense
- **Headers**: `Authorization: Bearer {access_token}` (Note: Auth not yet implemented)
- **Implementation Status**:
  - ✅ Route handler: [`src/pages/api/expenses/[id].ts`](src/pages/api/expenses/[id].ts:92)
  - ✅ Service method: [`deleteExpense()`](src/lib/services/expense.service.ts:322)
  - ✅ Validation schema: [`ExpenseIdSchema`](src/lib/validation/expense.validation.ts:69)
  - ⚠️ Authentication: Not yet implemented (will be added later)
- **Response Payload**: Empty
- **Success Code**: 204 No Content
- **Error Codes**:
  - 401 Unauthorized - Invalid or expired token (will be implemented with auth)
  - 400 Bad Request - Invalid UUID format
  - 404 Not Found - Expense not found

### 2.4 Dashboard Endpoints

#### Get Dashboard Summary ✅ IMPLEMENTED
- **HTTP Method**: GET
- **URL Path**: `/api/dashboard/summary`
- **Description**: Retrieves aggregated expense data for a specified month
- **Headers**: `Authorization: Bearer {access_token}` (Note: Auth not yet implemented)
- **Implementation Status**:
  - ✅ Route handler: [`src/pages/api/dashboard/summary.ts`](src/pages/api/dashboard/summary.ts:1)
  - ✅ Service: [`DashboardService.getSummary()`](src/lib/services/dashboard.service.ts:18)
  - ✅ Validation: [`dashboardQuerySchema`](src/lib/validation/dashboard.validation.ts:7)
  - ⚠️ Authentication: Not yet implemented (currently uses hardcoded user ID: `a33573a0-3562-495e-b3c4-d898d0b54241`)
- **Query Parameters**:
  - `month` (optional, format: YYYY-MM, default: current month) - Month to get summary for
- **Response Payload** (Success):
```json
{
  "period": {
    "month": "2024-01",
    "from_date": "2024-01-01",
    "to_date": "2024-01-31"
  },
  "total_amount": "1250.75",
  "currency": "PLN",
  "expense_count": 45,
  "categories": [
    {
      "category_id": "uuid",
      "category_name": "Groceries",
      "amount": "450.50",
      "percentage": 36.0,
      "count": 15
    },
    {
      "category_id": "uuid",
      "category_name": "Transport",
      "amount": "300.00",
      "percentage": 24.0,
      "count": 10
    },
    {
      "category_id": "uuid",
      "category_name": "Entertainment",
      "amount": "200.25",
      "percentage": 16.0,
      "count": 8
    },
    {
      "category_id": "uuid",
      "category_name": "Utilities",
      "amount": "150.00",
      "percentage": 12.0,
      "count": 5
    },
    {
      "category_id": "uuid",
      "category_name": "Healthcare",
      "amount": "100.00",
      "percentage": 8.0,
      "count": 4
    },
    {
      "category_id": null,
      "category_name": "Other",
      "amount": "50.00",
      "percentage": 4.0,
      "count": 3
    }
  ],
  "ai_metrics": {
    "ai_created_count": 30,
    "ai_created_percentage": 66.7,
    "ai_edited_count": 5,
    "ai_accuracy_percentage": 83.3
  }
}
```
- **Validation Rules**:
  - `month` (optional):
    - Must be in YYYY-MM format
    - Month must be 01-12
    - Year must be between 2000 and 2099
    - Defaults to current month if not provided
    - Error: 400 with message "Month must be in YYYY-MM format" or "Year must be between 2000 and 2099"
- **Success Code**: 200 OK
- **Error Codes**:
  - 401 Unauthorized - Invalid or expired token (will be implemented with auth)
  - 400 Bad Request - Invalid month format or year out of range
  - 500 Internal Server Error - Database query failure

### 2.5 Receipt Processing Endpoints

#### Upload Receipt Image ✅ IMPLEMENTED & TESTED
- **HTTP Method**: POST
- **URL Path**: `/api/receipts/upload`
- **Description**: Uploads receipt image to temporary storage
- **Headers**:
  - `Authorization: Bearer {access_token}` (Note: Auth not yet implemented)
  - `Content-Type: multipart/form-data`
- **Implementation Status**:
  - ✅ Route handler: [`src/pages/api/receipts/upload.ts`](src/pages/api/receipts/upload.ts:1)
  - ✅ Service: [`ReceiptService.uploadReceipt()`](src/lib/services/receipt.service.ts:23)
  - ✅ Validation: [`uploadReceiptSchema`](src/lib/validation/receipt.validation.ts:87)
  - ✅ Tested: Successfully uploads images to Supabase Storage
  - ⚠️ Authentication: Not yet implemented (currently uses hardcoded user ID: `a33573a0-3562-495e-b3c4-d898d0b54241`)
  - ✅ Supabase Storage: Bucket `receipts` configured with RLS disabled for MVP (see [`.ai/supabase-storage-setup.md`](.ai/supabase-storage-setup.md:1))
  - 📝 Note: RLS policies will be implemented together with authentication
- **Request Payload**: Form data with `file` field containing image (JPEG, PNG, or HEIC, max 10MB)
- **Response Payload** (Success):
```json
{
  "file_id": "uuid",
  "file_path": "receipts/user_id/uuid.jpg",
  "uploaded_at": "2024-01-15T10:30:00Z"
}
```
- **Success Code**: 201 Created
- **Error Codes**:
  - 401 Unauthorized - Invalid or expired token (will be implemented with auth)
  - 400 Bad Request - No file provided or invalid file type
  - 413 Payload Too Large - File exceeds size limit (10MB)
- **Test Scripts**:
  - Quick tests: [`.ai/test-upload-receipt-quick.md`](.ai/test-upload-receipt-quick.md:1)
  - Comprehensive tests: [`.ai/test-upload-receipt-powershell.md`](.ai/test-upload-receipt-powershell.md:1)
  - RLS troubleshooting: [`.ai/disable-storage-rls.md`](.ai/disable-storage-rls.md:1)

#### Process Receipt with AI ✅ IMPLEMENTED & TESTED
- **HTTP Method**: POST
- **URL Path**: `/api/receipts/process`
- **Description**: Processes uploaded receipt image using mock AI service (production will use Supabase Edge Function with OpenRouter.ai)
- **Headers**: `Authorization: Bearer {access_token}` (Note: Auth not yet implemented)
- **Implementation Status**:
  - ✅ Route handler: [`src/pages/api/receipts/process.ts`](src/pages/api/receipts/process.ts:1)
  - ✅ Service: [`ReceiptService.processReceipt()`](src/lib/services/receipt.service.ts:93)
  - ✅ Validation: [`processReceiptSchema`](src/lib/validation/receipt.validation.ts:7)
  - ✅ Tested: Successfully processes receipts with mock AI data
  - ⚠️ Authentication: Not yet implemented (currently uses hardcoded user ID: `a33573a0-3562-495e-b3c4-d898d0b54241`)
  - ✅ Security Checks: AI consent verification, file ownership validation, file existence check
  - ✅ Auto Cleanup: Receipt files automatically deleted after processing (per PRD 3.4)
  - 📝 Note: Currently uses mock AI processing; real Edge Function integration pending
- **Request Payload**:
```json
{
  "file_path": "receipts/user_id/uuid.jpg"
}
```
- **Response Payload** (Success):
```json
{
  "expenses": [
    {
      "category_id": "uuid",
      "category_name": "Groceries",
      "amount": "35.50",
      "items": [
        "Milk 2L - 5.50",
        "Bread - 4.00",
        "Eggs 10pcs - 12.00",
        "Cheese 200g - 14.00"
      ]
    },
    {
      "category_id": "uuid",
      "category_name": "Household",
      "amount": "15.20",
      "items": [
        "Dish soap - 8.50",
        "Paper towels - 6.70"
      ]
    }
  ],
  "total_amount": "50.70",
  "currency": "PLN",
  "receipt_date": "2024-01-15",
  "processing_time_ms": 1500
}
```
- **Success Code**: 200 OK
- **Error Codes**:
  - 401 Unauthorized - Invalid or expired token (will be implemented with auth)
  - 400 Bad Request - Invalid file path or file not found
  - 403 Forbidden - AI consent not given or file access forbidden
  - 408 Request Timeout - AI processing exceeded 20 seconds (not yet implemented in mock)
  - 422 Unprocessable Entity - Unable to extract data from receipt (not yet implemented in mock)
  - 500 Internal Server Error - AI service error
- **Test Scripts**:
  - Testing guide: [`.ai/testing-receipt-process.md`](.ai/testing-receipt-process.md:1)
  - Implementation plan: [`.ai/receipt-process-implementation-plan.md`](.ai/receipt-process-implementation-plan.md:1)

## 3. Authentication and Authorization

### 3.1 Authentication Mechanism
The API uses **JWT (JSON Web Token)** based authentication provided by Supabase Auth:

- Users authenticate via Supabase Auth endpoints (`/auth/v1/*`)
- Upon successful authentication, users receive an `access_token` (JWT) and `refresh_token`
- The `access_token` must be included in the `Authorization` header as a Bearer token for all protected endpoints
- Access tokens expire after 1 hour (3600 seconds)
- Refresh tokens can be used to obtain new access tokens without re-authentication

### 3.2 Authorization Implementation
Authorization is enforced at two levels:

#### Database Level (Row Level Security)
- RLS policies on `profiles` and `expenses` tables ensure users can only access their own data
- Policies check `auth.uid()` against `user_id` or `id` columns
- This provides defense-in-depth even if application logic fails

#### Application Level
- API endpoints validate JWT tokens using Supabase client
- User ID is extracted from the validated token
- All database queries are automatically filtered by RLS policies
- Edge Functions validate tokens before processing requests

### 3.3 Session Management
- "Remember me" functionality is handled by storing refresh tokens securely
- Sessions expire after 7 days of inactivity
- Users can explicitly logout, which invalidates their session

### 3.4 AI Consent Management
- Before using receipt processing features, users must grant AI consent
- Consent status is stored in `profiles.ai_consent_given`
- API returns 403 Forbidden if user attempts to process receipts without consent
- Consent can be granted via the profile update endpoint

## 4. Validation and Business Logic

### 4.1 Profile Validation
- **ai_consent_given**: Must be boolean (true/false)
- Profile updates automatically set `updated_at` timestamp

### 4.2 Category Validation
- **name**: Required, must be unique, non-empty text
- Categories are read-only for users in MVP (managed by administrators)

### 4.3 Expense Validation

#### Field Validations
- **amount**: 
  - Required
  - Must be numeric with max 2 decimal places
  - Must be positive (> 0)
  - Max value: 99,999,999.99 (based on numeric(10,2))
  
- **expense_date**: 
  - Required
  - Must be valid date in YYYY-MM-DD format
  - Cannot be in the future
  - Should not be more than 1 year in the past (warning, not error)
  
- **category_id**: 
  - Required
  - Must be valid UUID
  - Must reference existing category
  
- **currency**: 
  - Optional (defaults to 'PLN')
  - Must be valid 3-letter currency code
  - MVP only supports 'PLN'
  
- **created_by_ai**: 
  - Optional (defaults to false)
  - Must be boolean
  
- **was_ai_suggestion_edited**: 
  - Optional (defaults to false)
  - Must be boolean
  - Only relevant when created_by_ai is true

#### Business Rules
- Users can only create/update/delete their own expenses (enforced by RLS)
- Expense date defaults to current date if not provided
- Timestamps (created_at, updated_at) are automatically managed
- When updating an expense, updated_at is automatically set to current timestamp

### 4.4 Receipt Processing Business Logic

#### Upload Validation
- File must be image format (JPEG, PNG, HEIC)
- Maximum file size: 10MB
- File is stored temporarily in Supabase Storage

#### AI Processing Logic
1. **Consent Check**: Verify user has granted AI consent
2. **File Retrieval**: Fetch image from Supabase Storage
3. **AI Analysis**: Send to OpenRouter.ai with 20-second timeout
4. **Data Extraction**: Parse AI response for:
   - Individual line items with amounts
   - Total amount validation
   - Receipt date
5. **Category Assignment**: 
   - AI suggests categories based on item descriptions
   - Unknown items default to "Other" category
6. **Aggregation**: Group items by category and sum amounts
7. **Cleanup**: Delete image from storage after processing
8. **Response**: Return structured expense data for user verification

#### Error Handling
- **Timeout**: If AI doesn't respond within 20 seconds, return 408 error
- **Unreadable Receipt**: If AI cannot extract data, return 422 error with suggestion to try manual entry
- **Service Error**: If OpenRouter.ai is unavailable, return 500 error

### 4.5 Dashboard Business Logic

#### Monthly Summary Calculation
- Filter expenses by current calendar month (or specified month)
- Calculate total amount across all expenses
- Group expenses by category and calculate:
  - Sum per category
  - Percentage of total
  - Count of expenses
- Sort categories by amount (descending)
- Show top 5 categories individually
- Aggregate remaining categories as "Other"

#### AI Metrics Calculation
- **AI Adoption Rate**: (expenses with created_by_ai=true / total expenses) × 100
- **AI Accuracy Rate**: ((AI expenses - edited AI expenses) / AI expenses) × 100
  - Where edited = was_ai_suggestion_edited=true
- These metrics support PRD success criteria 6.2 and 6.3

### 4.6 Pagination and Performance

#### List Endpoints
- Default page size: 50 records
- Maximum page size: 100 records
- Use offset-based pagination
- Return total count for client-side pagination UI
- Leverage database index on (user_id, expense_date DESC) for optimal performance

#### Filtering
- Date range filtering uses expense_date column
- Category filtering uses category_id
- All filters are combined with AND logic

#### Sorting
- Default sort: expense_date DESC (newest first)
- Supported sort fields: expense_date, amount
- Supported sort directions: asc, desc

### 4.7 Error Response Format

All error responses follow a consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional context if applicable"
    }
  }
}
```

Common error codes:
- `UNAUTHORIZED` - Invalid or missing authentication token
- `FORBIDDEN` - User lacks permission for this action
- `NOT_FOUND` - Requested resource doesn't exist
- `VALIDATION_ERROR` - Request payload validation failed
- `TIMEOUT` - Operation exceeded time limit
- `UNPROCESSABLE` - Request understood but cannot be processed
- `INTERNAL_ERROR` - Server-side error occurred

### 4.8 Rate Limiting

To prevent abuse and ensure fair usage:
- **Authentication endpoints**: 5 requests per minute per IP
- **Receipt processing**: 10 requests per hour per user
- **Other endpoints**: 100 requests per minute per user
- Rate limit headers included in responses:
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Requests remaining
  - `X-RateLimit-Reset`: Timestamp when limit resets

### 4.9 Data Privacy and Security

- All API communication over HTTPS only
- Passwords hashed using bcrypt (handled by Supabase Auth)
- Receipt images deleted immediately after processing
- No logging of sensitive financial data
- RLS policies prevent data leakage between users
- API keys for OpenRouter.ai stored securely in Edge Function environment variables
- CORS configured to allow only application domain
