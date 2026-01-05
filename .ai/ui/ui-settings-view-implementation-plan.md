# View Implementation Plan: Settings View

## 1. Overview

The Settings View provides authenticated users with a centralized interface to manage their account security and profile settings. The view is organized into tabbed sections for better organization and includes two primary functionalities: changing the account password and permanently deleting the account. Both operations require careful validation and confirmation to ensure security and prevent accidental data loss.

**Key Features:**

- Tabbed interface for organizing settings (Account, Security)
- Change password form with current password verification
- Account deletion with confirmation modal
- Responsive mobile-first design
- Clear error messaging and success feedback

## 2. View Routing

**Path:** `/settings`

**File:** `src/pages/settings.astro`

**Authentication:** Required (redirect to login if not authenticated)

## 3. Component Structure

```
SettingsPage (Astro)
└── Layout
    └── SettingsContainer (React)
        ├── SettingsTabs (React)
        │   ├── TabsList
        │   │   ├── TabsTrigger: "Account"
        │   │   └── TabsTrigger: "Security"
        │   ├── TabsContent: "Account"
        │   │   └── AccountInfoSection
        │   │       ├── ProfileInfo (display only)
        │   │       └── AccountCreatedDate
        │   └── TabsContent: "Security"
        │       ├── ChangePasswordSection
        │       │   └── ChangePasswordForm
        │       │       ├── FormField: Current Password
        │       │       ├── FormField: New Password
        │       │       ├── FormField: Confirm Password
        │       │       ├── PasswordStrengthIndicator
        │       │       ├── SubmitButton
        │       │       └── StatusMessage (success/error)
        │       └── DangerZoneSection
        │           ├── SectionHeader
        │           ├── WarningMessage
        │           ├── DeleteAccountButton
        │           └── DeleteAccountModal
        │               ├── DialogHeader
        │               ├── WarningText
        │               ├── ConfirmationInput
        │               ├── ErrorMessage
        │               └── DialogActions
        │                   ├── CancelButton
        │                   └── ConfirmDeleteButton
```

## 4. Component Details

### SettingsPage (Astro Component)

- **Component Description:** Main page wrapper that handles authentication check and provides the layout structure for the settings view.
- **Main Elements:**
  - Layout component wrapper
  - Authentication verification logic
  - SettingsContainer component
- **Handled Events:** None (static page)
- **Validation Conditions:**
  - User must be authenticated (redirect to login if not)
- **Types:**
  - None (uses Astro context)
- **Props:** None (top-level page)

### SettingsContainer (React Component)

- **Component Description:** Main container component that manages the overall state of the settings view, including profile data loading and tab navigation.
- **Main Elements:**
  - Loading skeleton while fetching profile
  - Error state display
  - SettingsTabs component
- **Handled Events:**
  - Profile data loading
  - Error handling for profile fetch
- **Validation Conditions:**
  - Profile data must be loaded before displaying tabs
- **Types:**
  - `ProfileDTO` (from API response)
  - `APIErrorResponse` (for error handling)
- **Props:** None (top-level container)

### SettingsTabs (React Component)

- **Component Description:** Tabbed interface using Shadcn Tabs component to organize settings into logical sections.
- **Main Elements:**
  - Tabs root container
  - TabsList with triggers
  - TabsContent for each section
- **Handled Events:**
  - Tab change events
- **Validation Conditions:** None
- **Types:**
  - `SettingsTab = 'account' | 'security'`
- **Props:**
  - `profile: ProfileDTO` - User profile data
  - `onProfileUpdate?: () => void` - Callback for profile updates

### AccountInfoSection (React Component)

- **Component Description:** Displays read-only account information including user ID and account creation date.
- **Main Elements:**
  - Card component
  - Profile information display
  - Account metadata
- **Handled Events:** None (display only)
- **Validation Conditions:** None
- **Types:**
  - `ProfileDTO`
- **Props:**
  - `profile: ProfileDTO` - User profile data

### ChangePasswordSection (React Component)

- **Component Description:** Container for the password change functionality, including the form and status messages.
- **Main Elements:**
  - Section header
  - ChangePasswordForm component
- **Handled Events:** None (delegates to form)
- **Validation Conditions:** None (handled by form)
- **Types:** None
- **Props:** None

### ChangePasswordForm (React Component)

- **Component Description:** Form for changing user password with validation and Supabase Auth integration.
- **Main Elements:**
  - Three password input fields (current, new, confirm)
  - Password strength indicator
  - Submit button with loading state
  - Success/error message display
- **Handled Events:**
  - Form submission
  - Input changes
  - Password validation
- **Validation Conditions:**
  - **Current Password:**
    - Required
    - Minimum 1 character
  - **New Password:**
    - Required
    - Minimum 8 characters
    - Must contain at least one uppercase letter
    - Must contain at least one lowercase letter
    - Must contain at least one number
    - Must be different from current password
  - **Confirm Password:**
    - Required
    - Must exactly match new password
- **Types:**
  - `ChangePasswordFormData`
  - `PasswordValidationErrors`
- **Props:** None

### DangerZoneSection (React Component)

- **Component Description:** Clearly marked section containing destructive account operations (account deletion).
- **Main Elements:**
  - Section header with warning styling
  - Warning message about permanent deletion
  - DeleteAccountButton
  - DeleteAccountModal
- **Handled Events:**
  - Modal open/close
- **Validation Conditions:** None (handled by modal)
- **Types:** None
- **Props:** None

### DeleteAccountButton (React Component)

- **Component Description:** Button that triggers the account deletion confirmation modal.
- **Main Elements:**
  - Button with destructive styling
  - Icon (optional)
- **Handled Events:**
  - Click event to open modal
- **Validation Conditions:** None
- **Types:** None
- **Props:**
  - `onClick: () => void` - Handler to open modal

### DeleteAccountModal (React Component)

- **Component Description:** Confirmation dialog for account deletion with typed confirmation requirement.
- **Main Elements:**
  - AlertDialog component (Shadcn)
  - Warning text explaining consequences
  - Confirmation input field
  - Error message display
  - Cancel and Confirm buttons
- **Handled Events:**
  - Confirmation text input
  - Cancel button click
  - Confirm button click
  - API call for deletion
- **Validation Conditions:**
  - Confirmation text must exactly match "DELETE" (case-sensitive)
  - User must be authenticated
- **Types:**
  - `DeleteAccountModalState`
  - `APIErrorResponse`
- **Props:**
  - `isOpen: boolean` - Modal visibility state
  - `onClose: () => void` - Handler to close modal
  - `onConfirm: () => Promise<void>` - Handler for deletion

## 5. Types

### ViewModel Types

```typescript
/**
 * Password change form data structure
 */
type ChangePasswordFormData = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

/**
 * Password validation error messages
 */
type PasswordValidationErrors = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  general?: string;
};

/**
 * Password change form state
 */
type PasswordFormState = {
  formData: ChangePasswordFormData;
  errors: PasswordValidationErrors;
  isSubmitting: boolean;
  successMessage: string | null;
};

/**
 * Delete account modal state
 */
type DeleteAccountModalState = {
  isOpen: boolean;
  confirmationText: string;
  isDeleting: boolean;
  error: string | null;
};

/**
 * Settings tab identifier
 */
type SettingsTab = "account" | "security";

/**
 * Profile loading state
 */
type ProfileState = {
  profile: ProfileDTO | null;
  isLoading: boolean;
  error: string | null;
};
```

### API Types (from src/types.ts)

```typescript
/**
 * Profile DTO - returned from GET /api/profiles/me
 */
type ProfileDTO = {
  id: string;
  ai_consent_given: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * API Error Response - standardized error format
 */
type APIErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
};
```

## 6. State Management

### Global State

No global state management required. All state is component-local.

### Component State

#### SettingsContainer State

```typescript
const [profileState, setProfileState] = useState<ProfileState>({
  profile: null,
  isLoading: true,
  error: null,
});
const [activeTab, setActiveTab] = useState<SettingsTab>("account");
```

**Purpose:** Manages profile data loading and tab navigation.

#### ChangePasswordForm State

```typescript
const [formState, setFormState] = useState<PasswordFormState>({
  formData: {
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  },
  errors: {},
  isSubmitting: false,
  successMessage: null,
});
```

**Purpose:** Manages password change form data, validation, and submission state.

#### DeleteAccountModal State

```typescript
const [modalState, setModalState] = useState<DeleteAccountModalState>({
  isOpen: false,
  confirmationText: "",
  isDeleting: false,
  error: null,
});
```

**Purpose:** Manages account deletion modal state and confirmation.

### Custom Hooks

#### useProfile()

```typescript
function useProfile() {
  const [state, setState] = useState<ProfileState>({
    profile: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    // Fetch from GET /api/profiles/me
  };

  return { ...state, refetch: fetchProfile };
}
```

**Purpose:** Fetches and manages user profile data.

#### useChangePassword()

```typescript
function useChangePassword() {
  const changePassword = async (
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    // Call Supabase Auth updateUser
  };

  return { changePassword };
}
```

**Purpose:** Handles password change logic with Supabase Auth.

#### useDeleteAccount()

```typescript
function useDeleteAccount() {
  const deleteAccount = async (): Promise<{ success: boolean; error?: string }> => {
    // Call DELETE /api/profiles/me
    // Clear session
    // Redirect to goodbye page
  };

  return { deleteAccount };
}
```

**Purpose:** Handles account deletion and cleanup.

## 7. API Integration

### GET /api/profiles/me

**Purpose:** Fetch current user profile data

**Request:**

- Method: GET
- Headers: `Authorization: Bearer {token}` (automatic via Supabase client)
- Body: None

**Response:**

```typescript
// Success (200)
ProfileDTO;

// Error (401, 404, 500)
APIErrorResponse;
```

**Usage:**

```typescript
const response = await fetch("/api/profiles/me", {
  headers: {
    Authorization: `Bearer ${session.access_token}`,
  },
});

if (response.ok) {
  const profile: ProfileDTO = await response.json();
} else {
  const error: APIErrorResponse = await response.json();
}
```

**Error Handling:**

- 401: Redirect to login page
- 404: Show "Profile not found" error
- 500: Show "Unable to load profile" error

### Supabase Auth - Change Password

**Purpose:** Update user password

**Request:**

```typescript
const { data, error } = await supabase.auth.updateUser({
  password: newPassword,
});
```

**Response:**

```typescript
// Success
{ data: { user: User }, error: null }

// Error
{ data: { user: null }, error: AuthError }
```

**Error Handling:**

- Invalid credentials: "Current password is incorrect"
- Weak password: "Password does not meet requirements"
- Network error: "Unable to change password. Please try again."
- Session expired: Redirect to login

### DELETE /api/profiles/me

**Purpose:** Permanently delete user account

**Request:**

- Method: DELETE
- Headers: `Authorization: Bearer {token}` (automatic via Supabase client)
- Body: None

**Response:**

```typescript
// Success (204)
// Empty response

// Error (401, 500)
APIErrorResponse;
```

**Usage:**

```typescript
const response = await fetch("/api/profiles/me", {
  method: "DELETE",
  headers: {
    Authorization: `Bearer ${session.access_token}`,
  },
});

if (response.status === 204) {
  // Success - clear session and redirect
  await supabase.auth.signOut();
  window.location.href = "/goodbye";
} else {
  const error: APIErrorResponse = await response.json();
}
```

**Error Handling:**

- 401: Redirect to login page
- 500: Show "Unable to delete account" error

## 8. User Interactions

### 1. View Settings Page

**Flow:**

1. User navigates to `/settings`
2. Page checks authentication status
3. If not authenticated, redirect to login
4. If authenticated, fetch profile data
5. Display loading skeleton while fetching
6. On success, render tabs with Account tab active
7. On error, display error message with retry option

### 2. Switch Between Tabs

**Flow:**

1. User clicks on "Security" tab
2. Tab content switches to show password form and danger zone
3. Active tab indicator updates
4. Previous tab content is hidden

### 3. Change Password

**Flow:**

1. User fills in current password field
2. User fills in new password field
3. Password strength indicator updates in real-time
4. User fills in confirm password field
5. Form validates on blur and on submit
6. User clicks "Change Password" button
7. Button shows loading state
8. Form submits to Supabase Auth
9. **Success:**
   - Show success message: "Password changed successfully"
   - Clear form fields
   - Keep user logged in (session maintained)
10. **Error:**
    - Show error message below form
    - Keep form data (except passwords)
    - Enable retry

### 4. Delete Account

**Flow:**

1. User scrolls to Danger Zone section
2. User reads warning message
3. User clicks "Delete Account" button
4. Confirmation modal opens
5. Modal displays warning about permanent deletion
6. User types "DELETE" in confirmation field
7. Confirm button remains disabled until text matches exactly
8. User clicks "Confirm Deletion" button
9. Button shows loading state
10. API call to DELETE /api/profiles/me
11. **Success:**
    - Close modal
    - Clear all local storage
    - Sign out from Supabase
    - Redirect to `/goodbye` page
12. **Error:**
    - Show error message in modal
    - Keep modal open
    - Enable retry

## 9. Conditions and Validation

### Password Change Validation

#### Current Password Field

- **Required:** Yes
- **Minimum Length:** 1 character
- **Validation Timing:** On blur and on submit
- **Error Messages:**
  - Empty: "Current password is required"
  - Invalid (from API): "Current password is incorrect"

#### New Password Field

- **Required:** Yes
- **Minimum Length:** 8 characters
- **Pattern Requirements:**
  - At least one uppercase letter (A-Z)
  - At least one lowercase letter (a-z)
  - At least one number (0-9)
- **Additional Rules:**
  - Must be different from current password
- **Validation Timing:** On blur, on change (for strength indicator), on submit
- **Error Messages:**
  - Empty: "New password is required"
  - Too short: "Password must be at least 8 characters"
  - Missing uppercase: "Password must contain at least one uppercase letter"
  - Missing lowercase: "Password must contain at least one lowercase letter"
  - Missing number: "Password must contain at least one number"
  - Same as current: "New password must be different from current password"

#### Confirm Password Field

- **Required:** Yes
- **Must Match:** New password field
- **Validation Timing:** On blur and on submit
- **Error Messages:**
  - Empty: "Please confirm your password"
  - Mismatch: "Passwords do not match"

#### Form-Level Validation

- All fields must be valid before submission
- Submit button disabled while submitting
- Clear all errors on successful submission

### Account Deletion Validation

#### Confirmation Text Field

- **Required:** Yes
- **Exact Match:** Must be exactly "DELETE" (case-sensitive)
- **Validation Timing:** On change (for button enable/disable)
- **UI Behavior:**
  - Confirm button disabled until text matches
  - No error message (button state is sufficient feedback)

#### Pre-Deletion Checks

- User must be authenticated
- Confirmation text must match exactly
- No additional verification required (per PRD)

## 10. Error Handling

### Profile Loading Errors

#### 401 Unauthorized

- **Cause:** Invalid or expired session
- **Action:** Redirect to login page
- **Message:** None (automatic redirect)

#### 404 Not Found

- **Cause:** Profile doesn't exist for authenticated user
- **Action:** Display error state
- **Message:** "Profile not found. Please contact support."
- **Recovery:** Provide "Retry" button

#### 500 Internal Server Error

- **Cause:** Server-side error
- **Action:** Display error state
- **Message:** "Unable to load profile. Please refresh the page."
- **Recovery:** Provide "Retry" button

### Password Change Errors

#### Invalid Current Password

- **Cause:** User entered wrong current password
- **Action:** Show error below current password field
- **Message:** "Current password is incorrect"
- **Recovery:** User can correct and retry

#### Weak Password

- **Cause:** New password doesn't meet requirements
- **Action:** Show error below new password field
- **Message:** Specific message based on missing requirement
- **Recovery:** User can correct and retry

#### Passwords Don't Match

- **Cause:** Confirm password doesn't match new password
- **Action:** Show error below confirm password field
- **Message:** "Passwords do not match"
- **Recovery:** User can correct and retry

#### Network Error

- **Cause:** Connection failure
- **Action:** Show error below form
- **Message:** "Unable to change password. Please check your connection and try again."
- **Recovery:** User can retry

#### Session Expired

- **Cause:** User session expired during operation
- **Action:** Redirect to login page
- **Message:** "Your session has expired. Please log in again."

### Account Deletion Errors

#### 401 Unauthorized

- **Cause:** Invalid or expired session
- **Action:** Close modal, redirect to login
- **Message:** None (automatic redirect)

#### 500 Internal Server Error

- **Cause:** Server-side deletion failure
- **Action:** Show error in modal
- **Message:** "Unable to delete account. Please try again or contact support."
- **Recovery:** User can retry or cancel

#### Network Error

- **Cause:** Connection failure
- **Action:** Show error in modal
- **Message:** "Unable to delete account. Please check your connection and try again."
- **Recovery:** User can retry or cancel

### Error Display Patterns

#### Inline Field Errors

- Display below the relevant input field
- Red text color
- Small font size
- Icon (optional)

#### Form-Level Errors

- Display at top or bottom of form
- Alert component (Shadcn)
- Dismissible (optional)

#### Modal Errors

- Display within modal
- Alert component (Shadcn)
- Non-dismissible (user must retry or cancel)

## 11. Implementation Steps

### Step 1: Create Type Definitions

**File:** `src/types/settings.types.ts`

1. Define `ChangePasswordFormData` type
2. Define `PasswordValidationErrors` type
3. Define `PasswordFormState` type
4. Define `DeleteAccountModalState` type
5. Define `SettingsTab` type
6. Define `ProfileState` type
7. Export all types

### Step 2: Create Custom Hooks

#### 2.1: Create useProfile Hook

**File:** `src/components/hooks/useProfile.ts`

1. Import necessary types
2. Create state for profile, loading, and error
3. Implement fetchProfile function
4. Call GET /api/profiles/me
5. Handle success and error responses
6. Implement useEffect to fetch on mount
7. Return state and refetch function

#### 2.2: Create useChangePassword Hook

**File:** `src/components/hooks/useChangePassword.ts`

1. Import Supabase client
2. Create changePassword function
3. Call supabase.auth.updateUser()
4. Handle success and error responses
5. Return changePassword function

#### 2.3: Create useDeleteAccount Hook

**File:** `src/components/hooks/useDeleteAccount.ts`

1. Import Supabase client
2. Create deleteAccount function
3. Call DELETE /api/profiles/me
4. On success, call supabase.auth.signOut()
5. Redirect to /goodbye page
6. Handle errors
7. Return deleteAccount function

### Step 3: Create Validation Schema

**File:** `src/lib/validation/password.validation.ts`

1. Import zod
2. Create password validation schema
3. Define rules for current password
4. Define rules for new password (length, uppercase, lowercase, number)
5. Define rules for confirm password (match)
6. Export schema and validation function

### Step 4: Create UI Components

#### 4.1: Create AccountInfoSection Component

**File:** `src/components/Settings/AccountInfoSection.tsx`

1. Import Card components from Shadcn
2. Accept profile prop
3. Display user ID
4. Display account creation date
5. Format dates appropriately
6. Style with Tailwind

#### 4.2: Create ChangePasswordForm Component

**File:** `src/components/Settings/ChangePasswordForm.tsx`

1. Import form components and hooks
2. Initialize form state
3. Create input fields for passwords
4. Implement validation logic
5. Create password strength indicator
6. Implement form submission
7. Handle success and error states
8. Display status messages
9. Style with Tailwind

#### 4.3: Create DeleteAccountButton Component

**File:** `src/components/Settings/DeleteAccountButton.tsx`

1. Import Button from Shadcn
2. Accept onClick prop
3. Style as destructive button
4. Add appropriate text and icon

#### 4.4: Create DeleteAccountModal Component

**File:** `src/components/Settings/DeleteAccountModal.tsx`

1. Import AlertDialog from Shadcn
2. Accept isOpen, onClose, onConfirm props
3. Create modal state
4. Implement confirmation input
5. Validate confirmation text
6. Implement deletion logic
7. Handle loading and error states
8. Style with Tailwind

#### 4.5: Create DangerZoneSection Component

**File:** `src/components/Settings/DangerZoneSection.tsx`

1. Import components
2. Create section header with warning styling
3. Add warning message
4. Include DeleteAccountButton
5. Include DeleteAccountModal
6. Manage modal state
7. Style with Tailwind

#### 4.6: Create ChangePasswordSection Component

**File:** `src/components/Settings/ChangePasswordSection.tsx`

1. Import ChangePasswordForm
2. Create section header
3. Include form component
4. Style with Tailwind

#### 4.7: Create SettingsTabs Component

**File:** `src/components/Settings/SettingsTabs.tsx`

1. Import Tabs components from Shadcn
2. Accept profile prop
3. Create tab list with Account and Security tabs
4. Create Account tab content with AccountInfoSection
5. Create Security tab content with ChangePasswordSection and DangerZoneSection
6. Manage active tab state
7. Style with Tailwind

#### 4.8: Create SettingsContainer Component

**File:** `src/components/Settings/SettingsContainer.tsx`

1. Import useProfile hook
2. Import SettingsTabs component
3. Fetch profile on mount
4. Display loading skeleton while fetching
5. Display error state if fetch fails
6. Display SettingsTabs when loaded
7. Style with Tailwind

### Step 5: Create Settings Page

**File:** `src/pages/settings.astro`

1. Import Layout component
2. Import SettingsContainer component
3. Check authentication status
4. Redirect to login if not authenticated
5. Render SettingsContainer within Layout
6. Add page title and meta tags
7. Style with Tailwind

### Step 6: Create Goodbye Page

**File:** `src/pages/goodbye.astro`

1. Create simple page for post-deletion
2. Display confirmation message
3. Provide link to homepage or registration
4. Style with Tailwind

### Step 7: Update Navigation

**File:** `src/components/NavBar.tsx`

1. Add link to Settings page
2. Show only when user is authenticated
3. Style appropriately

### Step 8: Testing

#### 8.1: Manual Testing

1. Test profile loading
2. Test tab switching
3. Test password change with valid data
4. Test password change with invalid data
5. Test password validation messages
6. Test account deletion flow
7. Test confirmation modal
8. Test error handling
9. Test responsive design
10. Test accessibility

#### 8.2: Error Scenario Testing

1. Test with expired session
2. Test with network errors
3. Test with invalid passwords
4. Test with server errors
5. Test deletion cancellation

### Step 9: Accessibility Review

1. Verify keyboard navigation
2. Test with screen reader
3. Check ARIA labels
4. Verify focus management
5. Test color contrast
6. Verify form labels

### Step 10: Documentation

1. Add JSDoc comments to components
2. Document props and types
3. Add usage examples
4. Update API documentation
5. Create user guide for settings

### Step 11: Final Review

1. Code review
2. Security review
3. Performance check
4. Cross-browser testing
5. Mobile device testing
6. Final QA pass
