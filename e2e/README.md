# E2E Tests - Paragoniusz

Testy End-to-End dla aplikacji Paragoniusz używające Playwright.

## 📋 Spis Treści

- [Struktura Testów](#struktura-testów)
- [Uruchomienie Testów](#uruchomienie-testów)
- [Konfiguracja](#konfiguracja)
- [Helper Functions](#helper-functions)
- [Fixtures](#fixtures)
- [Najlepsze Praktyki](#najlepsze-praktyki)

---

## 📁 Struktura Testów

```
e2e/
├── helpers/                         # Helper functions i utilities
│   ├── auth.helpers.ts             # Authentication (login, register, logout)
│   ├── expense.helpers.ts          # Expense CRUD operations
│   ├── receipt.helpers.ts          # Receipt processing i AI
│   └── setup.helpers.ts            # Test setup i cleanup
├── fixtures/                        # Test data i sample files
│   ├── receipts/                   # Receipt image samples (gitignored)
│   └── README.md                   # Fixture documentation
├── receipt-scanning.spec.ts        # ⭐ AI Receipt Scanning (16 testów)
├── user-onboarding.spec.ts         # User Registration & Onboarding (13 testów)
├── dashboard-analytics.spec.ts     # Dashboard & Analytics (15 testów)
├── mobile-android.spec.ts          # Android Mobile Tests (18 testów)
├── auth.spec.ts                    # Authentication Tests (existing)
└── expense.spec.ts                 # Expense CRUD Tests (existing)
```

**Total: ~75+ testów E2E**

---

## 🚀 Uruchomienie Testów

### Podstawowe Komendy

```bash
# Wszystkie testy E2E
npm run test:e2e

# Tryb UI (interaktywny)
npm run test:e2e:ui

# Tryb headed (widoczna przeglądarka)
npm run test:e2e:headed

# Tryb debug
npm run test:e2e:debug

# Tylko testy mobilne (Android)
npm run test:e2e:mobile

# Tylko krytyczne scenariusze
npm run test:e2e:critical

# Pokaż raport
npm run test:e2e:report

# Wszystkie testy (unit + integration + E2E)
npm run test:all
```

### Uruchomienie Konkretnych Testów

```bash
# Tylko receipt scanning
npx playwright test receipt-scanning

# Tylko mobile tests
npx playwright test mobile-android

# Konkretny test
npx playwright test receipt-scanning -g "User scans receipt"
```

---

## ⚙️ Konfiguracja

### Environment Variables

Testy używają zmiennych z `.env.test`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Wymagane do czyszczenia użytkowników testowych
E2E_USERNAME_ID=test-user-uuid
E2E_USERNAME=test@test.com
E2E_PASSWORD=your-password
```

⚠️ **Ważne:** `SUPABASE_SERVICE_ROLE_KEY` jest wymagany do automatycznego usuwania użytkowników testowych po zakończeniu testów. Pobierz go z Supabase Dashboard → Settings → API → service_role key.

### Playwright Config

Konfiguracja w [`playwright.config.ts`](../playwright.config.ts):

- **Base URL:** `http://localhost:4321`
- **Timeout:** 30s per test
- **Retries:** 2 (tylko w CI)
- **Workers:** 1 (sequential execution)
- **Browsers:**
  - Desktop: Chromium
  - Mobile: Samsung Galaxy A35 5G (Android)

---

## 🛠️ Helper Functions

### Authentication Helpers

```typescript
import {
  loginUser,
  registerUser,
  logoutUser,
  getTestUser,
  cleanupTestUsers,
  deleteTestUser,
} from "./helpers/auth.helpers";

// Login with test user credentials
await loginUser(page);

// Login with custom credentials
await loginUser(page, "custom@test.pl", "CustomPass123!");

// Register new user (automatycznie dodany do listy do czyszczenia)
const user = await registerUser(page, "new@test.pl", "SecurePass123!");

// Get test user from environment
const testUser = getTestUser();

// Logout
await logoutUser(page);

// Manualne czyszczenie (zwykle niepotrzebne - działa automatycznie)
await deleteTestUser("test-123@test.pl");
await cleanupTestUsers(); // Usuwa wszystkich utworzonych użytkowników testowych
```

**Automatyczne czyszczenie:** Wszyscy użytkownicy utworzeni przez `registerUser()` są automatycznie usuwani po zakończeniu wszystkich testów dzięki globalTeardown.

**Whitelist:** Następujący użytkownicy NIGDY nie są usuwani:

- `test@test.com`
- `test-b@test.com`
- `wra@acme.com`

### Expense Helpers

```typescript
import {
  createExpense,
  createMultipleExpenses,
  deleteAllExpenses,
  getTotalSpent,
  filterByDateRange,
} from "./helpers/expense.helpers";

// Create single expense
await createExpense(page, { amount: "50.00", category: "żywność" });

// Create multiple expenses
await createMultipleExpenses(page, [
  { amount: "100.00", category: "żywność", date: "2024-01-15" },
  { amount: "50.00", category: "transport", date: "2024-01-16" },
]);

// Get total spent
const total = await getTotalSpent(page);

// Filter by date range
await filterByDateRange(page, "2024-01-01", "2024-01-31");

// Cleanup
await deleteAllExpenses(page);
```

### Receipt Processing Helpers

```typescript
import {
  uploadReceipt,
  waitForAIProcessing,
  verifyExtractedData,
  editExpenseItem,
  saveAllExpenses,
  giveAIConsent,
} from "./helpers/receipt.helpers";

// Ensure AI consent
await giveAIConsent(page);

// Upload and process receipt
await uploadReceipt(page, "./e2e/fixtures/receipts/grocery-receipt.jpg");
const processed = await waitForAIProcessing(page, 25000);

if (processed) {
  // Verify extracted data
  await verifyExtractedData(page, {
    totalAmount: "45.50",
    itemCount: 3,
  });

  // Edit one item
  await editExpenseItem(page, 0, "50.00");

  // Save all
  await saveAllExpenses(page);
}
```

### Setup Helpers

```typescript
import { setupCleanEnvironment, setupWithExpenses, getDateString } from "./helpers/setup.helpers";

// Clean setup (login + delete all expenses)
await setupCleanEnvironment(page);

// Setup with specific number of expenses
await setupWithExpenses(page, 10, 50); // 10 expenses starting at 50 PLN

// Get date strings
const today = getDateString(0);
const yesterday = getDateString(-1);
const nextWeek = getDateString(7);
```

---

## 📦 Fixtures

### Receipt Images

Umieść sample receipt images w `e2e/fixtures/receipts/`:

**Wymagane pliki:**

1. **grocery-receipt.jpg** - Paragon spożywczy (3-5 items, ~45 PLN)
2. **multi-item-receipt.jpg** - Wiele pozycji (8-10+ items)
3. **corrupted-receipt.jpg** - Uszkodzony plik (error testing)
4. **slow-receipt.jpg** - Duży plik 5-10 MB (timeout testing)

⚠️ **Uwaga:** Pliki receipt są gitignored. Zobacz [`fixtures/README.md`](fixtures/README.md) dla szczegółów.

---

## 🎯 Scenariusze Testowe

### 1. Receipt Scanning Journey (16 testów)

**Plik:** [`receipt-scanning.spec.ts`](receipt-scanning.spec.ts)

**Główny przepływ:**

- ✅ Upload → AI Processing → Verify Data → Edit → Save
- ✅ Timeout handling
- ✅ Invalid file types
- ✅ AI consent requirement
- ✅ Multiple item edits
- ✅ Cancel flow
- ✅ Unknown categories
- ✅ Network errors
- ✅ Concurrent uploads

**Metryki:**

- AI Processing: < 20s
- Error handling: wszystkie edge cases
- User feedback: loading indicators, retry buttons

### 2. User Onboarding (13 testów)

**Plik:** [`user-onboarding.spec.ts`](user-onboarding.spec.ts)

**Główny przepływ:**

- ✅ Registration → Login → First Expense
- ✅ Welcome message
- ✅ Form guidance
- ✅ Session persistence
- ✅ Validation errors
- ✅ Password strength indicator
- ✅ Navigation between pages

### 3. Dashboard Analytics (15 testów)

**Plik:** [`dashboard-analytics.spec.ts`](dashboard-analytics.spec.ts)

**Główny przepływ:**

- ✅ Multiple expenses → Correct analytics
- ✅ Date range filtering
- ✅ Category filtering
- ✅ Real-time updates
- ✅ Empty state
- ✅ Chart rendering
- ✅ Export data

**Metryki:**

- Dashboard Load: < 2s
- Filter execution: < 1s
- Real-time updates without refresh

### 4. Mobile Android (18 testów)

**Plik:** [`mobile-android.spec.ts`](mobile-android.spec.ts)

**Device:** Samsung Galaxy A35 5G (1080x2340)

**Główne testy:**

- ✅ Mobile navigation
- ✅ Touch gestures
- ✅ Mobile form inputs
- ✅ File upload (camera/gallery)
- ✅ Portrait/landscape orientation
- ✅ Touch target sizes (44x44px)
- ✅ Scroll behavior
- ✅ No horizontal overflow
- ✅ Mobile keyboard handling

---

## ✅ Najlepsze Praktyki

### Test Structure

```typescript
test.describe('Feature Name', () => {
  // Setup
  test.beforeEach(async ({ page }) => {
    await setupCleanEnvironment(page);
  });

  // Cleanup
  test.afterEach(async ({ page }) => {
    // Optional: cleanup if needed
  });

  test('should do something', async ({ page }) => {
    // Arrange
    await createMultipleExpenses(page, [...]);

    // Act
    await page.click('button');

    // Assert
    expect(await page.textContent('h1')).toContain('Expected');
  });
});
```

### Waiting Strategies

```typescript
// ✅ DOBRE: Wait for specific element
await page.waitForSelector('[data-testid="expense-card"]', { timeout: 5000 });

// ✅ DOBRE: Wait for URL change
await page.waitForURL("/dashboard");

// ✅ DOBRE: Wait for network idle
await page.waitForLoadState("networkidle");

// ⚠️ UNIKAJ: Fixed timeouts (tylko gdy konieczne)
await page.waitForTimeout(1000);
```

### Selectors

```typescript
// ✅ NAJLEPSZE: data-testid
await page.click('[data-testid="add-expense-button"]');

// ✅ DOBRE: Role-based
await page.click('button[type="submit"]');

// ✅ OK: Text content
await page.click("text=Dodaj wydatek");

// ❌ UNIKAJ: CSS classes (mogą się zmieniać)
await page.click(".btn-primary");
```

### Assertions

```typescript
// ✅ DOBRE: Specific assertions
expect(await page.textContent('[data-testid="total"]')).toBe("100.00");

// ✅ DOBRE: Visual assertions
expect(await page.isVisible("text=Success")).toBe(true);

// ✅ DOBRE: Multiple checks
const count = await page.locator('[data-testid="item"]').count();
expect(count).toBe(5);
```

---

## 🐛 Debugging

### Debug Mode

```bash
# Run with debug inspector
npm run test:e2e:debug

# Debug specific test
npx playwright test receipt-scanning -g "User scans receipt" --debug
```

### Screenshots & Videos

Screenshots i videos są automatycznie zapisywane przy failed tests:

```
test-results/
├── receipt-scanning-spec-ts-...
│   ├── test-failed-1.png
│   └── video.webm
```

### Trace Viewer

```bash
# Show traces from last run
npx playwright show-trace test-results/.../trace.zip
```

---

## 📊 Metryki i Cele

### Coverage Goals

- ✅ **3 kluczowe scenariusze** z Master Test Plan - 100%
- ✅ **Receipt Processing Journey** - kompletny flow
- ✅ **User Onboarding** - registration → first expense
- ✅ **Dashboard Analytics** - filtering i visualization

### Quality Goals

- 🎯 Critical paths coverage: 100% ✅
- 🎯 Android compatibility: Samsung Galaxy A35 5G ✅
- 🎯 Error handling: All edge cases covered ✅

---

## 🚨 Troubleshooting

### Common Issues

**Problem:** "File not found" dla receipt fixtures

```bash
# Solution: Sprawdź czy receipt images są w miejscu
ls e2e/fixtures/receipts/

# Zobacz fixtures/README.md dla instrukcji
```

**Problem:** Test timeout w CI

```bash
# Solution: Zwiększ timeout w playwright.config.ts
timeout: 60 * 1000 // 60s
```

**Problem:** Flaky tests

```bash
# Solution: Dodaj explicit waits
await page.waitForSelector('[data-testid="element"]');
await page.waitForLoadState('networkidle');
```

**Problem:** Rate limiting (429) w testach

```bash
# Solution: Testy używają suite-level authentication
# Jeśli problem persists, zwiększ delays między requests
```

---

## 📚 Resources

- [Playwright Documentation](https://playwright.dev/)
- [Master Test Plan](.ai/MASTER_TEST_PLAN.md)
- [E2E Implementation Plan](.ai/E2E_IMPLEMENTATION_PLAN.md)
- [Fixture Documentation](fixtures/README.md)

---

## 👥 Team

**Maintainer:** QA Team  
**Last Updated:** 2024-12-06  
**Version:** 1.0

---

## 📝 Notes

- Wszystkie testy używają test user z `.env.test`
- Receipt fixtures są gitignored (security)
- Mobile tests uruchamiają się na Samsung Galaxy A35 5G emulator
- Failed tests automatycznie zapisują screenshots i videos
- **Automatyczne czyszczenie:** Użytkownicy testowi są automatycznie usuwani po zakończeniu testów (wymaga `SUPABASE_SERVICE_ROLE_KEY`)

## 🧹 Test Data Cleanup

### Automatyczne Czyszczenie

Po zakończeniu wszystkich testów, system automatycznie usuwa utworzonych użytkowników testowych:

```bash
# Po uruchomieniu testów zobaczysz:
🧹 Cleaning up 5 test users...
✅ Deleted test user: test-1733864123456@test.pl
✅ Deleted test user: test-1733864234567@test.pl
...
✅ Test user cleanup complete
```

### Wielowarstwowe Zabezpieczenia

System czyszczenia ma **3 warstwy ochrony** przed usunięciem produkcyjnych użytkowników:

**Warstwa 1: Tracking tylko z testów**

- Tylko użytkownicy utworzeni przez `registerUser()` w testach są dodawani do `createdTestUsers`
- Użytkownicy zarejestrowani przez UI produkcyjne NIGDY nie trafiają na listę

**Warstwa 2: Whitelist**

- Następujący użytkownicy są na whiteliście i NIGDY nie będą usunięci:
  - `test@test.com` - Główny użytkownik testowy
  - `test-b@test.com` - Backup użytkownik testowy
  - `wra@acme.com` - Użytkownik produkcyjny

**Warstwa 3: Pattern Matching**

- System usuwa TYLKO emaile pasujące do wzorca: `test-{timestamp}{random}@test.pl`
- Przykłady emails testowych: `test-1733864123456abc@test.pl`
- Wszystkie inne emaile są automatycznie chronione

**Przykłady:**

- ✅ `test-1733864123456abc@test.pl` - zostanie usunięty (test pattern)
- ❌ `john@example.com` - NIE zostanie usunięty (nie pasuje do pattern)
- ❌ `test@test.com` - NIE zostanie usunięty (whitelist)
- ❌ `nowy-user@test.pl` - NIE zostanie usunięty (nie pasuje do pattern)

### Manualne Czyszczenie

Jeśli potrzebujesz manualnie wyczyścić testowych użytkowników:

```typescript
import { cleanupTestUsers, deleteTestUser } from "./helpers/auth.helpers";

// Usuń wszystkich utworzonych w obecnej sesji
await cleanupTestUsers();

// Usuń konkretnego użytkownika
await deleteTestUser("specific-user@test.pl");
```

**Happy Testing! 🎉**
