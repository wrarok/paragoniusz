# Missing UI Elements - E2E Test Analysis

## KRYTYCZNE PROBLEMY

### 1. **Brak data-testid w kluczowych komponentach**

#### DashboardSummary.tsx

- ❌ `data-testid="total-spent"` - testy oczekują tego dla kwoty całkowitej
- ❌ `data-testid="expense-count"` - testy oczekują liczby wydatków

#### ExpensePieChart.tsx

- ❌ `canvas[data-testid="expense-chart"]` - testy sprawdzają czy wykres istnieje

#### index.astro (Dashboard)

- ❌ `data-testid="dashboard-content"` - używane w setup.helpers.ts
- ❌ `data-testid="recent-expenses"` - używane w receipt-scanning.spec.ts

#### ExpenseVerificationList.tsx (Scan Receipt)

- ❌ `data-testid="total-amount"` - oczekiwane w receipt.helpers.ts:111
- ❌ `data-testid="expense-count"` - oczekiwane w receipt.helpers.ts:119
- ❌ `data-testid="expense-item-{i}"` - oczekiwane w receipt.helpers.ts:132

#### ExpenseVerificationItem.tsx

- ❌ `data-testid="edit-expense-{i}"` - oczekiwane w receipt.helpers.ts:164
- ❌ `data-testid="amount-input-{i}"` - oczekiwane w receipt.helpers.ts:167, 170
- ❌ `data-testid="save-edit-{i}"` - oczekiwane w receipt.helpers.ts:173

#### PasswordStrengthIndicator.tsx

- ❌ `data-testid="password-strength"` - oczekiwane w user-onboarding.spec.ts:228

#### ProcessingStatusIndicator.tsx

- ❌ `data-testid="processing-indicator"` - oczekiwane w receipt-scanning.spec.ts:227

#### NavBar.tsx

- ❌ `data-testid="mobile-menu"` - oczekiwane w mobile-android.spec.ts:27
- ❌ `data-testid="user-menu"` - oczekiwane w auth.helpers.ts:157
- ❌ `data-testid="add-expense-button"` - oczekiwane w expense.spec.ts:22

---

### 2. **Nieistniejące funkcjonalności testowane przez E2E**

#### Date Range Filters (Dashboard Analytics)

Testy: `dashboard-analytics.spec.ts:158-170`, `expense.helpers.ts:387-393`

- ❌ `input[name="from_date"]` - nie istnieje w UI
- ❌ `input[name="to_date"]` - nie istnieje w UI
- ❌ `button:has-text("Filtruj")` - nie istnieje
- ❌ `button:has-text("Wyczyść filtry")` - nie istnieje

#### Category Filter

Testy: `expense.helpers.ts:418-420`

- ❌ `select[name="category_filter"]` - nie istnieje w UI

#### Search Functionality

Używane w wielu testach, ale nigdzie nie zaimplementowane:

- ❌ `input[type="search"]` - nie istnieje

#### Category Breakdown

Testy: `dashboard-analytics.spec.ts:44-50`

- ❌ `data-testid="category-breakdown"` - nie istnieje
- ❌ `data-testid="category-żywność"` - nie istnieje dla poszczególnych kategorii

#### Pagination

Testy: `dashboard-analytics.spec.ts:185-207`

- ❌ `data-testid="pagination"` - nie istnieje
- ❌ `button:has-text("Następna")` - nie istnieje
- ❌ `button:has-text("2")` - strony nie są numerowane

#### Category Stats

Testy: `dashboard-analytics.spec.ts:157-172`

- ❌ `data-testid="category-stats"` - nie istnieje

#### Trend Chart

Testy: `dashboard-analytics.spec.ts:222-240`

- ❌ `data-testid="trend-chart"` - nie istnieje

#### Export Functionality

Testy: `dashboard-analytics.spec.ts:244-262`

- ❌ `button:has-text("Eksportuj")` - nie istnieje
- ❌ `data-testid="export-button"` - nie istnieje

#### Budget Tracker

Testy: `dashboard-analytics.spec.ts:267-283`

- ❌ `data-testid="budget-progress"` - nie istnieje
- ❌ `text=Budżet` - nie istnieje

#### Note Field (Expense Form)

Testy używały `textarea[placeholder*="Notatka"]` - USUNIĘTE z testów już

---

### 3. **Nieistniejące ścieżki routingu**

#### /expenses/new

NavBar zawiera link `href="/expenses/new"` (NavBar.tsx:69), ale ta strona nie istnieje.
Istniejące strony:

- ✅ `/expenses/scan` - skanowanie paragonu
- ✅ `/expenses/[id]/edit` - edycja wydatku
- ❌ `/expenses/new` - dodawanie manualnie (nie istnieje jako osobna strona)

**Problemy:**

1. Testy klikają `nav a[href="/expenses/new"]` ale taka strona nie istnieje
2. NavBar ma link do nieistniejącej strony
3. Dodawanie wydatku odbywa się przez modal, nie przez osobną stronę

---

## ROZWIĄZANIA

### Opcja A: Dodać brakujące data-testid (ZALECANE)

Szybkie, bezinwazyjne, nie zmienia funkcjonalności:

1. **DashboardSummary.tsx** - dodać data-testid do kwoty i liczby wydatków
2. **ExpensePieChart.tsx** - dodać data-testid do ResponsiveContainer
3. **index.astro** - dodać data-testid="dashboard-content" do main
4. **RecentExpensesList.tsx** - dodać data-testid="recent-expenses" do CardContent
5. **ExpenseVerificationList.tsx** - dodać wszystkie brakujące data-testid
6. **ExpenseVerificationItem.tsx** - dodać data-testid dla edycji
7. **PasswordStrengthIndicator.tsx** - dodać data-testid
8. **NavBar.tsx** - dodać data-testid dla menu
9. **ProcessingStatusIndicator.tsx** - sprawdzić i dodać data-testid

### Opcja B: Usunąć testy dla nieistniejącej funkcjonalności (ZALECANE)

Usunąć wszystkie testy sprawdzające:

- Date range filters
- Category filters
- Search
- Category breakdown (szczegółowy)
- Pagination
- Trend charts
- Export
- Budget tracker

Te funkcjonalności nie są w PRD ani w UI, więc nie powinny być testowane.

### Opcja C: Naprawić routing /expenses/new

Utworzyć brakującą stronę `/expenses/new` LUB zmienić NavBar żeby używał modalu.

---

## PODSUMOWANIE ZMIAN

### DO DODANIA (data-testid):

1. DashboardSummary - total-spent, expense-count
2. ExpensePieChart - expense-chart
3. index.astro - dashboard-content
4. RecentExpensesList - recent-expenses
5. ExpenseVerificationList - total-amount, expense-count, expense-item-{i}
6. ExpenseVerificationItem - edit-expense-{i}, amount-input-{i}, save-edit-{i}
7. PasswordStrengthIndicator - password-strength
8. ProcessingStatusIndicator - processing-indicator (jeśli istnieje)
9. NavBar - mobile-menu, user-menu, add-expense-button

### DO USUNIĘCIA Z TESTÓW:

1. Wszystkie testy filtrów (date, category)
2. Wszystkie testy search
3. Testy category breakdown (szczegółowe stats)
4. Testy paginacji
5. Testy trend charts
6. Testy export
7. Testy budget tracker
8. Testy dla note field (już usunięte)

### DO NAPRAWIENIA:

1. NavBar link `/expenses/new` → modal lub nowa strona
2. Wszystkie testy używające `/expenses/new` → aktualizacja do modalu
