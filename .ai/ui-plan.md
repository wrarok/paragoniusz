# UI Architecture for Paragoniusz

## 1. UI Structure Overview

[cite_start]The Paragonius UI is built on a **Mobile-First**, **JAMstack** architecture, leveraging **Astro** for core performance and **React "islands"** for interactivity (like charts and forms)[cite: 10, 28, 38]. This approach ensures ultra-fast initial load times. [cite_start]The primary structure for logged-in users is based on a persistent **Bottom Navigation Bar** with three main entry points[cite: 1, 19, 41]. [cite_start]All interactive components will utilize **Shadcn/ui** for a consistent and accessible experience[cite: 39].

Key architectural decisions include:
* [cite_start]**Performance:** Using React islands with load strategies like `client:idle` or `client:visible`[cite: 10, 28].
* [cite_start]**Navigation:** Fixed Bottom Navigation Bar (Dashboard, Add Expense, Settings)[cite: 1, 19, 41].
* [cite_start]**Error Handling:** Inline form errors for validation (400, 422) and Toast/Alert for system/rate limiting errors (401, 429, 5xx)[cite: 9, 16, 27, 34, 39, 52, 53].

## 2. List of Views

### 2.1 Login View
- **View Path:** `/login`
- **Main Goal:** Authenticate the user (US-002)
- **Key Information to Display:**
  - Email input
  - Password input
  - "Remember Me" checkbox (US-003)
- **Key View Components:**
  - Form Component
  - Inline Error Messages
  - Link to Register
- **API Endpoints:**
  - Supabase Auth endpoints (`/auth/v1/*`) - handled by Supabase SDK
- **UX, Accessibility, and Security Considerations:**
  - **Security:** Generic error message for incorrect credentials
  - **UX:** Front-end validation to prevent unnecessary API calls (400/422)

### 2.2 Register View
- **View Path:** `/register`
- **Main Goal:** Create a new user account (US-001)
- **Key Information to Display:**
  - Email input
  - Password input
  - Password Confirmation
- **Key View Components:**
  - Form Component
  - Inline Error Messages
  - Link to Login
- **API Endpoints:**
  - Supabase Auth endpoints (`/auth/v1/*`) - handled by Supabase SDK
- **UX, Accessibility, and Security Considerations:**
  - **UX:** Passwords validation to ensure they match before submission

### 2.3 Dashboard View
- **View Path:** `/`
- **Main Goal:** Provide a quick financial overview and access to recent activity (US-007, US-008)
- **Key Information to Display:**
  - [cite_start]Total expenses for current month, Pie Chart (Top 5 Categories) [cite: 5, 23, 42]
  - [cite_start]List of Recent Expenses[cite: 7, 43]
- **Key View Components:**
  - [cite_start]**Skeleton Loading** [cite: 14, 32]
  - [cite_start]**Pie Chart Component** (React Island - recharts) [cite: 23, 42]
  - [cite_start]**Expense List** with AI/Edit Visual Markers [cite: 15, 33, 44]
  - [cite_start]**Empty State Component** [cite: 14, 43]
  - "Show More" Button[cite: 7, 25]
- **API Endpoints:**
  - [`GET /api/dashboard/summary`](.ai/api-plan.md:442) - Retrieves monthly summary with total amount, top 5 categories, and AI metrics
  - [`GET /api/expenses`](.ai/api-plan.md:116) - Retrieves paginated list of recent expenses (with limit parameter for "Show More")
  - [`DELETE /api/expenses/{id}`](.ai/api-plan.md:423) - Deletes an expense (via Dropdown Menu)
- **UX, Accessibility, and Security Considerations:**
  - [cite_start]**Performance:** Chart isolated as a React island[cite: 23]
  - **UX:** Skeleton loading manages waiting time
  - [cite_start]Expenses utilize Dropdown Menu for Edit/Delete access (US-011, US-012)[cite: 8, 26, 49]

### 2.4 Add Expense Modal
- **View Path:** (N/A - Modal overlay)
- **Main Goal:** Select the method for adding an expense (US-009, US-010)
- **Key Information to Display:**
  - Two buttons: "Add Manually" and "Scan Receipt (AI)"
- **Key View Components:**
  - [cite_start]Modal Dialog (Shadcn/ui)[cite: 12, 30]
- **API Endpoints:**
  - [`GET /api/profiles/me`](.ai/api-plan.md:16) - Check AI consent status before showing "Scan Receipt" option
- **UX, Accessibility, and Security Considerations:**
  - [cite_start]**UX:** Quick access point via the central `+` button in the Nav Bar[cite: 1, 19]

### 2.5 Add/Edit Manual View
- **View Path:** `/add/manual` or `/expenses/{id}/edit`
- **Main Goal:** Create or update a single expense (US-009, US-011)
- **Key Information to Display:**
  - Input (Amount)
  - Date Picker (Date)
  - Dropdown/Select (Category - populated from cached `/api/categories`)
- **Key View Components:**
  - Form Component
  - Inline Error Messages
- **API Endpoints:**
  - [`GET /api/categories`](.ai/api-plan.md:84) - Retrieves all categories to populate dropdown (should be cached)
  - [`POST /api/expenses`](.ai/api-plan.md:197) - Creates a new expense (for Add mode)
  - [`GET /api/expenses/{id}`](.ai/api-plan.md:163) - Retrieves expense details (for Edit mode)
  - [`PATCH /api/expenses/{id}`](.ai/api-plan.md:361) - Updates an existing expense (for Edit mode)
- **UX, Accessibility, and Security Considerations:**
  - [cite_start]**UX:** Mandatory front-end validation for Amount (numeric, positive) and Date (not future)[cite: 13, 31, 51]

### 2.6 Scan Expense Flow
- **View Path:** `/add/scan` (Logical Flow)
- **Main Goal:** Manage the 3-step AI receipt processing: Upload, Process, Verify (US-010)
- **Key Information to Display:**
  - [cite_start]File Upload Input, **AI Consent Modal** (before first use) [cite: 6, 24, 46]
  - [cite_start]**Visual Loading Status Component** (20s timeout)[cite: 4, 22, 47]
- **Key View Components:**
  - [cite_start]Modal/Full-Screen Flow, Toast/Alert for 408 Timeout/422 Unprocessable Errors (US-013)[cite: 39, 52]
- **API Endpoints:**
  - [`GET /api/profiles/me`](.ai/api-plan.md:16) - Check AI consent status
  - [`PATCH /api/profiles/me`](.ai/api-plan.md:39) - Grant AI consent if not already given
  - [`POST /api/receipts/upload`](.ai/api-plan.md:532) - Upload receipt image to temporary storage
  - [`POST /api/receipts/process`](.ai/api-plan.md:566) - Process receipt with AI (20s timeout)
- **UX, Accessibility, and Security Considerations:**
  - [cite_start]**Security:** Ensures AI consent is granted via `PATCH /api/profiles/me`[cite: 6, 24, 46]
  - **UX:** Clear status indication to manage the 20-second wait

### 2.7 Verification View (AI)
- **View Path:** (In Scan Flow)
- **Main Goal:** Allow user to review and correct AI-suggested expenses before batch saving (US-010)
- **Key Information to Display:**
  - [cite_start]**Editable Table/List** of aggregated expenses (Category, Amount, Date)[cite: 18, 34, 48]
- **Key View Components:**
  - Table/List Component
  - Save/Cancel Buttons
- **API Endpoints:**
  - [`GET /api/categories`](.ai/api-plan.md:84) - Retrieves categories for dropdown if user wants to change AI suggestion
  - [`POST /api/expenses/batch`](.ai/api-plan.md:262) - Creates multiple expenses at once after user verification
- **UX, Accessibility, and Security Considerations:**
  - **UX:** Clear visual distinction between AI-suggested fields and user-edited fields

### 2.8 Settings View
- **View Path:** `/settings/me`
- **Main Goal:** Manage account details, including security and deletion (US-005, US-006)
- **Key Information to Display:**
  - Change Password Form
  - Delete Account Button
- **Key View Components:**
  - [cite_start]Tab/Sectioned View, **Modal Dialog** for account deletion confirmation[cite: 17]
- **API Endpoints:**
  - [`GET /api/profiles/me`](.ai/api-plan.md:16) - Retrieves current user profile data
  - Supabase Auth endpoints - Change password (handled by Supabase SDK)
  - [`DELETE /api/profiles/me`](.ai/api-plan.md:68) - Permanently deletes user account and all associated data
- **UX, Accessibility, and Security Considerations:**
  - **Security:** Requires current password for change
  - [cite_start]Confirmation Modal for destructive actions (Delete Account)[cite: 17]

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
    * **If `ai_consent_given: false`:** **AI Consent Modal** is displayed (US-014).
        * User Accepts: Call `PATCH /api/profiles/me` $\rightarrow$ proceed to Upload.
        * User Declines: Return to Dashboard/Modal selection.
    * **If `ai_consent_given: true`:** Proceed directly to Upload.
4.  **Upload & Process:** User uploads image (`POST /api/receipts/upload`) $\rightarrow$ System displays **Visual Loading Status** (for `POST /api/receipts/process` with 20s timeout).
5.  **Verification:** Upon success, **Verification View (AI)** displays the editable table/list of suggested expenses (US-010).
6.  **Save:** User confirms by tapping "Save Expenses" $\rightarrow$ Call `POST /api/expenses/batch`.
7.  **Completion:** Redirected to **Dashboard View** with updated data.

### Expense Management Flow
1.  **Access:** User finds the expense on the **Dashboard List**.
2.  [cite_start]**Action:** User taps the **Dropdown Menu** associated with the expense[cite: 8, 26].
3.  **Selection (Edit):** User selects "Edit" $\rightarrow$ Redirect to **Add/Edit Manual View** (`/expenses/{id}/edit`).
    * User makes changes $\rightarrow$ Call `PATCH /api/expenses/{id}`.
4.  [cite_start]**Selection (Delete):** User selects "Delete" $\rightarrow$ **Modal Dialog** for confirmation appears (US-012)[cite: 8, 26, 49].
    * User confirms $\rightarrow$ Call `DELETE /api/expenses/{id}`.

## 4. Layout and Navigation Structure

### Navigation Bar
[cite_start]A **fixed, bottom-aligned Navigation Bar** provides the primary means of navigating between the three main views for logged-in users[cite: 1, 19, 41]:
* **Left:** Dashboard (`/`)
* **Center:** Add Expense (Taps the `+` icon, opens the **Add Expense Modal**)
* **Right:** Settings (`/settings/me`)

### View Hierarchy
* **Unauthenticated Routes:** `Login`, `Register` (Full-screen, non-nav-bar routes).
* **Main App Routes (Protected):** `Dashboard`, `Settings` (Utilize the Nav Bar).
* **Operational Routes (Protected):**
    * `Add/Edit Manual View` and `Scan Expense Flow` are typically full-screen overlays or dedicated pages without the main Nav Bar visible, ensuring focus on the task.

### Session Management
[cite_start]The **Supabase SDK** manages the JWT/session in `localStorage` for MVP[cite: 2, 20, 50]. If the token is invalid or expired (401 error from API), the UI must immediately prompt the user to re-authenticate and redirect to the **Login View**.

## 5. Key Components

* [cite_start]**Bottom Navigation Bar:** The primary, persistent component for authenticated routing[cite: 1, 19, 41].
* [cite_start]**Modal Dialog (Shadcn/ui):** Used for crucial interactions: Selecting Add Method [cite: 12, 30][cite_start], AI Consent [cite: 6, 24, 46][cite_start], Account Deletion Confirmation [cite: 17][cite_start], and Expense Deletion Confirmation[cite: 8, 26, 49].
* **Toast/Alert (Shadcn/ui):** Essential for non-blocking, asynchronous communication. [cite_start]Used for general server errors (5xx), authentication failures (401), and specifically for **Rate Limiting (429)** with reset time[cite: 16, 34, 39, 53].
* [cite_start]**Inline Error Message Component:** Displayed directly below form fields to communicate validation errors (400, 422)[cite: 9, 27, 39, 52].
* [cite_start]**Skeleton Loading Screen:** Used on the **Dashboard** and other data-intensive views to improve perceived performance during data fetching[cite: 14, 32, 43].
* [cite_start]**Dropdown Menu (Shadcn/ui):** Used on the Expense List items to initiate Edit or Delete actions[cite: 8, 26, 49].
* [cite_start]**Pie Chart Component (React Island):** Dedicated component for visualizing Top 5 categories on the Dashboard, isolated for performance[cite: 5, 23].