# View Implementation Plan: Dashboard View

## 1. Overview

The Dashboard View serves as the main landing page of the Paragoniusz application, providing users with a comprehensive overview of their monthly expenses. It displays aggregated financial data through a pie chart visualization, shows the total spending amount, and lists recent expense entries. The view implements skeleton loading states for optimal user experience and includes an empty state for new users without expenses.

**Key Features:**

- Monthly expense summary with total amount and count
- Interactive pie chart showing top 5 categories plus "Other"
- Chronological list of recent expenses with edit/delete capabilities
- Visual indicators for AI-created and AI-edited expenses
- Pagination support with "Show More" functionality
- Responsive mobile-first design
- Empty state for users without expenses

## 2. View Routing

**Path:** `/`

**Access:** Requires authentication (redirects to login if not authenticated)

## 3. Component Structure

```
src/pages/index.astro (DashboardView)
├── DashboardSummary (React Island)
│   └── SkeletonLoader (conditional)
├── ExpensePieChart (React Island)
│   ├── SkeletonLoader (conditional)
│   └── PieChart (recharts)
└── RecentExpensesList (React Island)
    ├── SkeletonLoader (conditional)
    ├── EmptyState (conditional)
    ├── ExpenseCard[] (multiple)
    │   ├── CategoryBadge
    │   ├── AIIndicator (conditional)
    │   ├── EditIndicator (conditional)
    │   └── DropdownMenu (Shadcn/ui)
    │       ├── Edit action
    │       └── Delete action
    └── Button (Show More - conditional)
```

## 4. Component Details

### 4.1 DashboardView (Astro Page)

**Description:** Main page component that serves as the container for all dashboard elements. Handles initial server-side data fetching and coordinates the layout of child components.

**Main Elements:**

- `<Layout>` wrapper with page title
- `<main>` container with responsive grid layout
- Three main sections: summary, chart, and expense list
- Error boundary for graceful error handling

**Handled Events:** None (static Astro component)

**Validation Conditions:** None (delegates to child components)

**Types:**

- Uses `DashboardSummaryDTO` for initial data
- Uses `ExpenseListDTO` for initial expense list

**Props:** None (root page component)

**File Location:** `src/pages/index.astro`

---

### 4.2 DashboardSummary (React Island)

**Description:** Displays the monthly expense summary including total amount, currency, and expense count. Shows skeleton loader during data fetching and handles error states.

**Main Elements:**

- Card container (Shadcn/ui Card component)
- Header with month display
- Total amount display (large, prominent text)
- Currency indicator
- Expense count badge
- Error message display (conditional)
- Skeleton loader (conditional)

**Handled Events:**

- None (read-only display component)

**Validation Conditions:**

- Display skeleton when `isLoading === true`
- Display error when `error !== null`
- Display data when `summary !== null && !isLoading && !error`
- Format amount with 2 decimal places
- Display "0.00" when no expenses exist

**Types:**

- `DashboardSummaryDTO` - API response type
- `DashboardState` - Component state type

**Props:**

```typescript
interface DashboardSummaryProps {
  initialData?: DashboardSummaryDTO;
  month?: string; // YYYY-MM format, defaults to current month
}
```

**File Location:** `src/components/DashboardSummary.tsx`

---

### 4.3 ExpensePieChart (React Island)

**Description:** Interactive pie chart visualization showing expense distribution across top 5 categories plus "Other". Uses recharts library for rendering. Isolated as React island for performance optimization.

**Main Elements:**

- Card container (Shadcn/ui Card component)
- Chart title
- Recharts PieChart component
- Custom tooltip showing category name, amount, and percentage
- Legend with color indicators
- Empty state message (when no data)
- Skeleton loader (conditional)

**Handled Events:**

- `onMouseEnter` on pie segments (show tooltip)
- `onMouseLeave` on pie segments (hide tooltip)

**Validation Conditions:**

- Display skeleton when `isLoading === true`
- Display empty state when `categories.length === 0`
- Display chart when `categories.length > 0 && !isLoading`
- Ensure percentages sum to 100%
- Handle "Other" category (category_id === null)

**Types:**

- `CategorySummaryDTO[]` - API response type
- `PieChartDataPoint` - Transformed data for recharts

**Props:**

```typescript
interface ExpensePieChartProps {
  categories: CategorySummaryDTO[];
  isLoading?: boolean;
}
```

**File Location:** `src/components/ExpensePieChart.tsx`

---

### 4.4 RecentExpensesList (React Island)

**Description:** Displays a paginated list of recent expenses in chronological order (newest first). Handles loading more expenses, deleting expenses, and showing empty state for new users.

**Main Elements:**

- Card container (Shadcn/ui Card component)
- List header with title
- Expense cards array (mapped from data)
- "Show More" button (conditional)
- Empty state component (conditional)
- Skeleton loader (conditional)
- Error message display (conditional)

**Handled Events:**

- `onClick` on "Show More" button → Load next page of expenses
- `onDelete` from ExpenseCard → Delete expense and refresh data

**Validation Conditions:**

- Display skeleton when `isLoading === true` (initial load)
- Display empty state when `expenses.length === 0 && !isLoading`
- Display expense list when `expenses.length > 0`
- Display "Show More" button when `hasMore === true && !isLoading`
- Disable "Show More" button when loading more
- Validate successful deletion before removing from list

**Types:**

- `ExpenseListDTO` - API response type
- `ExpenseDTO[]` - Array of expenses
- `ExpenseListState` - Component state type

**Props:**

```typescript
interface RecentExpensesListProps {
  initialData?: ExpenseListDTO;
  limit?: number; // Default: 10
}
```

**File Location:** `src/components/RecentExpensesList.tsx`

---

### 4.5 ExpenseCard (React Component)

**Description:** Individual expense card displaying expense details with edit/delete actions via dropdown menu. Shows visual indicators for AI-created and AI-edited expenses.

**Main Elements:**

- Card container with hover effect
- Category badge with color
- Amount display (large, bold)
- Date display (formatted)
- Currency indicator
- AI indicator badge (conditional)
- Edit indicator badge (conditional)
- Dropdown menu (Shadcn/ui DropdownMenu)
  - Edit action item
  - Delete action item with confirmation

**Handled Events:**

- `onClick` on Edit → Navigate to edit page (future implementation)
- `onClick` on Delete → Show confirmation dialog → Call delete API → Notify parent

**Validation Conditions:**

- Display AI badge when `created_by_ai === true`
- Display Edit badge when `was_ai_suggestion_edited === true`
- Format date as locale string
- Format amount with 2 decimal places
- Validate expense ID before delete

**Types:**

- `ExpenseDTO` - Single expense data

**Props:**

```typescript
interface ExpenseCardProps {
  expense: ExpenseDTO;
  onDelete: (expenseId: string) => Promise<void>;
  onEdit?: (expenseId: string) => void; // Future implementation
}
```

**File Location:** `src/components/ExpenseCard.tsx`

---

### 4.6 EmptyState (React Component)

**Description:** Friendly message displayed when user has no expenses, encouraging them to add their first expense.

**Main Elements:**

- Icon or illustration
- Heading text
- Description text
- Call-to-action button (Add Expense)

**Handled Events:**

- `onClick` on CTA button → Navigate to add expense page

**Validation Conditions:**

- Only displayed when `expense_count === 0`

**Types:** None (presentational component)

**Props:**

```typescript
interface EmptyStateProps {
  message?: string;
  ctaText?: string;
  onCtaClick?: () => void;
}
```

**File Location:** `src/components/EmptyState.tsx`

---

### 4.7 SkeletonLoader (React Component)

**Description:** Loading placeholder that mimics the structure of the actual content, providing visual feedback during data fetching.

**Main Elements:**

- Animated skeleton shapes matching content structure
- Variants for different component types (summary, chart, list)

**Handled Events:** None (presentational component)

**Validation Conditions:**

- Display only when parent component is loading

**Types:** None (presentational component)

**Props:**

```typescript
interface SkeletonLoaderProps {
  variant: "summary" | "chart" | "list" | "card";
  count?: number;
}
```

**File Location:** `src/components/SkeletonLoader.tsx`

## 5. Types

### 5.1 Existing Types (from `src/types.ts`)

All required types are already defined in `src/types.ts`:

- `DashboardSummaryDTO`
- `CategorySummaryDTO`
- `AIMetricsDTO`
- `ExpenseListDTO`
- `ExpenseDTO`
- `CategoryDTO`

### 5.2 New ViewModel Types

Create new file `src/types/dashboard.types.ts`:

```typescript
export type PieChartDataPoint = {
  name: string;
  value: number;
  percentage: number;
  color: string;
  categoryId: string | null;
};

export type DashboardState = {
  summary: DashboardSummaryDTO | null;
  isLoading: boolean;
  error: string | null;
};

export type ExpenseListState = {
  expenses: ExpenseDTO[];
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  offset: number;
};

export type DeleteExpenseResult = {
  success: boolean;
  error?: string;
};
```

## 6. State Management

State is managed using custom React hooks for each data domain:

### useDashboardSummary Hook

**Location:** `src/components/hooks/useDashboardSummary.ts`

**Purpose:** Fetches and manages dashboard summary data

**Returns:** `DashboardState`

### useExpenseList Hook

**Location:** `src/components/hooks/useExpenseList.ts`

**Purpose:** Manages expense list with pagination and delete functionality

**Returns:** `ExpenseListState & { loadMore, deleteExpense, refresh }`

### State Coordination

After delete operations, components communicate via custom events to trigger data refresh across islands.

## 7. API Integration

### GET /api/dashboard/summary

**Request:** Query parameter `month` (optional, YYYY-MM format)

**Response:** `DashboardSummaryDTO`

**Usage in:** DashboardSummary, ExpensePieChart components

### GET /api/expenses

**Request:** Query parameters `limit`, `offset`, `sort`

**Response:** `ExpenseListDTO`

**Usage in:** RecentExpensesList component

### DELETE /api/expenses/{id}

**Request:** Path parameter `id` (UUID)

**Response:** 204 No Content

**Usage in:** ExpenseCard component (via RecentExpensesList)

## 8. User Interactions

1. **Initial Load:** Page loads with skeleton loaders, then displays data
2. **Load More:** Click "Show More" to fetch additional expenses
3. **Delete Expense:** Open dropdown, click delete, confirm, expense removed
4. **View Empty State:** New users see friendly message with CTA
5. **Hover Chart:** Interactive tooltips show category details

## 9. Conditions and Validation

### Display Conditions

- Show skeleton when loading
- Show empty state when no expenses
- Show error messages when errors occur
- Show AI/Edit badges based on expense properties
- Show "Show More" button when more data available

### API Validation

- Month format: YYYY-MM
- Limit: 1-100
- Offset: >= 0
- Expense ID: Valid UUID

## 10. Error Handling

### Network Errors

- Display user-friendly error message
- Provide retry button
- Log errors to console

### Authentication Errors (401)

- Redirect to login page
- Clear local state

### Not Found Errors (404)

- Show "Expense not found" message
- Remove from local state if applicable

### Server Errors (500)

- Show generic error message
- Provide retry option
- Log error details

## 11. Implementation Steps

1. **Create Type Definitions**
   - Create `src/types/dashboard.types.ts` with ViewModel types

2. **Create Custom Hooks**
   - Implement `useDashboardSummary` hook
   - Implement `useExpenseList` hook

3. **Create Presentational Components**
   - Implement `SkeletonLoader` component with variants
   - Implement `EmptyState` component
   - Implement `ExpenseCard` component

4. **Create React Islands**
   - Implement `DashboardSummary` component
   - Implement `ExpensePieChart` component (install recharts)
   - Implement `RecentExpensesList` component

5. **Create Astro Page**
   - Implement `src/pages/index.astro`
   - Set up responsive grid layout
   - Add error boundaries

6. **Add Interactivity**
   - Implement delete confirmation dialog
   - Add event communication between islands
   - Implement "Show More" pagination

7. **Style Components**
   - Apply Tailwind CSS classes
   - Ensure mobile-first responsive design
   - Add hover effects and transitions

8. **Test Functionality**
   - Test with empty state
   - Test with data
   - Test pagination
   - Test delete operation
   - Test error states
   - Test loading states

9. **Optimize Performance**
   - Implement React.memo where appropriate
   - Optimize re-renders
   - Test with large datasets

10. **Accessibility**
    - Add ARIA labels
    - Ensure keyboard navigation
    - Test with screen readers
    - Verify color contrast
