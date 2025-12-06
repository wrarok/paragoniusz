import { test, expect } from '@playwright/test';
import { faker } from '@faker-js/faker/locale/pl';

test.describe('Manual Expense Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    // Note: In real tests, you'd need to authenticate first
    await page.goto('/');
  });

  test('should display expense creation form', async ({ page }) => {
    // Click on add expense button (adjust selector based on actual implementation)
    await page.getByRole('button', { name: /dodaj wydatek/i }).click();
    
    // Check if form elements are visible
    await expect(page.getByLabel(/kategoria/i)).toBeVisible();
    await expect(page.getByLabel(/kwota/i)).toBeVisible();
    await expect(page.getByLabel(/data/i)).toBeVisible();
  });

  test('should validate amount field correctly', async ({ page }) => {
    await page.getByRole('button', { name: /dodaj wydatek/i }).click();
    
    // Test negative amount
    await page.getByLabel(/kwota/i).fill('-10.00');
    await page.getByLabel(/kategoria/i).click(); // Trigger validation
    await expect(page.getByText(/kwota musi być większa/i)).toBeVisible();
    
    // Test amount with too many decimals
    await page.getByLabel(/kwota/i).clear();
    await page.getByLabel(/kwota/i).fill('10.555');
    await page.getByLabel(/kategoria/i).click();
    await expect(page.getByText(/maksymalnie 2 miejsca/i)).toBeVisible();
    
    // Test valid amount
    await page.getByLabel(/kwota/i).clear();
    await page.getByLabel(/kwota/i).fill('10.50');
    await expect(page.getByText(/kwota musi być większa/i)).not.toBeVisible();
  });

  test('should validate date field correctly', async ({ page }) => {
    await page.getByRole('button', { name: /dodaj wydatek/i }).click();
    
    // Test future date
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    const futureDateString = futureDate.toISOString().split('T')[0];
    
    await page.getByLabel(/data/i).fill(futureDateString);
    await page.getByLabel(/kwota/i).click(); // Trigger validation
    await expect(page.getByText(/data nie może być w przyszłości/i)).toBeVisible();
    
    // Test valid date
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);
    const pastDateString = pastDate.toISOString().split('T')[0];
    
    await page.getByLabel(/data/i).fill(pastDateString);
    await expect(page.getByText(/data nie może być w przyszłości/i)).not.toBeVisible();
  });

  test('should show warning for dates older than 1 year', async ({ page }) => {
    await page.getByRole('button', { name: /dodaj wydatek/i }).click();
    
    // Set date older than 1 year
    const oldDate = new Date();
    oldDate.setFullYear(oldDate.getFullYear() - 2);
    const oldDateString = oldDate.toISOString().split('T')[0];
    
    await page.getByLabel(/data/i).fill(oldDateString);
    await page.getByLabel(/kwota/i).click(); // Trigger validation
    
    // Should show warning (not error)
    await expect(page.getByText(/starsza niż 1 rok/i)).toBeVisible();
  });

  test('should require all fields before submission', async ({ page }) => {
    await page.getByRole('button', { name: /dodaj wydatek/i }).click();
    
    // Try to submit empty form
    await page.getByRole('button', { name: /zapisz/i }).click();
    
    // Should show validation errors
    await expect(page.getByText(/kategoria.*wymagana/i)).toBeVisible();
    await expect(page.getByText(/kwota.*wymagana/i)).toBeVisible();
    await expect(page.getByText(/data.*wymagana/i)).toBeVisible();
  });

  test('should successfully create expense with valid data', async ({ page }) => {
    // Note: This test requires proper auth setup and mocked API responses
    await page.getByRole('button', { name: /dodaj wydatek/i }).click();
    
    // Fill form with valid data
    await page.getByLabel(/kategoria/i).selectOption({ label: 'Żywność' });
    await page.getByLabel(/kwota/i).fill('45.50');
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    await page.getByLabel(/data/i).fill(yesterday.toISOString().split('T')[0]);
    
    // Submit form
    await page.getByRole('button', { name: /zapisz/i }).click();
    
    // Should show success message or navigate back to dashboard
    // Adjust based on actual implementation
    await expect(page.getByText(/wydatek.*dodany/i)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Expense List Display', () => {
  test('should display empty state when no expenses', async ({ page }) => {
    await page.goto('/');
    
    // Check for empty state message
    await expect(page.getByText(/brak wydatków/i)).toBeVisible();
  });

  test('should display expense list when expenses exist', async ({ page }) => {
    // Note: This requires proper auth and data setup
    await page.goto('/');
    
    // Should show expense list (adjust selectors based on implementation)
    const expenseList = page.getByRole('list', { name: /wydatki/i });
    await expect(expenseList).toBeVisible();
  });

  test('should allow filtering expenses by date', async ({ page }) => {
    await page.goto('/');
    
    // Open date filter (adjust based on implementation)
    await page.getByRole('button', { name: /filtruj/i }).click();
    
    // Select date range
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);
    
    await page.getByLabel(/data od/i).fill(startDate.toISOString().split('T')[0]);
    await page.getByLabel(/data do/i).fill(new Date().toISOString().split('T')[0]);
    
    // Apply filter
    await page.getByRole('button', { name: /zastosuj/i }).click();
    
    // List should update
    await expect(page.getByRole('list', { name: /wydatki/i })).toBeVisible();
  });
});

test.describe('Expense Edit and Delete', () => {
  test('should open edit form for existing expense', async ({ page }) => {
    // Note: Requires authenticated session with existing expenses
    await page.goto('/');
    
    // Click edit button on first expense
    await page.getByRole('button', { name: /edytuj/i }).first().click();
    
    // Should show edit form with pre-filled data
    await expect(page.getByLabel(/kategoria/i)).toBeVisible();
    await expect(page.getByLabel(/kwota/i)).not.toHaveValue('');
  });

  test('should successfully update expense', async ({ page }) => {
    await page.goto('/');
    
    // Edit first expense
    await page.getByRole('button', { name: /edytuj/i }).first().click();
    
    // Update amount
    await page.getByLabel(/kwota/i).clear();
    await page.getByLabel(/kwota/i).fill('99.99');
    
    // Save changes
    await page.getByRole('button', { name: /zapisz/i }).click();
    
    // Should show success message
    await expect(page.getByText(/wydatek.*zaktualizowany/i)).toBeVisible({ timeout: 5000 });
  });

  test('should show confirmation dialog before deleting expense', async ({ page }) => {
    await page.goto('/');
    
    // Click delete button
    await page.getByRole('button', { name: /usuń/i }).first().click();
    
    // Should show confirmation dialog
    await expect(page.getByText(/czy na pewno/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /anuluj/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /usuń/i })).toBeVisible();
  });

  test('should cancel expense deletion', async ({ page }) => {
    await page.goto('/');
    
    const initialExpenseCount = await page.getByRole('listitem').count();
    
    // Click delete and cancel
    await page.getByRole('button', { name: /usuń/i }).first().click();
    await page.getByRole('button', { name: /anuluj/i }).click();
    
    // Expense count should remain the same
    const finalExpenseCount = await page.getByRole('listitem').count();
    expect(finalExpenseCount).toBe(initialExpenseCount);
  });

  test('should successfully delete expense', async ({ page }) => {
    await page.goto('/');
    
    // Delete first expense
    await page.getByRole('button', { name: /usuń/i }).first().click();
    await page.getByRole('button', { name: /usuń/i }).last().click(); // Confirm
    
    // Should show success message
    await expect(page.getByText(/wydatek.*usunięty/i)).toBeVisible({ timeout: 5000 });
  });
});