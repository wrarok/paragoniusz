# View Implementation Plan: Scan Expense Flow

## 1. Overview

The Scan Expense Flow is a multi-step AI-powered feature that allows users to upload receipt images, process them with AI to extract expense data, verify the extracted information, and save multiple expenses in a single batch. This view implements the core value proposition of the Paragoniusz application by minimizing manual data entry through intelligent receipt scanning.

**Key Features:**

- AI consent verification before first use
- File upload with validation (JPEG, PNG, HEIC up to 10MB)
- AI processing with 20-second timeout
- Visual loading indicators
- Expense verification and editing interface
- Batch expense creation
- Comprehensive error handling for timeout (408) and extraction failures (422)

## 2. View Routing

**Path:** `/expenses/scan`

**File:** `src/pages/expenses/scan.astro`

**Access Control:** Requires authenticated user session

## 3. Component Structure

```
ScanExpenseFlow (Astro Page)
├── ScanExpenseContainer (React)
│   ├── AIConsentModal (React)
│   ├── FileUploadSection (React)
│   ├── ProcessingStatusIndicator (React)
│   ├── ExpenseVerificationList (React)
│   │   └── ExpenseVerificationItem[] (React)
│   └── ErrorDisplay (React)
```

## 4. Component Details

### 4.1 ScanExpenseContainer

Main orchestrator component managing the entire scan flow state machine.

**Props:** None (top-level component)

**Types:** `ScanFlowState`, `ProfileDTO`, `CategoryDTO[]`, `APIErrorResponse`

### 4.2 AIConsentModal

Modal dialog for AI consent before first use.

**Props:**

```typescript
{
  isOpen: boolean;
  onAccept: () => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}
```

### 4.3 FileUploadSection

File selection and upload interface.

**Props:**

```typescript
{
  onUpload: (file: File) => Promise<void>;
  isUploading: boolean;
  error: string | null;
}
```

**Validation:**

- File type: JPEG, PNG, HEIC only
- File size: ≤ 10MB
- File not empty

### 4.4 ProcessingStatusIndicator

Visual feedback during AI processing.

**Props:**

```typescript
{
  step: 'upload' | 'processing';
  startTime: number;
  onTimeout: () => void;
}
```

### 4.5 ExpenseVerificationList

Display and edit AI-extracted expenses.

**Props:**

```typescript
{
  expenses: EditableExpense[];
  categories: CategoryDTO[];
  receiptDate: string;
  totalAmount: string;
  currency: string;
  onUpdateExpense: (id: string, updates: Partial<EditableExpense>) => void;
  onRemoveExpense: (id: string) => void;
  onSave: () => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}
```

### 4.6 ExpenseVerificationItem

Individual expense with inline editing.

**Props:**

```typescript
{
  expense: EditableExpense;
  categories: CategoryDTO[];
  onUpdate: (updates: Partial<EditableExpense>) => void;
  onRemove: () => void;
}
```

**Validation:**

- Amount: numeric, > 0, max 2 decimals
- Category: must exist in list

### 4.7 ErrorDisplay

Error message with retry options.

**Props:**

```typescript
{
  error: APIErrorResponse;
  onRetry: () => void;
  onAddManually: () => void;
  onCancel: () => void;
}
```

## 5. Types

### 5.1 New Types (src/types/scan-flow.types.ts)

```typescript
export type ProcessingStep = "consent" | "upload" | "processing" | "verification" | "saving" | "complete" | "error";

export type ScanFlowState = {
  step: ProcessingStep;
  uploadedFile: UploadReceiptResponseDTO | null;
  processedData: ProcessReceiptResponseDTO | null;
  editedExpenses: EditableExpense[];
  error: APIErrorResponse | null;
  isLoading: boolean;
  processingStartTime: number | null;
};

export type EditableExpense = {
  id: string;
  category_id: string;
  category_name: string;
  amount: string;
  items: string[];
  isEdited: boolean;
};

export type FileValidationResult = {
  isValid: boolean;
  error?: string;
};
```

### 5.2 Existing DTOs

From `src/types.ts`: `ProfileDTO`, `CategoryDTO`, `UploadReceiptResponseDTO`, `ProcessReceiptResponseDTO`, `ReceiptExpenseDTO`, `BatchExpenseItem`, `CreateExpenseBatchCommand`, `APIErrorResponse`

## 6. State Management

Custom hook `useScanExpenseFlow` in `src/components/hooks/useScanExpenseFlow.ts` manages:

- Flow state machine
- API calls (consent, upload, process, save)
- File validation
- Timeout handling
- Expense editing

**Key Methods:**

- `checkAIConsent()`: GET /api/profiles/me
- `grantAIConsent()`: PATCH /api/profiles/me
- `uploadFile(file)`: POST /api/receipts/upload
- `processReceipt(path)`: POST /api/receipts/process (20s timeout)
- `updateExpense(id, updates)`: Update local state
- `saveExpenses()`: POST /api/expenses/batch
- `resetFlow()`: Reset to upload step

## 7. API Integration

| Endpoint              | Method | Request            | Response                  | Usage            |
| --------------------- | ------ | ------------------ | ------------------------- | ---------------- |
| /api/profiles/me      | GET    | -                  | ProfileDTO                | Check consent    |
| /api/profiles/me      | PATCH  | {ai_consent_given} | ProfileDTO                | Grant consent    |
| /api/categories       | GET    | -                  | CategoryListDTO           | Fetch categories |
| /api/receipts/upload  | POST   | FormData           | UploadReceiptResponseDTO  | Upload file      |
| /api/receipts/process | POST   | {file_path}        | ProcessReceiptResponseDTO | Process with AI  |
| /api/expenses/batch   | POST   | {expenses[]}       | BatchExpenseResponseDTO   | Save expenses    |

## 8. User Interactions

1. **Initial Load**: Check consent → Show modal or upload section
2. **Grant Consent**: Accept → PATCH consent → Show upload
3. **Upload**: Select file → Validate → Upload → Auto-process
4. **Processing**: Show progress → 20s timeout → Show results
5. **Verify**: Edit amounts/categories → Validate → Enable save
6. **Save**: Batch create → Navigate to dashboard
7. **Error**: Show message → Retry/Manual/Cancel options

## 9. Conditions and Validation

### AI Consent

- **Condition**: `!hasAIConsent`
- **Effect**: Block upload, show modal

### File Upload

- **Conditions**: Type (JPEG/PNG/HEIC), Size (≤10MB), Not empty
- **Effect**: Disable upload if invalid

### Processing Timeout

- **Condition**: `elapsedTime >= 20s`
- **Effect**: Abort, show timeout error

### Expense Verification

- **Conditions**: Amount > 0, Category selected, At least one expense
- **Effect**: Enable/disable save button

## 10. Error Handling

| Error Code          | Status | Message                | Actions                 |
| ------------------- | ------ | ---------------------- | ----------------------- |
| VALIDATION_ERROR    | 400    | Invalid file type/size | Retry with valid file   |
| PAYLOAD_TOO_LARGE   | 413    | File exceeds 10MB      | Retry with smaller file |
| UNAUTHORIZED        | 401    | Session expired        | Redirect to login       |
| AI_CONSENT_REQUIRED | 403    | Consent not granted    | Show consent modal      |
| PROCESSING_TIMEOUT  | 408    | AI timeout (20s)       | Retry or add manually   |
| EXTRACTION_FAILED   | 422    | Cannot read receipt    | Retry or add manually   |
| AI_SERVICE_ERROR    | 500    | AI service error       | Retry later             |

## 11. Implementation Steps

1. **Create Types File**
   - Create `src/types/scan-flow.types.ts`
   - Define `ProcessingStep`, `ScanFlowState`, `EditableExpense`, `FileValidationResult`

2. **Create Custom Hook**
   - Create `src/components/hooks/useScanExpenseFlow.ts`
   - Implement state management
   - Implement API calls with error handling
   - Implement 20s timeout with AbortController
   - Implement file validation

3. **Create AIConsentModal Component**
   - Use Dialog from shadcn/ui
   - Display consent information
   - Handle accept/cancel actions

4. **Create FileUploadSection Component**
   - File input with drag-and-drop
   - File validation display
   - Upload button with loading state

5. **Create ProcessingStatusIndicator Component**
   - Progress spinner
   - Elapsed time counter
   - Timeout warning at 15s

6. **Create ExpenseVerificationItem Component**
   - Amount input with validation
   - Category select dropdown
   - Items list display
   - Remove button

7. **Create ExpenseVerificationList Component**
   - Receipt summary header
   - List of ExpenseVerificationItem
   - Total calculation
   - Save/Cancel buttons

8. **Create ErrorDisplay Component**
   - Error-specific messages
   - Retry/Manual/Cancel buttons

9. **Create ScanExpenseContainer Component**
   - Use useScanExpenseFlow hook
   - Conditional rendering based on step
   - Coordinate all child components

10. **Create Astro Page**
    - Create `src/pages/expenses/scan.astro`
    - Add authentication check
    - Render ScanExpenseContainer

11. **Testing**
    - Test consent flow
    - Test file validation
    - Test upload and processing
    - Test timeout handling
    - Test expense editing
    - Test batch save
    - Test all error scenarios

12. **Integration**
    - Add navigation link from dashboard
    - Update AddExpenseModal to link to scan flow
    - Test end-to-end flow
