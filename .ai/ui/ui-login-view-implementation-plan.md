# View Implementation Plan: Login View

## 1. Overview

The Login View is a critical authentication page that allows registered users to access their account using email and password credentials. The view implements secure authentication through Supabase Auth, includes session persistence functionality via a "Remember Me" option, and follows security best practices by displaying generic error messages for failed login attempts. The view is designed with a mobile-first approach and includes comprehensive client-side validation to prevent unnecessary API calls.

## 2. View Routing

**Path:** `/login`

**File Location:** `src/pages/login.astro`

**Access:** Public (unauthenticated users only)

**Redirect Logic:**

- If user is already authenticated, redirect to `/` (dashboard)
- After successful login, redirect to `/` (dashboard)

## 3. Component Structure

```
LoginPage (Astro)
└── LoginForm (React)
    ├── FormErrorMessage (React)
    ├── EmailInput (React)
    │   ├── Label (Shadcn/ui)
    │   └── Input (Shadcn/ui)
    ├── PasswordInput (React)
    │   ├── Label (Shadcn/ui)
    │   ├── Input (Shadcn/ui)
    │   └── Button (visibility toggle)
    ├── RememberMeCheckbox (React)
    │   ├── Checkbox (Shadcn/ui)
    │   └── Label (Shadcn/ui)
    ├── SubmitButton (React)
    │   └── Button (Shadcn/ui)
    └── RegisterLink (React)
```

## 4. Component Details

### LoginPage (Astro Component)

- **Description:** Server-rendered page wrapper that checks authentication status and renders the login form. Handles server-side redirects for already authenticated users.
- **Main Elements:**
  - Layout wrapper with centered form container
  - Page title and metadata
  - LoginForm React component island
- **Handled Interactions:** None (static wrapper)
- **Handled Validation:** Server-side authentication check
- **Types:** None (Astro component)
- **Props:** None

### LoginForm (React Component)

- **Description:** Main form component that manages login state, validation, and submission. Orchestrates all child components and handles communication with Supabase Auth API.
- **Main Elements:**
  - `<form>` element with onSubmit handler
  - FormErrorMessage for general errors
  - EmailInput for email field
  - PasswordInput for password field
  - RememberMeCheckbox for session persistence
  - SubmitButton for form submission
  - RegisterLink for navigation to registration
- **Handled Interactions:**
  - Form submission (Enter key or button click)
  - Field value changes
  - Checkbox toggle
  - Navigation to register page
- **Handled Validation:**
  - Email format validation (RFC 5322 compliant)
  - Password presence validation (non-empty)
  - Form-level validation before submission
  - API error handling and display
- **Types:**
  - `LoginFormData` (state)
  - `LoginValidationErrors` (state)
  - `LoginFormState` (state)
  - `LoginFormProps` (props)
- **Props:**
  - `redirectTo?: string` - Optional redirect path after successful login (default: '/')
  - `onSuccess?: () => void` - Optional callback after successful login

### EmailInput (React Component)

- **Description:** Controlled input field for email address with inline validation and error display. Provides real-time feedback on email format validity.
- **Main Elements:**
  - Label element with "Email" text
  - Input element (type="email")
  - Error message span (conditional)
- **Handled Interactions:**
  - onChange event (updates form state)
  - onBlur event (triggers validation)
- **Handled Validation:**
  - Email format validation using regex pattern: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
  - Required field validation (non-empty)
  - Display error message: "Please enter a valid email address"
- **Types:**
  - `EmailInputProps`
- **Props:**
  - `value: string` - Current email value
  - `error?: string` - Validation error message
  - `onChange: (value: string) => void` - Change handler
  - `onBlur: () => void` - Blur handler for validation
  - `disabled?: boolean` - Disable during submission

### PasswordInput (React Component)

- **Description:** Controlled password input with show/hide toggle functionality. Enhances usability while maintaining security by allowing users to verify their input.
- **Main Elements:**
  - Label element with "Password" text
  - Input element (type="password" or "text")
  - Toggle visibility button with eye icon
  - Error message span (conditional)
- **Handled Interactions:**
  - onChange event (updates form state)
  - onBlur event (triggers validation)
  - Toggle button click (shows/hides password)
- **Handled Validation:**
  - Required field validation (non-empty)
  - Display error message: "Password is required"
- **Types:**
  - `PasswordInputProps`
- **Props:**
  - `value: string` - Current password value
  - `error?: string` - Validation error message
  - `onChange: (value: string) => void` - Change handler
  - `onBlur: () => void` - Blur handler for validation
  - `disabled?: boolean` - Disable during submission

### RememberMeCheckbox (React Component)

- **Description:** Checkbox control for session persistence preference. When checked, the user's session will persist across browser sessions.
- **Main Elements:**
  - Checkbox element (Shadcn/ui)
  - Label element with "Remember me" text
- **Handled Interactions:**
  - onChange event (toggles checkbox state)
- **Handled Validation:** None
- **Types:**
  - `RememberMeCheckboxProps`
- **Props:**
  - `checked: boolean` - Current checkbox state
  - `onChange: (checked: boolean) => void` - Change handler
  - `disabled?: boolean` - Disable during submission

### FormErrorMessage (React Component)

- **Description:** Displays general form-level error messages, particularly for authentication failures. Uses generic messaging for security.
- **Main Elements:**
  - Alert component (Shadcn/ui) with error styling
  - Error icon
  - Error message text
- **Handled Interactions:** None (display only)
- **Handled Validation:** None (displays validation results)
- **Types:**
  - `FormErrorMessageProps`
- **Props:**
  - `error?: string` - Error message to display
  - `className?: string` - Additional CSS classes

### SubmitButton (React Component)

- **Description:** Primary action button for form submission with loading state indication. Disabled during submission to prevent double-submission.
- **Main Elements:**
  - Button element (Shadcn/ui)
  - Loading spinner (conditional)
  - Button text ("Log In" or "Logging In...")
- **Handled Interactions:**
  - onClick event (triggers form submission)
- **Handled Validation:** None (validation handled by form)
- **Types:**
  - `SubmitButtonProps`
- **Props:**
  - `isLoading: boolean` - Whether form is submitting
  - `disabled: boolean` - Whether button is disabled
  - `onClick?: () => void` - Optional click handler

### RegisterLink (React Component)

- **Description:** Navigation link to the registration page for users who don't have an account yet.
- **Main Elements:**
  - Text: "Don't have an account?"
  - Link element to `/register`
- **Handled Interactions:**
  - onClick event (navigation)
- **Handled Validation:** None
- **Types:**
  - `RegisterLinkProps`
- **Props:**
  - `className?: string` - Additional CSS classes

## 5. Types

### LoginFormData

```typescript
/**
 * Login form field values
 */
export type LoginFormData = {
  email: string; // User's email address
  password: string; // User's password
  rememberMe: boolean; // Session persistence preference
};
```

### LoginValidationErrors

```typescript
/**
 * Login form validation error messages
 */
export type LoginValidationErrors = {
  email?: string; // Email field validation error
  password?: string; // Password field validation error
  general?: string; // General form/API error
};
```

### LoginFormState

```typescript
/**
 * Login form component state
 */
export type LoginFormState = {
  formData: LoginFormData; // Current form values
  errors: LoginValidationErrors; // Current validation errors
  isSubmitting: boolean; // Form submission state
  showPassword: boolean; // Password visibility state
};
```

### LoginFormProps

```typescript
/**
 * Login form component props
 */
export type LoginFormProps = {
  redirectTo?: string; // Redirect path after login (default: '/')
  onSuccess?: () => void; // Success callback
};
```

### Component Props Types

```typescript
/**
 * Email input component props
 */
export type EmailInputProps = {
  value: string;
  error?: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  disabled?: boolean;
};

/**
 * Password input component props
 */
export type PasswordInputProps = {
  value: string;
  error?: string;
  showPassword: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
  onToggleVisibility: () => void;
  disabled?: boolean;
};

/**
 * Remember me checkbox component props
 */
export type RememberMeCheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

/**
 * Form error message component props
 */
export type FormErrorMessageProps = {
  error?: string;
  className?: string;
};

/**
 * Submit button component props
 */
export type SubmitButtonProps = {
  isLoading: boolean;
  disabled: boolean;
  onClick?: () => void;
};

/**
 * Register link component props
 */
export type RegisterLinkProps = {
  className?: string;
};
```

## 6. State Management

### State Management Strategy

The Login View uses **local component state** managed by a custom hook (`useLoginForm`). No global state management is required as the authentication state is handled by Supabase and the view is stateless after successful login.

### Custom Hook: useLoginForm

**Location:** `src/components/hooks/useLoginForm.ts`

**Purpose:** Encapsulates all login form logic including state management, validation, and API communication.

**Hook Interface:**

```typescript
export function useLoginForm(props?: LoginFormProps) {
  // Returns
  return {
    formData: LoginFormData;
    errors: LoginValidationErrors;
    isSubmitting: boolean;
    showPassword: boolean;
    handleInputChange: (field: keyof LoginFormData, value: string | boolean) => void;
    handleBlur: (field: keyof LoginFormData) => void;
    handleSubmit: (e: FormEvent) => Promise<void>;
    togglePasswordVisibility: () => void;
  };
}
```

**Internal State:**

- `formData: LoginFormData` - Current form field values
- `errors: LoginValidationErrors` - Validation error messages
- `isSubmitting: boolean` - Form submission state
- `showPassword: boolean` - Password visibility toggle state

**Key Functions:**

1. **handleInputChange(field, value)**
   - Updates form data for specified field
   - Clears error for that field when user starts typing
   - Validates field on change for immediate feedback

2. **handleBlur(field)**
   - Validates specific field when user leaves it
   - Updates errors state with validation result
   - Provides immediate feedback without waiting for submission

3. **handleSubmit(e)**
   - Prevents default form submission
   - Validates all fields
   - If validation passes:
     - Sets isSubmitting to true
     - Calls Supabase auth API
     - Handles success (redirect) or error (display message)
   - If validation fails:
     - Updates errors state
     - Focuses first invalid field

4. **togglePasswordVisibility()**
   - Toggles showPassword state
   - Allows users to verify password input

**Validation Logic:**

- Email: Regex pattern `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- Password: Non-empty check
- Form-level: All fields must be valid before submission

**API Integration:**

- Uses `supabase.auth.signInWithPassword()` from Supabase client
- Passes `persistSession` option based on rememberMe value
- Handles auth errors with generic messaging for security

## 7. API Integration

### Authentication Endpoint

**Method:** Supabase Auth SDK

**Function:** `supabase.auth.signInWithPassword(credentials)`

**Request Type:**

```typescript
{
  email: string;
  password: string;
  options?: {
    persistSession: boolean;  // Based on rememberMe checkbox
  }
}
```

**Response Type (Success):**

```typescript
{
  data: {
    user: User;
    session: Session;
  }
  error: null;
}
```

**Response Type (Error):**

```typescript
{
  data: {
    user: null;
    session: null;
  }
  error: AuthError;
}
```

### Integration Implementation

**Location:** `src/lib/services/auth.service.ts`

**Service Function:**

```typescript
export async function loginUser(
  email: string,
  password: string,
  rememberMe: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
      options: {
        persistSession: rememberMe,
      },
    });

    if (error) {
      // Map all errors to generic message for security
      return {
        success: false,
        error: "Invalid email or password",
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: "Unable to connect. Please try again.",
    };
  }
}
```

**Error Mapping:**

- All authentication errors → "Invalid email or password"
- Network errors → "Unable to connect. Please try again."
- Rate limiting → "Too many login attempts. Please try again later."

**Session Management:**

- When `rememberMe` is true: Session persists in localStorage
- When `rememberMe` is false: Session persists in sessionStorage
- Supabase handles session storage automatically based on `persistSession` option

## 8. User Interactions

### Interaction 1: Enter Email Address

**User Action:** Types email address in email field

**System Response:**

1. Update formData.email state on each keystroke
2. Clear email error if present
3. On blur: Validate email format
4. If invalid: Display "Please enter a valid email address"
5. If valid: Clear any existing error

### Interaction 2: Enter Password

**User Action:** Types password in password field

**System Response:**

1. Update formData.password state on each keystroke
2. Clear password error if present
3. On blur: Validate password is not empty
4. If empty: Display "Password is required"
5. If valid: Clear any existing error

### Interaction 3: Toggle Password Visibility

**User Action:** Clicks eye icon button

**System Response:**

1. Toggle showPassword state
2. Change input type between "password" and "text"
3. Update icon (eye → eye-off or vice versa)
4. Maintain focus on password input

### Interaction 4: Toggle Remember Me

**User Action:** Clicks "Remember me" checkbox

**System Response:**

1. Toggle formData.rememberMe state
2. Update checkbox visual state
3. No validation required

### Interaction 5: Submit Form (Valid Data)

**User Action:** Clicks "Log In" button or presses Enter

**System Response:**

1. Validate all fields
2. If validation passes:
   - Set isSubmitting to true
   - Disable all form inputs
   - Show loading spinner on button
   - Call Supabase auth API
   - On success:
     - Clear form
     - Redirect to dashboard
   - On error:
     - Set isSubmitting to false
     - Display generic error message
     - Re-enable form inputs
     - Keep email value, clear password

### Interaction 6: Submit Form (Invalid Data)

**User Action:** Clicks "Log In" button with invalid data

**System Response:**

1. Validate all fields
2. Update errors state with validation messages
3. Display inline errors under invalid fields
4. Focus first invalid field
5. Do not call API
6. Keep form enabled

### Interaction 7: Navigate to Register

**User Action:** Clicks "Register" link

**System Response:**

1. Navigate to `/register` page
2. Preserve any query parameters if present

### Interaction 8: Network Error During Submission

**User Action:** Submits form but network fails

**System Response:**

1. Catch network error
2. Set isSubmitting to false
3. Display error: "Unable to connect. Please check your internet connection."
4. Re-enable form
5. Allow user to retry

## 9. Conditions and Validation

### Email Field Validation

**Validation Rules:**

1. **Required:** Email must not be empty
   - Error: "Email is required"
   - Checked: On blur and on submit

2. **Format:** Email must match valid email pattern
   - Pattern: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
   - Error: "Please enter a valid email address"
   - Checked: On blur and on submit

**Component:** EmailInput

**UI State:**

- Valid: No error message, normal border color
- Invalid: Red border, error message displayed below field
- Disabled: Gray background, cursor not-allowed

### Password Field Validation

**Validation Rules:**

1. **Required:** Password must not be empty
   - Error: "Password is required"
   - Checked: On blur and on submit

**Component:** PasswordInput

**UI State:**

- Valid: No error message, normal border color
- Invalid: Red border, error message displayed below field
- Disabled: Gray background, cursor not-allowed

### Form-Level Validation

**Validation Rules:**

1. **All fields valid:** Both email and password must pass individual validation
   - Checked: On submit
   - Action: If any field invalid, prevent submission and show errors

2. **API response:** Handle authentication errors
   - Error: "Invalid email or password" (generic for security)
   - Checked: After API call
   - Action: Display error message, keep form enabled

**Component:** LoginForm

**UI State:**

- Submitting: All inputs disabled, button shows loading spinner
- Error: Error message displayed at top of form
- Success: Redirect to dashboard (no UI state change visible)

### Submit Button State

**Enabled Conditions:**

- Form is not currently submitting (`!isSubmitting`)
- At least one field has been modified (optional UX enhancement)

**Disabled Conditions:**

- Form is currently submitting (`isSubmitting`)
- Can be disabled by parent component

**Component:** SubmitButton

**UI State:**

- Enabled: Primary button styling, clickable
- Disabled: Gray styling, cursor not-allowed
- Loading: Spinner icon, "Logging In..." text

## 10. Error Handling

### Client-Side Validation Errors

**Scenario 1: Invalid Email Format**

- **Detection:** Regex validation on blur or submit
- **Display:** Inline error message under email field
- **Message:** "Please enter a valid email address"
- **Recovery:** User corrects email format
- **Prevention:** Validate on blur for immediate feedback

**Scenario 2: Empty Password**

- **Detection:** Length check on blur or submit
- **Display:** Inline error message under password field
- **Message:** "Password is required"
- **Recovery:** User enters password
- **Prevention:** Validate on blur for immediate feedback

**Scenario 3: Multiple Field Errors**

- **Detection:** Form-level validation on submit
- **Display:** All inline errors shown simultaneously
- **Message:** Individual error messages per field
- **Recovery:** User corrects all invalid fields
- **Prevention:** Focus first invalid field automatically

### API Errors

**Scenario 4: Invalid Credentials**

- **Detection:** Supabase auth error response
- **Display:** General error message at top of form
- **Message:** "Invalid email or password"
- **Recovery:** User re-enters credentials
- **Security:** Generic message doesn't reveal if email exists

**Scenario 5: Network Error**

- **Detection:** Network request failure or timeout
- **Display:** General error message at top of form
- **Message:** "Unable to connect. Please check your internet connection."
- **Recovery:** User retries submission
- **Prevention:** Show retry button or allow immediate resubmission

**Scenario 6: Rate Limiting**

- **Detection:** Supabase rate limit error
- **Display:** General error message at top of form
- **Message:** "Too many login attempts. Please try again later."
- **Recovery:** User waits before retrying
- **Prevention:** Implement exponential backoff on client side

**Scenario 7: Server Error (5xx)**

- **Detection:** HTTP 500-599 status codes
- **Display:** General error message at top of form
- **Message:** "Something went wrong. Please try again later."
- **Recovery:** User retries after waiting
- **Logging:** Log error details for debugging

### Edge Cases

**Scenario 8: Session Already Exists**

- **Detection:** Check auth state on page load
- **Display:** Redirect to dashboard
- **Message:** None (silent redirect)
- **Recovery:** N/A - user already logged in
- **Prevention:** Check auth state in Astro page before rendering form

**Scenario 9: Browser Doesn't Support localStorage**

- **Detection:** Try-catch around localStorage access
- **Display:** Warning message (optional)
- **Message:** "Session persistence may not work in private browsing mode"
- **Recovery:** Continue with sessionStorage fallback
- **Prevention:** Supabase handles fallback automatically

**Scenario 10: Form Submission During Network Transition**

- **Detection:** isSubmitting state check
- **Display:** Disabled form prevents double submission
- **Message:** None (prevented by UI state)
- **Recovery:** N/A - prevented
- **Prevention:** Disable form during submission

## 11. Implementation Steps

### Step 1: Create Type Definitions

**File:** `src/types/auth.types.ts`

**Actions:**

1. Create `LoginFormData` type
2. Create `LoginValidationErrors` type
3. Create `LoginFormState` type
4. Create `LoginFormProps` type
5. Create all component props types
6. Export all types

**Validation:** TypeScript compilation succeeds

### Step 2: Create Validation Service

**File:** `src/lib/validation/login.validation.ts`

**Actions:**

1. Create `validateEmail(email: string)` function
2. Create `validatePassword(password: string)` function
3. Create `validateLoginForm(formData: LoginFormData)` function
4. Export validation functions

**Validation:** Unit tests pass for all validation scenarios

### Step 3: Create Auth Service

**File:** `src/lib/services/auth.service.ts`

**Actions:**

1. Import Supabase client
2. Create `loginUser()` function
3. Implement error mapping logic
4. Handle session persistence
5. Export service function

**Validation:** Service correctly calls Supabase API

### Step 4: Create useLoginForm Hook

**File:** `src/components/hooks/useLoginForm.ts`

**Actions:**

1. Set up initial state
2. Implement `handleInputChange` function
3. Implement `handleBlur` function
4. Implement `handleSubmit` function
5. Implement `togglePasswordVisibility` function
6. Integrate validation service
7. Integrate auth service
8. Export hook

**Validation:** Hook manages state correctly and calls API

### Step 5: Create Form Components

**Files:**

- `src/components/LoginForm/EmailInput.tsx`
- `src/components/LoginForm/PasswordInput.tsx`
- `src/components/LoginForm/RememberMeCheckbox.tsx`
- `src/components/LoginForm/FormErrorMessage.tsx`
- `src/components/LoginForm/SubmitButton.tsx`
- `src/components/LoginForm/RegisterLink.tsx`

**Actions:**

1. Create EmailInput component with Shadcn/ui Input
2. Create PasswordInput component with visibility toggle
3. Create RememberMeCheckbox component with Shadcn/ui Checkbox
4. Create FormErrorMessage component with Shadcn/ui Alert
5. Create SubmitButton component with loading state
6. Create RegisterLink component
7. Export all components

**Validation:** Each component renders correctly in isolation

### Step 6: Create LoginForm Component

**File:** `src/components/LoginForm/LoginForm.tsx`

**Actions:**

1. Import useLoginForm hook
2. Import all child components
3. Set up form structure
4. Wire up event handlers
5. Implement form submission
6. Add accessibility attributes
7. Export component

**Validation:** Form integrates all components correctly

### Step 7: Create Login Page

**File:** `src/pages/login.astro`

**Actions:**

1. Import Layout component
2. Check authentication status server-side
3. Redirect if already authenticated
4. Render LoginForm component as React island
5. Add page metadata (title, description)
6. Style page container

**Validation:** Page renders correctly and handles auth state

### Step 8: Add Styling

**Files:** Various component files

**Actions:**

1. Apply Tailwind classes for mobile-first design
2. Ensure responsive layout (mobile, tablet, desktop)
3. Style form elements with Shadcn/ui theme
4. Add focus states for accessibility
5. Add error states styling
6. Test on multiple screen sizes

**Validation:** UI matches design specifications

### Step 9: Add Accessibility Features

**Files:** All component files

**Actions:**

1. Add ARIA labels to all inputs
2. Add aria-describedby for error messages
3. Add aria-live for dynamic errors
4. Ensure keyboard navigation works
5. Test with screen reader
6. Add focus management
7. Ensure color contrast meets WCAG AA

**Validation:** Accessibility audit passes

### Step 10: Integration Testing

**Actions:**

1. Test successful login flow
2. Test failed login with invalid credentials
3. Test validation errors
4. Test "Remember Me" functionality
5. Test password visibility toggle
6. Test navigation to register page
7. Test error handling scenarios
8. Test on multiple browsers
9. Test on mobile devices

**Validation:** All user stories pass acceptance criteria

### Step 11: Security Review

**Actions:**

1. Verify generic error messages
2. Verify no sensitive data in client code
3. Verify HTTPS enforcement
4. Verify session handling
5. Verify no XSS vulnerabilities
6. Verify CSRF protection (handled by Supabase)

**Validation:** Security checklist complete

### Step 12: Performance Optimization

**Actions:**

1. Minimize bundle size
2. Lazy load non-critical components
3. Optimize images and icons
4. Add loading states
5. Test performance on slow networks
6. Measure and optimize Time to Interactive

**Validation:** Performance metrics meet targets

### Step 13: Documentation

**Actions:**

1. Document component APIs
2. Document validation rules
3. Document error messages
4. Add code comments
5. Update README if needed

**Validation:** Documentation is complete and accurate
