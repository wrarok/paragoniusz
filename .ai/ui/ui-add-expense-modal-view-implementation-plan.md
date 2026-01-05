# View Implementation Plan: Add Expense Modal

## 1. Overview

The Add Expense Modal is a dialog overlay that provides users with two methods for adding expenses: manual entry or AI-powered receipt scanning. This modal serves as the entry point for the core expense creation workflow (US-009 and US-010). It is triggered by a central `+` button in the navigation bar and conditionally displays the AI scanning option based on the user's consent status.

**Key Characteristics:**

- Modal overlay (not a routed page)
- Fetches user profile to check AI consent status
- Provides two action paths: manual entry and AI scan
- Mobile-first responsive design
- Handles authentication and error states gracefully

## 2. View Routing

**Path:** N/A (Modal overlay, not a routed page)

**Trigger:** Central `+` button in the navigation bar

**Navigation Targets:**

- Manual entry: `/expenses/new` (or opens manual expense form modal)
- AI scan: `/expenses/scan` (or opens receipt upload flow)

## 3. Component Structure

```
NavBar (existing component)
  └─ AddExpenseModalTrigger
       └─ AddExpenseModal (Shadcn Dialog)
            ├─ DialogOverlay
            ├─ DialogContent
            │    ├─ DialogHeader
            │    │    ├─ DialogTitle
            │    │    └─ DialogClose
            │    ├─ ModalBody
            │    │    ├─ LoadingState (conditional)
            │    │    ├─ ErrorState (conditional)
            │    │    └─ ActionButtons (conditional)
            │    │         ├─ ManualAddButton
            │    │         ├─ AIAddButton (conditional on consent)
            │    │         └─ ConsentInfoMessage (conditional)
            │    └─ DialogFooter (optional)
```

## 4. Component Details

### 4.1 AddExpenseModalTrigger

**Description:** A button component that opens the Add Expense Modal. This is typically placed in the navigation bar as a prominent `+` button for quick access.

**Main Elements:**

- `<Button>` from Shadcn/ui with `+` icon or text
- Click handler to open modal

**Handled Events:**

- `onClick`: Opens the modal by setting `isOpen` state to `true`

**Validation:**

- None required at trigger level (authentication checked in modal)

**Types:**

- None specific (uses standard button props)

**Props:**

```typescript
interface AddExpenseModalTriggerProps {
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}
```

### 4.2 AddExpenseModal

**Description:** The main modal container that manages the expense addition method selection. It fetches the user's profile on mount to determine AI consent status and displays appropriate action buttons.

**Main Elements:**

- `<Dialog>` from Shadcn/ui as the modal container
- `<DialogContent>` for modal body
- `<DialogHeader>` with title and close button
- Conditional rendering based on loading/error/success states

**Handled Events:**

- `onOpenChange`: Handles modal open/close state changes
- `onSelectManual`: Navigates to manual expense form
- `onSelectAI`: Navigates to AI receipt scan flow

**Validation:**

- Check if user is authenticated (redirect to login if not)
- Verify profile data is loaded before showing action buttons
- Validate AI consent status before showing AI scan option

**Types:**

- `ProfileDTO` - User profile with consent status
- `APIErrorResponse` - Error response format
- `AddExpenseModalState` - Internal state management

**Props:**

```typescript
interface AddExpenseModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectManual: () => void;
  onSelectAI: () => void;
}
```

### 4.3 LoadingState

**Description:** Displays a loading indicator while fetching the user's profile data.

**Main Elements:**

- `<Skeleton>` components from Shadcn/ui
- Loading spinner or skeleton buttons

**Handled Events:**

- None (purely presentational)

**Validation:**

- None

**Types:**

- None specific

**Props:**

```typescript
interface LoadingStateProps {
  message?: string;
}
```

### 4.4 ErrorState

**Description:** Displays error messages when profile fetch fails, with appropriate actions based on error type.

**Main Elements:**

- Error message text
- Retry button (for 500 errors)
- Close button
- Optional link to support/settings

**Handled Events:**

- `onRetry`: Attempts to fetch profile again
- `onClose`: Closes the modal

**Validation:**

- None

**Types:**

- `APIErrorResponse` - Error details

**Props:**

```typescript
interface ErrorStateProps {
  error: APIErrorResponse;
  onRetry: (() => void) | null;
  onClose: () => void;
}
```

### 4.5 ActionButtons

**Description:** Container for the action buttons that allow users to select their preferred expense addition method.

**Main Elements:**

- `<ManualAddButton>` - Always visible
- `<AIAddButton>` - Conditional on AI consent
- `<ConsentInfoMessage>` - Shown when consent not given

**Handled Events:**

- Button click events delegated to parent

**Validation:**

- Check `profile.ai_consent_given` to determine which buttons to show

**Types:**

- `ProfileDTO` - To check consent status

**Props:**

```typescript
interface ActionButtonsProps {
  profile: ProfileDTO;
  onSelectManual: () => void;
  onSelectAI: () => void;
}
```

### 4.6 ManualAddButton

**Description:** Button that navigates to the manual expense entry form.

**Main Elements:**

- `<Button>` from Shadcn/ui
- Icon (e.g., pencil or form icon)
- Label text: "Add Manually"
- Optional description text

**Handled Events:**

- `onClick`: Triggers `onSelectManual` callback

**Validation:**

- None required

**Types:**

- None specific

**Props:**

```typescript
interface ManualAddButtonProps {
  onClick: () => void;
  disabled?: boolean;
}
```

### 4.7 AIAddButton

**Description:** Button that navigates to the AI receipt scanning flow. Only displayed when user has granted AI consent.

**Main Elements:**

- `<Button>` from Shadcn/ui
- Icon (e.g., camera or AI icon)
- Label text: "Scan Receipt (AI)"
- Optional description text

**Handled Events:**

- `onClick`: Triggers `onSelectAI` callback

**Validation:**

- Should only be rendered when `profile.ai_consent_given === true`

**Types:**

- None specific

**Props:**

```typescript
interface AIAddButtonProps {
  onClick: () => void;
  disabled?: boolean;
}
```

### 4.8 ConsentInfoMessage

**Description:** Informational message displayed when AI consent has not been granted, explaining how to enable the feature.

**Main Elements:**

- Info icon
- Message text
- Optional link to settings page

**Handled Events:**

- `onClick` on settings link (if provided)

**Validation:**

- Should only be rendered when `profile.ai_consent_given === false`

**Types:**

- None specific

**Props:**

```typescript
interface ConsentInfoMessageProps {
  onNavigateToSettings?: () => void;
}
```

## 5. Types

### 5.1 Existing Types (from src/types.ts)

```typescript
// User profile with AI consent status
export type ProfileDTO = {
  id: string;
  ai_consent_given: boolean;
  created_at: string;
  updated_at: string;
};

// Standardized error response
export type APIErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
};
```

### 5.2 New ViewModels

```typescript
// Modal state management
type AddExpenseModalState = {
  isOpen: boolean;
  isLoading: boolean;
  error: APIErrorResponse | null;
  profile: ProfileDTO | null;
};

// Modal component props
type AddExpenseModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectManual: () => void;
  onSelectAI: () => void;
};

// Action buttons container props
type ActionButtonsProps = {
  profile: ProfileDTO;
  onSelectManual: () => void;
  onSelectAI: () => void;
};

// Individual button props
type ManualAddButtonProps = {
  onClick: () => void;
  disabled?: boolean;
};

type AIAddButtonProps = {
  onClick: () => void;
  disabled?: boolean;
};

// Error state props
type ErrorStateProps = {
  error: APIErrorResponse;
  onRetry: (() => void) | null;
  onClose: () => void;
};

// Loading state props
type LoadingStateProps = {
  message?: string;
};

// Consent info message props
type ConsentInfoMessageProps = {
  onNavigateToSettings?: () => void;
};

// Trigger button props
type AddExpenseModalTriggerProps = {
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
};
```

## 6. State Management

### 6.1 Custom Hook: useAddExpenseModal

A custom hook that encapsulates all modal state management and profile fetching logic.

**Purpose:**

- Manage modal open/close state
- Fetch user profile on modal open
- Handle loading and error states
- Provide navigation callbacks

**State Variables:**

```typescript
const [isOpen, setIsOpen] = useState(false);
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<APIErrorResponse | null>(null);
const [profile, setProfile] = useState<ProfileDTO | null>(null);
```

**Hook Returns:**

```typescript
{
  isOpen: boolean;
  isLoading: boolean;
  error: APIErrorResponse | null;
  profile: ProfileDTO | null;
  openModal: () => void;
  closeModal: () => void;
  selectManual: () => void;
  selectAI: () => void;
  retry: () => void;
}
```

### 6.2 State Flow

1. **Initial State**: Modal closed, no profile data
2. **User Clicks Trigger**: `openModal()` called, `isOpen` set to `true`
3. **Modal Opens**: `useEffect` detects `isOpen === true`, calls `fetchProfile()`
4. **Loading State**: `isLoading` set to `true`, loading UI displayed
5. **Profile Fetch Success**:
   - `profile` state updated with `ProfileDTO`
   - `isLoading` set to `false`
   - Action buttons displayed based on `ai_consent_given`
6. **Profile Fetch Error**:
   - `error` state updated with `APIErrorResponse`
   - `isLoading` set to `false`
   - Error UI displayed with retry option
7. **User Selects Action**:
   - `selectManual()` or `selectAI()` called
   - Modal closes
   - Navigation occurs
8. **Modal Closes**: State reset (except profile cache)

### 6.3 Caching Strategy

**Profile Caching:**

- Profile data is cached in state after first successful fetch
- Subsequent modal opens use cached data (no refetch)
- Cache is cleared on logout or page refresh
- Optional: Implement TTL-based cache invalidation

**Benefits:**

- Reduces API calls
- Improves modal open performance
- Better user experience

## 7. API Integration

### 7.1 Endpoint: GET /api/profiles/me

**Purpose:** Fetch user profile to check AI consent status

**Request:**

```typescript
const response = await fetch("/api/profiles/me", {
  method: "GET",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  },
});
```

**Request Type:** None (GET request, no body)

**Response Type:** `ProfileDTO`

**Success Response (200 OK):**

```typescript
{
  id: "550e8400-e29b-41d4-a716-446655440000",
  ai_consent_given: false,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z"
}
```

**Error Responses:**

**401 Unauthorized:**

```typescript
{
  error: {
    code: "UNAUTHORIZED",
    message: "Authentication required"
  }
}
```

**Action:** Redirect to login page

**404 Not Found:**

```typescript
{
  error: {
    code: "PROFILE_NOT_FOUND",
    message: "Profile not found for the authenticated user"
  }
}
```

**Action:** Display error message, suggest contacting support

**500 Internal Server Error:**

```typescript
{
  error: {
    code: "INTERNAL_ERROR",
    message: "An unexpected error occurred",
    details: {
      timestamp: "2024-01-01T00:00:00Z"
    }
  }
}
```

**Action:** Display error message with retry button

## 8. User Interactions

### 8.1 Opening the Modal

**Trigger:** User clicks the `+` button in the navigation bar

**Flow:**

1. User clicks trigger button
2. `openModal()` function called
3. Modal state changes to `isOpen: true`
4. Modal overlay appears with fade-in animation
5. Profile fetch begins automatically
6. Loading state displayed (skeleton buttons)

**Expected Outcome:** Modal opens and displays loading state

### 8.2 Viewing Action Options (Success Case)

**Precondition:** Profile fetch successful

**Flow:**

1. Profile data received from API
2. Loading state hidden
3. Action buttons rendered based on `ai_consent_given`
4. If `ai_consent_given === true`: Both buttons shown
5. If `ai_consent_given === false`: Only manual button + info message shown

**Expected Outcome:** User sees appropriate action buttons

### 8.3 Selecting Manual Entry

**Trigger:** User clicks "Add Manually" button

**Flow:**

1. User clicks manual add button
2. `selectManual()` callback triggered
3. Modal closes with fade-out animation
4. Navigation to manual expense form occurs
5. Manual form opens (new page or modal)

**Expected Outcome:** User is taken to manual expense entry form

### 8.4 Selecting AI Scan

**Trigger:** User clicks "Scan Receipt (AI)" button

**Precondition:** `profile.ai_consent_given === true`

**Flow:**

1. User clicks AI scan button
2. `selectAI()` callback triggered
3. Modal closes with fade-out animation
4. Navigation to receipt upload flow occurs
5. Receipt upload interface opens

**Expected Outcome:** User is taken to AI receipt scanning flow

### 8.5 Handling Errors

**Trigger:** Profile fetch fails

**Flow:**

1. API request fails or returns error
2. Error state updated with error details
3. Loading state hidden
4. Error message displayed with appropriate action
5. User can retry (500 error) or close modal

**Expected Outcome:** User sees clear error message with action options

### 8.6 Closing the Modal

**Triggers:**

- User clicks close button (X)
- User clicks outside modal overlay
- User presses Escape key
- User selects an action (auto-close)

**Flow:**

1. Close trigger activated
2. `closeModal()` function called
3. Modal state changes to `isOpen: false`
4. Modal overlay fades out
5. Error state cleared (profile cache retained)

**Expected Outcome:** Modal closes and user returns to previous view

## 9. Conditions and Validation

### 9.1 Authentication Check

**Condition:** User must be authenticated to use the modal

**Validation:**

- Check for valid access token before API call
- If token missing or invalid, redirect to login

**Affected Components:** AddExpenseModal (on mount)

**UI Impact:** Immediate redirect to login if not authenticated

### 9.2 AI Consent Check

**Condition:** AI scan option only available if consent given

**Validation:**

- Check `profile.ai_consent_given` boolean value
- If `true`: Show both manual and AI buttons
- If `false`: Show only manual button + info message

**Affected Components:** ActionButtons, AIAddButton, ConsentInfoMessage

**UI Impact:** Conditional rendering of AI scan option

### 9.3 Loading State Check

**Condition:** Show loading UI while fetching profile

**Validation:**

- Check `isLoading` boolean value
- If `true`: Show skeleton/spinner
- If `false`: Show content or error

**Affected Components:** AddExpenseModal

**UI Impact:** Prevents interaction until data loaded

### 9.4 Error State Check

**Condition:** Show error UI if profile fetch fails

**Validation:**

- Check `error` state for non-null value
- Determine error type from `error.code`
- Show appropriate error message and actions

**Affected Components:** AddExpenseModal, ErrorState

**UI Impact:** Displays error message with appropriate actions

## 10. Error Handling

### 10.1 Authentication Error (401)

**Scenario:** User's session has expired or token is invalid

**Handling:**

1. Close modal immediately
2. Clear any cached authentication data
3. Redirect to login page
4. Optionally: Show toast notification "Session expired, please log in"

**User Message:** "Your session has expired. Please log in again."

**Recovery Action:** Automatic redirect to login page

### 10.2 Profile Not Found (404)

**Scenario:** User is authenticated but profile record doesn't exist

**Handling:**

1. Display error message in modal
2. Provide close button (no retry)
3. Suggest contacting support
4. Log error for monitoring

**User Message:** "Profile not found. Please contact support if this issue persists."

**Recovery Action:** Close modal, user must contact support

### 10.3 Server Error (500)

**Scenario:** Unexpected server-side error during profile fetch

**Handling:**

1. Display error message in modal
2. Provide retry button
3. Provide close button
4. Log error details for debugging

**User Message:** "Failed to load profile. Please try again."

**Recovery Action:** User can retry or close modal

### 10.4 Network Error

**Scenario:** Network connection failure or timeout

**Handling:**

1. Display network error message
2. Provide retry button
3. Suggest checking internet connection
4. Provide close button

**User Message:** "Failed to connect to server. Please check your internet connection and try again."

**Recovery Action:** User can retry or close modal

## 11. Implementation Steps

### Step 1: Install Required Dependencies

```bash
npx shadcn@latest add dialog
npx shadcn@latest add button
npx shadcn@latest add skeleton
```

### Step 2: Create Type Definitions File

Create `src/types/modal.types.ts` with all type definitions from Section 5.2

### Step 3: Create Custom Hook

Create `src/components/hooks/useAddExpenseModal.ts` with state management logic

### Step 4: Create Sub-Components

- `src/components/AddExpenseModal/LoadingState.tsx`
- `src/components/AddExpenseModal/ErrorState.tsx`
- `src/components/AddExpenseModal/ActionButtons.tsx`
- `src/components/AddExpenseModal/ManualAddButton.tsx`
- `src/components/AddExpenseModal/AIAddButton.tsx`
- `src/components/AddExpenseModal/ConsentInfoMessage.tsx`

### Step 5: Create Main Modal Component

Create `src/components/AddExpenseModal/AddExpenseModal.tsx` that orchestrates all sub-components

### Step 6: Create Trigger Component

Create `src/components/AddExpenseModal/AddExpenseModalTrigger.tsx` for the `+` button

### Step 7: Integrate with Navigation Bar

Add the trigger button to the existing navigation bar component

### Step 8: Test Authentication Flow

- Test with valid token
- Test with expired token
- Test without token

### Step 9: Test AI Consent Scenarios

- Test with `ai_consent_given: true`
- Test with `ai_consent_given: false`

### Step 10: Test Error Scenarios

- Test 404 error handling
- Test 500 error handling
- Test network error handling

### Step 11: Test User Interactions

- Test modal open/close
- Test manual button navigation
- Test AI button navigation
- Test keyboard navigation (Escape key)

### Step 12: Optimize Performance

- Implement profile caching
- Add loading state optimizations
- Test on mobile devices

### Step 13: Accessibility Review

- Test with screen readers
- Verify keyboard navigation
- Check focus management
- Validate ARIA attributes

### Step 14: Final Integration Testing

- Test complete user flow from nav bar to expense form
- Verify state management across navigation
- Test edge cases and error recovery
