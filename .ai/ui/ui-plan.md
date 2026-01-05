# UI Architecture for Paragoniusz

## 1. UI Structure Overview

[cite_start]The Paragonius UI is built on a **Mobile-First**, **JAMstack** architecture, leveraging **Astro** for core performance and **React "islands"** for interactivity (like charts and forms)[cite: 10, 28, 38]. This approach ensures ultra-fast initial load times. [cite_start]The primary structure for logged-in users is based on a persistent **Bottom Navigation Bar** with three main entry points[cite: 1, 19, 41]. [cite_start]All interactive components will utilize **Shadcn/ui** for a consistent and accessible experience[cite: 39].

Key architectural decisions include:

- [cite_start]**Performance:** Using React islands with load strategies like `client:idle` or `client:visible`[cite: 10, 28].
- [cite_start]**Navigation:** Fixed Bottom Navigation Bar (Dashboard, Add Expense, Settings)[cite: 1, 19, 41].
- [cite_start]**Error Handling:** Inline form errors for validation (400, 422) and Toast/Alert for system/rate limiting errors (401, 429, 5xx)[cite: 9, 16, 27, 34, 39, 52, 53].

## 2. List of Views

### 2.1 Login View ✅ IMPLEMENTED

- **View Path:** `/login` ([`src/pages/login.astro`](src/pages/login.astro))
- **Main Goal:** Authenticate the user (US-002)
- **Key Information to Display:**
  - Email input with validation
  - Password input with show/hide toggle
  - "Remember Me" checkbox (US-003)
- **Key View Components:**
  - Form Component - [`LoginForm`](src/components/LoginForm/LoginForm.tsx)
  - [`EmailInput`](src/components/LoginForm/EmailInput.tsx) - Email field with RFC 5322 validation
  - [`PasswordInput`](src/components/LoginForm/PasswordInput.tsx) - Password field with visibility toggle
  - [`RememberMeCheckbox`](src/components/LoginForm/RememberMeCheckbox.tsx) - Session persistence option
  - [`FormErrorMessage`](src/components/LoginForm/FormErrorMessage.tsx) - Alert component for errors
  - [`SubmitButton`](src/components/LoginForm/SubmitButton.tsx) - Button with loading state
  - [`RegisterLink`](src/components/LoginForm/RegisterLink.tsx) - Navigation to registration
  - Form logic via [`useLoginForm`](src/components/hooks/useLoginForm.ts) hook
  - Validation - [`login.validation.ts`](src/lib/validation/login.validation.ts)
  - Auth service - [`auth.service.ts`](src/lib/services/auth.service.ts)
- **API Endpoints:**
  - Supabase Auth endpoints (`/auth/v1/*`) - handled by Supabase SDK via `supabase.auth.signInWithPassword()`
- **UX, Accessibility, and Security Considerations:**
  - **Security:** Generic error messages for failed authentication (doesn't reveal if email exists)
  - **Security:** Rate limiting detection with user-friendly messages
  - **UX:** Real-time validation on blur for immediate feedback
  - **UX:** Password visibility toggle for better usability
  - **UX:** Loading states with spinner during submission
  - **Accessibility:** Full ARIA support (aria-invalid, aria-describedby, role="alert")
  - **Accessibility:** Keyboard navigation with focus management
  - Server-side authentication check redirects already logged-in users to dashboard
  - Mobile-first responsive design with Card UI wrapper

### 2.2 Register View ✅ IMPLEMENTED

- **View Path:** `/register` ([`src/pages/register.astro`](src/pages/register.astro))
- **Main Goal:** Create a new user account (US-001)
- **Key Information to Display:**
  - Email input with validation
  - Password input with show/hide toggle
  - Password confirmation with show/hide toggle
  - Password strength indicator
- **Key View Components:**
  - Form Component - [`RegisterForm`](src/components/RegisterForm/RegisterForm.tsx)
  - [`EmailInput`](src/components/LoginForm/EmailInput.tsx) - Email field with RFC 5322 validation (reused from LoginForm)
  - [`PasswordInput`](src/components/LoginForm/PasswordInput.tsx) - Password field with visibility toggle (reused from LoginForm)
  - [`ConfirmPasswordInput`](src/components/RegisterForm/ConfirmPasswordInput.tsx) - Password confirmation field with visibility toggle
  - [`PasswordStrengthIndicator`](src/components/RegisterForm/PasswordStrengthIndicator.tsx) - Visual strength indicator (0-4 levels)
  - [`FormErrorMessage`](src/components/LoginForm/FormErrorMessage.tsx) - Alert component for errors (reused from LoginForm)
  - [`SubmitButton`](src/components/RegisterForm/SubmitButton.tsx) - Button with loading state ("Create Account")
  - [`LoginLink`](src/components/RegisterForm/LoginLink.tsx) - Navigation to login page
  - Form logic via [`useRegisterForm`](src/components/hooks/useRegisterForm.ts) hook
  - Validation - [`register.validation.ts`](src/lib/validation/register.validation.ts)
  - Auth service - [`auth.service.ts`](src/lib/services/auth.service.ts) with `registerUser()` function
- **API Endpoints:**
  - Supabase Auth endpoints (`/auth/v1/*`) - handled by Supabase SDK via `supabase.auth.signUp()`
- **UX, Accessibility, and Security Considerations:**
  - **Security:** Strong password requirements (8+ chars, uppercase, lowercase, number)
  - **Security:** Password confirmation validation ensures passwords match
  - **Security:** Generic error messages for failed registration (doesn't reveal if email exists)
  - **Security:** Rate limiting detection with user-friendly messages
  - **UX:** Real-time validation on blur for immediate feedback
  - **UX:** Password visibility toggles for both password fields
  - **UX:** Visual password strength indicator with color-coded feedback (red→orange→yellow→blue→green)
  - **UX:** Loading states with spinner during submission
  - **Accessibility:** Full ARIA support (aria-invalid, aria-describedby, role="alert", aria-live)
  - **Accessibility:** Password strength indicator with progressbar role
  - **Accessibility:** Keyboard navigation with focus management
  - Server-side authentication check redirects already logged-in users to dashboard
  - Mobile-first responsive design with Card UI wrapper

### 2.3 Dashboard View ✅ IMPLEMENTED

- **View Path:** `/` ([`src/pages/index.astro`](src/pages/index.astro))
- **Main Goal:** Provide a quick financial overview and access to recent activity (US-007, US-008)
- **Key Information to Display:**
  - [cite_start]Total expenses for current month, Pie Chart (Top 5 Categories) [cite: 5, 23, 42]
  - [cite_start]List of Recent Expenses[cite: 7, 43]
- **Key View Components:**
  - [cite_start]**Skeleton Loading** [cite: 14, 32] - [`SkeletonLoader`](src/components/SkeletonLoader.tsx)
  - [cite_start]**Pie Chart Component** (React Island - recharts) [cite: 23, 42] - [`ExpensePieChart`](src/components/ExpensePieChart.tsx)
  - [cite_start]**Dashboard Summary** - [`DashboardSummary`](src/components/DashboardSummary.tsx)
  - [cite_start]**Expense List** with AI/Edit Visual Markers [cite: 15, 33, 44] - [`RecentExpensesList`](src/components/RecentExpensesList.tsx)
  - [cite_start]**Empty State Component** [cite: 14, 43] - [`EmptyState`](src/components/EmptyState.tsx)
  - "Show More" Button[cite: 7, 25]
- **API Endpoints:**
  - [`GET /api/dashboard/summary`](.ai/api-plan.md:442) - Retrieves monthly summary with total amount, top 5 categories, and AI metrics
  - [`GET /api/expenses`](.ai/api-plan.md:116) - Retrieves paginated list of recent expenses (with limit parameter for "Show More")
  - [`DELETE /api/expenses/{id}`](.ai/api-plan.md:423) - Deletes an expense (via Dropdown Menu)
- **UX, Accessibility, and Security Considerations:**
  - [cite_start]**Performance:** Chart isolated as a React island[cite: 23]
  - **UX:** Skeleton loading manages waiting time
  - [cite_start]Expenses utilize Dropdown Menu for Edit/Delete access (US-011, US-012)[cite: 8, 26, 49]
- **Recent Updates:**
  - ✅ **Auto-refresh on delete:** Pie chart and dashboard summary now automatically refresh when an expense is deleted using event-based communication via [`useDashboardRefresh`](src/components/hooks/useDashboardRefresh.ts) hook

### 2.4 Add Expense Modal ✅ IMPLEMENTED

- **View Path:** (N/A - Modal overlay)
- **Main Goal:** Select the method for adding an expense (US-009, US-010)
- **Key Information to Display:**
  - Two buttons: "Add Manually" and "Scan Receipt (AI)"
- **Key View Components:**
  - [cite_start]Modal Dialog (Shadcn/ui)[cite: 12, 30] - [`AddExpenseModal`](src/components/AddExpenseModal/AddExpenseModal.tsx)
  - [`AddExpenseModalTrigger`](src/components/AddExpenseModal/AddExpenseModalTrigger.tsx)
  - [`ManualAddButton`](src/components/AddExpenseModal/ManualAddButton.tsx)
  - [`AIAddButton`](src/components/AddExpenseModal/AIAddButton.tsx)
- **API Endpoints:**
  - [`GET /api/profiles/me`](.ai/api-plan.md:16) - Check AI consent status before showing "Scan Receipt" option
- **UX, Accessibility, and Security Considerations:**
  - [cite_start]**UX:** Quick access point via the central `+` button in the Nav Bar[cite: 1, 19]
  - Implemented via [`NavBar`](src/components/NavBar.tsx) component

### 2.5 Add/Edit Manual View ✅ IMPLEMENTED

- **View Path:** `/add/manual` ([`src/pages/add/manual.astro`](src/pages/add/manual.astro)) or `/expenses/{id}/edit` ([`src/pages/expenses/[id]/edit.astro`](src/pages/expenses/[id]/edit.astro))
- **Main Goal:** Create or update a single expense (US-009, US-011)
- **Key Information to Display:**
  - Input (Amount)
  - Date Picker (Date)
  - Dropdown/Select (Category - populated from cached `/api/categories`)
- **Key View Components:**
  - Form Component - [`ExpenseForm`](src/components/ExpenseForm/ExpenseForm.tsx)
  - [`AmountInput`](src/components/ExpenseForm/AmountInput.tsx)
  - [`DatePicker`](src/components/ExpenseForm/DatePicker.tsx)
  - [`CategorySelect`](src/components/ExpenseForm/CategorySelect.tsx)
  - [`FormActions`](src/components/ExpenseForm/FormActions.tsx)
  - Inline Error Messages - [`FormErrorMessage`](src/components/ExpenseForm/FormErrorMessage.tsx)
  - Form logic via [`useExpenseForm`](src/components/hooks/useExpenseForm.ts) hook
- **API Endpoints:**
  - [`GET /api/categories`](.ai/api-plan.md:84) - Retrieves all categories to populate dropdown (should be cached)
  - [`POST /api/expenses`](.ai/api-plan.md:197) - Creates a new expense (for Add mode)
  - [`GET /api/expenses/{id}`](.ai/api-plan.md:163) - Retrieves expense details (for Edit mode)
  - [`PATCH /api/expenses/{id}`](.ai/api-plan.md:361) - Updates an existing expense (for Edit mode)
- **UX, Accessibility, and Security Considerations:**
  - [cite_start]**UX:** Mandatory front-end validation for Amount (numeric, positive) and Date (not future)[cite: 13, 31, 51]
  - Validation implemented via [`expense-form.validation.ts`](src/lib/validation/expense-form.validation.ts)

### 2.6 Scan Expense Flow ✅ IMPLEMENTED

- **View Path:** `/expenses/scan` ([`src/pages/expenses/scan.astro`](src/pages/expenses/scan.astro))
- **Main Goal:** Manage the complete AI receipt processing flow: Consent, Upload, Process, Verify, Save (US-010)
- **Key Information to Display:**
  - [cite_start]File Upload Input, **AI Consent Modal** (before first use) [cite: 6, 24, 46]
  - [cite_start]**Visual Loading Status Component** (20s timeout)[cite: 4, 22, 47]
  - Receipt summary with date and total amount
  - Editable list of extracted expenses with validation
- **Key View Components:**
  - Main Container - [`ScanExpenseContainer`](src/components/ScanExpense/ScanExpenseContainer.tsx)
  - [`AIConsentModal`](src/components/ScanExpense/AIConsentModal.tsx) - Consent dialog with detailed information
  - [`FileUploadSection`](src/components/ScanExpense/FileUploadSection.tsx) - Drag-and-drop file upload with validation
  - [`ProcessingStatusIndicator`](src/components/ScanExpense/ProcessingStatusIndicator.tsx) - Real-time progress with timeout warning
  - [`ExpenseVerificationList`](src/components/ScanExpense/ExpenseVerificationList.tsx) - Container for expense verification
  - [`ExpenseVerificationItem`](src/components/ScanExpense/ExpenseVerificationItem.tsx) - Individual expense editor
  - [`ErrorDisplay`](src/components/ScanExpense/ErrorDisplay.tsx) - Error-specific messages with contextual actions
  - State management via [`useScanExpenseFlow`](src/components/hooks/useScanExpenseFlow.ts) hook
  - Validation - [`receipt.validation.ts`](src/lib/validation/receipt.validation.ts)
- **API Endpoints:**
  - [`GET /api/profiles/me`](.ai/api-plan.md:16) - Check AI consent status
  - [`PATCH /api/profiles/me`](.ai/api-plan.md:39) - Grant AI consent if not already given
  - [`GET /api/categories`](.ai/api-plan.md:84) - Retrieves categories for expense verification
  - [`POST /api/receipts/upload`](.ai/api-plan.md:532) - Upload receipt image to temporary storage
  - [`POST /api/receipts/process`](.ai/api-plan.md:566) - Process receipt with AI (20s timeout)
  - [`POST /api/expenses/batch`](.ai/api-plan.md:262) - Creates multiple expenses after verification
- **UX, Accessibility, and Security Considerations:**
  - [cite_start]**Security:** Ensures AI consent is granted via `PATCH /api/profiles/me`[cite: 6, 24, 46]
  - **Security:** File validation (JPEG/PNG/HEIC, ≤10MB) on both client and server
  - **UX:** Clear status indication with real-time progress during 20-second processing
  - **UX:** Warning alert at 15 seconds (75% of timeout)
  - **UX:** Drag-and-drop file upload with visual feedback
  - **UX:** Inline validation for amounts and categories during verification
  - **UX:** Visual indicators for edited expenses
  - **UX:** Comparison between calculated total and receipt total
  - [cite_start]**Error Handling:** Specific error messages for timeout (408), extraction failure (422), and other scenarios[cite: 39, 52]
  - **Accessibility:** Full ARIA support throughout all components
  - **Accessibility:** Keyboard navigation for all interactions
  - **Accessibility:** Screen reader announcements for status changes
  - State machine architecture ensures predictable flow through all steps
  - Automatic redirect to dashboard after successful save

### 2.7 Verification View (AI) ✅ INTEGRATED INTO SCAN FLOW

- **Note:** The verification functionality is now integrated into the Scan Expense Flow (section 2.6) rather than being a separate view. After AI processing completes, users verify and edit expenses within the same flow before batch saving.
- **Key Features:**
  - [cite_start]**Editable List** of aggregated expenses (Category, Amount, Items)[cite: 18, 34, 48]
  - Real-time validation with error messages
  - Visual distinction between AI-suggested and user-edited fields
  - Receipt summary header with date and total
  - Batch save with automatic redirect to dashboard

### 2.8 Settings View ✅ IMPLEMENTED

- **View Path:** `/settings` ([`src/pages/settings.astro`](src/pages/settings.astro))
- **Main Goal:** Manage account details, including security and deletion (US-005, US-006)
- **Key Information to Display:**
  - Account Information (User ID, creation date, AI consent status)
  - Change Password Form with strength indicator
  - Delete Account Button with confirmation
- **Key View Components:**
  - Tab/Sectioned View - [`SettingsTabs`](src/components/Settings/SettingsTabs.tsx) with Account and Security tabs
  - **Account Tab:**
    - [`AccountInfoSection`](src/components/Settings/AccountInfoSection.tsx) - Displays read-only profile information
  - **Security Tab:**
    - [`ChangePasswordSection`](src/components/Settings/ChangePasswordSection.tsx) - Password change container
    - [`ChangePasswordForm`](src/components/Settings/ChangePasswordForm.tsx) - Form with validation and strength indicator
    - [`DangerZoneSection`](src/components/Settings/DangerZoneSection.tsx) - Destructive operations container
    - [`DeleteAccountButton`](src/components/Settings/DeleteAccountButton.tsx) - Triggers deletion modal
    - [`DeleteAccountModal`](src/components/Settings/DeleteAccountModal.tsx) - Confirmation dialog requiring "DELETE" text input
  - Main container - [`SettingsContainer`](src/components/Settings/SettingsContainer.tsx) with loading/error states
  - Custom hooks:
    - [`useProfile`](src/components/hooks/useProfile.ts) - Fetches user profile data
    - [`useChangePassword`](src/components/hooks/useChangePassword.ts) - Handles password changes via Supabase Auth
    - [`useDeleteAccount`](src/components/hooks/useDeleteAccount.ts) - Handles account deletion and cleanup
  - Validation - [`password.validation.ts`](src/lib/validation/password.validation.ts) with Zod schema and strength calculation
- **API Endpoints:**
  - [`GET /api/profiles/me`](.ai/api-plan.md:16) - Retrieves current user profile data
  - Supabase Auth endpoints - Change password (handled by Supabase SDK via `supabase.auth.updateUser()`)
  - [`DELETE /api/profiles/me`](.ai/api-plan.md:68) - Permanently deletes user account and all associated data
- **UX, Accessibility, and Security Considerations:**
  - **Security:** Password validation enforces 8+ characters with uppercase, lowercase, and numbers
  - **UX:** Real-time password strength indicator with visual feedback
  - Confirmation Modal for destructive actions (Delete Account) requiring exact "DELETE" text match
  - Loading states with skeleton loaders during profile fetch
  - Comprehensive error handling with user-friendly messages
  - Automatic redirect to [`/goodbye`](src/pages/goodbye.astro) page after successful account deletion
  - Authentication check redirects to login if not authenticated

## 3. User Journey Map

The core user journey is divided into authenticated and unauthenticated states.

### Unauthenticated Flow

1.  **Start:** User accesses the application.
2.  **Redirect:** Redirected to **Login View**.
3.  **Action:** User enters credentials or navigates to **Register View**.
4.  **Success:** Upon successful login/registration, user is redirected to the **Dashboard View** (`/`).

### Core Expense Creation Flow (AI Scanning)

1.  **Initiation:** User is on **Dashboard** and taps the central `+` button in the Nav Bar.
2.  **Selection:** **Add Expense Modal** appears, user selects "Scan Receipt (AI)".
3.  **Consent Check:**
    - **If `ai_consent_given: false`:** **AI Consent Modal** is displayed (US-014).
      - User Accepts: Call `PATCH /api/profiles/me` $\rightarrow$ proceed to Upload.
      - User Declines: Return to Dashboard/Modal selection.
    - **If `ai_consent_given: true`:** Proceed directly to Upload.
4.  **Upload & Process:** User uploads image (`POST /api/receipts/upload`) $\rightarrow$ System displays **Visual Loading Status** (for `POST /api/receipts/process` with 20s timeout).
5.  **Verification:** Upon success, **Verification View (AI)** displays the editable table/list of suggested expenses (US-010).
6.  **Save:** User confirms by tapping "Save Expenses" $\rightarrow$ Call `POST /api/expenses/batch`.
7.  **Completion:** Redirected to **Dashboard View** with updated data.

### Expense Management Flow

1.  **Access:** User finds the expense on the **Dashboard List**.
2.  [cite_start]**Action:** User taps the **Dropdown Menu** associated with the expense[cite: 8, 26].
3.  **Selection (Edit):** User selects "Edit" $\rightarrow$ Redirect to **Add/Edit Manual View** (`/expenses/{id}/edit`).
    - User makes changes $\rightarrow$ Call `PATCH /api/expenses/{id}`.
4.  [cite_start]**Selection (Delete):** User selects "Delete" $\rightarrow$ **Modal Dialog** for confirmation appears (US-012)[cite: 8, 26, 49].
    - User confirms $\rightarrow$ Call `DELETE /api/expenses/{id}`.

## 4. Layout and Navigation Structure

### Navigation Bar

[cite_start]A **fixed, bottom-aligned Navigation Bar** provides the primary means of navigating between the three main views for logged-in users[cite: 1, 19, 41]:

- **Left:** Dashboard (`/`)
- **Center:** Add Expense (Taps the `+` icon, opens the **Add Expense Modal**)
- **Right:** Settings (`/settings/me`)

### View Hierarchy

- **Unauthenticated Routes:** `Login`, `Register` (Full-screen, non-nav-bar routes).
- **Main App Routes (Protected):** `Dashboard`, `Settings` (Utilize the Nav Bar).
- **Operational Routes (Protected):**
  - `Add/Edit Manual View` and `Scan Expense Flow` are typically full-screen overlays or dedicated pages without the main Nav Bar visible, ensuring focus on the task.

### Session Management

[cite_start]The **Supabase SDK** manages the JWT/session in `localStorage` for MVP[cite: 2, 20, 50]. If the token is invalid or expired (401 error from API), the UI must immediately prompt the user to re-authenticate and redirect to the **Login View**.

## 5. Key Components

- [cite_start]**Bottom Navigation Bar:** The primary, persistent component for authenticated routing[cite: 1, 19, 41].
- [cite_start]**Modal Dialog (Shadcn/ui):** Used for crucial interactions: Selecting Add Method [cite: 12, 30][cite_start], AI Consent [cite: 6, 24, 46][cite_start], Account Deletion Confirmation [cite: 17][cite_start], and Expense Deletion Confirmation[cite: 8, 26, 49].
- **Toast/Alert (Shadcn/ui):** Essential for non-blocking, asynchronous communication. [cite_start]Used for general server errors (5xx), authentication failures (401), and specifically for **Rate Limiting (429)** with reset time[cite: 16, 34, 39, 53].
- [cite_start]**Inline Error Message Component:** Displayed directly below form fields to communicate validation errors (400, 422)[cite: 9, 27, 39, 52].
- [cite_start]**Skeleton Loading Screen:** Used on the **Dashboard** and other data-intensive views to improve perceived performance during data fetching[cite: 14, 32, 43].
- [cite_start]**Dropdown Menu (Shadcn/ui):** Used on the Expense List items to initiate Edit or Delete actions[cite: 8, 26, 49].
- [cite_start]**Pie Chart Component (React Island):** Dedicated component for visualizing Top 5 categories on the Dashboard, isolated for performance[cite: 5, 23].
