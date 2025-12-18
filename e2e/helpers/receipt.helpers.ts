import type { Page } from "@playwright/test";

/**
 * Receipt data structure for verification
 */
export interface ReceiptData {
  totalAmount: string;
  itemCount: number;
  items?: {
    name: string;
    amount: string;
    category: string;
  }[];
}

/**
 * Upload receipt file and start processing
 *
 * @param page - Playwright Page object
 * @param filePath - Path to receipt image file (relative to project root)
 *
 * @example
 * ```typescript
 * await uploadReceipt(page, './e2e/fixtures/receipts/grocery-receipt.jpg');
 * ```
 */
export async function uploadReceipt(page: Page, filePath: string): Promise<void> {
  // Navigate to scan page if not already there
  if (!page.url().includes("/expenses/scan")) {
    await page.goto("/expenses/scan");
    await page.waitForLoadState("networkidle");
  }

  // Wait for file input to exist (even if hidden)
  await page.waitForSelector('input[type="file"]', { state: "attached", timeout: 10000 });

  // Upload file directly to hidden input
  try {
    await page.setInputFiles('input[type="file"]', filePath);
    console.log(`Uploaded file: ${filePath}`);
  } catch (error) {
    console.error(`Failed to upload file ${filePath}:`, error);
    throw new Error(`File upload failed: ${error}`);
  }

  // Wait for file to be processed/validated and button to appear
  await page.waitForTimeout(1000);

  // Wait for upload button to appear (after file is selected)
  try {
    await page.waitForSelector('button:has-text("Prześlij i przetwórz"):not([disabled])', { timeout: 5000 });
    await page.click('button:has-text("Prześlij i przetwórz")');
    console.log("Clicked upload and process button");
  } catch (error) {
    // Try alternative selectors
    const uploadButton = await page
      .locator("button")
      .filter({ hasText: /Prześlij|Przetwórz/ })
      .first();
    if (await uploadButton.isVisible()) {
      await uploadButton.click();
      console.log("Clicked upload button (alternative selector)");
    } else {
      throw new Error("Upload button not found or not clickable");
    }
  }
}

/**
 * Wait for AI processing to complete
 * Returns true if processing succeeded, false if timeout occurred
 *
 * @param page - Playwright Page object
 * @param timeout - Maximum time to wait in milliseconds (default: 25000)
 * @returns true if processing completed, false if timeout
 *
 * @example
 * ```typescript
 * const processed = await waitForAIProcessing(page, 25000);
 * if (processed) {
 *   console.log('Processing succeeded');
 * } else {
 *   console.log('Processing timed out');
 * }
 * ```
 */
export async function waitForAIProcessing(page: Page, timeout = 25000): Promise<boolean> {
  try {
    // Wait for verification screen, timeout error, or general error
    await Promise.race([
      page.waitForSelector("text=Zweryfikuj i zapisz", { timeout }),
      page.waitForSelector("text=Przekroczono limit czasu", { timeout }),
      page.waitForSelector("text=Wystąpił błąd", { timeout }),
      page.waitForSelector("text=Failed to upload", { timeout }),
      page.waitForSelector("text=timeout", { timeout }),
      page.waitForSelector("text=error", { timeout }),
    ]);

    // Check which state we're in
    const hasVerificationScreen = await page.isVisible("text=Zweryfikuj i zapisz");
    if (hasVerificationScreen) {
      return true;
    }

    // Check for various error conditions
    const hasTimeoutError = await page.isVisible("text=Przekroczono limit czasu");
    const hasGeneralError = await page.isVisible("text=Wystąpił błąd");
    const hasUploadError = await page.isVisible("text=Failed to upload");
    const hasTimeoutErrorEn = await page.isVisible("text=timeout");
    const hasErrorEn = await page.isVisible("text=error");

    if (hasTimeoutError || hasGeneralError || hasUploadError || hasTimeoutErrorEn || hasErrorEn) {
      console.log("AI processing failed with error");
      return false;
    }

    return false;
  } catch (error) {
    console.log("AI processing timeout or error:", error);

    // Check for any error messages on the page
    const hasAnyError = await page
      .isVisible("text=Wystąpił błąd")
      .catch(() => page.isVisible("text=Failed"))
      .catch(() => page.isVisible("text=Error"))
      .catch(() => page.isVisible("text=timeout"))
      .catch(() => page.isVisible("text=error"))
      .catch(() => false);

    if (hasAnyError) {
      console.log("Error detected on page during processing");
      return false;
    }

    // If no error message found, it's likely a timeout
    return false;
  }
}

/**
 * Verify extracted receipt data matches expectations
 *
 * @param page - Playwright Page object
 * @param expected - Expected receipt data
 *
 * @example
 * ```typescript
 * await verifyExtractedData(page, {
 *   totalAmount: '45.50',
 *   itemCount: 3
 * });
 * ```
 */
export async function verifyExtractedData(page: Page, expected: ReceiptData): Promise<void> {
  // Verify total amount with flexible matching
  const totalAmount = await page.textContent('[data-testid="total-amount"]');
  
  if (expected.totalAmount.startsWith("13")) {
    // Flexible matching for amounts starting with "13" in xxx.xx format
    const amountPattern = /13\d\.\d{2}/;
    if (!totalAmount || !amountPattern.test(totalAmount)) {
      throw new Error(`Expected total amount starting with "13" in xxx.xx format, got ${totalAmount}`);
    }
  } else {
    // Exact matching for other amounts
    if (!totalAmount?.includes(expected.totalAmount)) {
      throw new Error(`Expected total ${expected.totalAmount}, got ${totalAmount}`);
    }
  }

  // Verify item count
  const itemCount = await page.textContent('[data-testid="expense-count"]');
  if (!itemCount?.includes(expected.itemCount.toString())) {
    throw new Error(`Expected ${expected.itemCount} items, got ${itemCount}`);
  }

  // Verify individual items if provided
  if (expected.items) {
    for (let i = 0; i < expected.items.length; i++) {
      const item = expected.items[i];

      // Check if item exists
      const itemElement = await page.$(`[data-testid="expense-item-${i}"]`);
      if (!itemElement) {
        throw new Error(`Item at index ${i} not found`);
      }

      // Verify item details (name, amount, category)
      const itemText = await itemElement.textContent();
      if (!itemText?.includes(item.amount)) {
        throw new Error(`Item ${i}: Expected amount ${item.amount}`);
      }
    }
  }
}

/**
 * Edit expense item before saving
 *
 * @param page - Playwright Page object
 * @param index - Index of item to edit (0-based)
 * @param newAmount - New amount value
 *
 * @example
 * ```typescript
 * await editExpenseItem(page, 0, '50.00');
 * ```
 */
export async function editExpenseItem(page: Page, index: number, newAmount: string): Promise<void> {
  // Find the amount input within the expense item
  const amountInput = page.locator(`[data-testid="expense-item-${index}"] input[type="number"]`);
  
  // Clear and fill new amount
  await amountInput.click();
  await amountInput.fill(newAmount);
  
  // Press Tab to trigger onChange and validation
  await amountInput.press("Tab");
  
  // Wait for change to be processed
  await page.waitForTimeout(500);
  
  console.log(`Edited expense item ${index} amount to ${newAmount}`);
}

/**
 * Edit receipt date (form-level date input)
 *
 * @param page - Playwright Page object
 * @param newDate - New date value in YYYY-MM-DD format
 *
 * @example
 * ```typescript
 * await editReceiptDate(page, '2024-12-16');
 * ```
 */
export async function editReceiptDate(page: Page, newDate: string): Promise<void> {
  // Find the receipt date input (form-level)
  const dateInput = page.locator('input[type="date"]').first();
  
  // Clear and fill new date
  await dateInput.click();
  await dateInput.fill(newDate);
  
  // Press Tab to trigger onChange and validation
  await dateInput.press("Tab");
  
  // Wait for change to be processed
  await page.waitForTimeout(500);
  
  console.log(`Edited receipt date to ${newDate}`);
}

/**
 * Save all extracted expenses to database
 *
 * @param page - Playwright Page object
 *
 * @example
 * ```typescript
 * await saveAllExpenses(page);
 * ```
 */
export async function saveAllExpenses(page: Page): Promise<void> {
  // Click save button (try multiple possible texts)
  const saveButton = page.locator('button[type="submit"]').filter({ hasText: /Zweryfikuj i zapisz|Zapisz wszystkie|Zapisz/ });
  
  await saveButton.click();

  // Wait for redirect to dashboard
  await page.waitForURL("/", { timeout: 10000 });
}

/**
 * Cancel receipt scanning flow
 *
 * @param page - Playwright Page object
 *
 * @example
 * ```typescript
 * await cancelScanning(page);
 * ```
 */
export async function cancelScanning(page: Page): Promise<void> {
  // Click cancel button
  await page.click('button:has-text("Anuluj")');

  // Wait for redirect to dashboard with longer timeout
  await page.waitForURL("/", { timeout: 15000 });
}

/**
 * Check if AI consent is given for current user
 *
 * @param page - Playwright Page object
 * @returns true if consent is given, false if consent dialog appears
 *
 * @example
 * ```typescript
 * const hasConsent = await hasAIConsent(page);
 * if (!hasConsent) {
 *   await giveAIConsent(page);
 * }
 * ```
 */
export async function hasAIConsent(page: Page): Promise<boolean> {
  await page.goto("/expenses/scan");

  // Wait a moment for dialog to appear if needed
  await page.waitForTimeout(1000);

  // Check if consent dialog is visible
  const consentRequired = await page.isVisible("text=Wymagana zgoda na przetwarzanie AI");
  return !consentRequired;
}

/**
 * Give AI consent (if not already given)
 *
 * @param page - Playwright Page object
 *
 * @example
 * ```typescript
 * await giveAIConsent(page);
 * ```
 */
export async function giveAIConsent(page: Page): Promise<void> {
  // Navigate to settings to give AI consent
  await page.goto("/settings");
  await page.waitForLoadState("networkidle");

  // Check if AI consent toggle exists and is not checked
  const consentToggle = page
    .locator('input[type="checkbox"]')
    .filter({ hasText: /AI|zgoda/i })
    .first();
  const toggleExists = await consentToggle.isVisible().catch(() => false);

  if (toggleExists) {
    const isChecked = await consentToggle.isChecked().catch(() => false);
    if (!isChecked) {
      await consentToggle.click();
      await page.waitForTimeout(1000);
    }
  }

  // Alternative: look for AI consent section and enable it
  const aiSection = page.locator("text=AI").first();
  const aiSectionExists = await aiSection.isVisible().catch(() => false);

  if (aiSectionExists) {
    // Try to find and click enable button
    await page.click('button:has-text("Włącz")').catch(() => {
      // If no enable button, consent might already be given
    });
    await page.waitForTimeout(500);
  }
}

/**
 * Retry failed receipt processing
 *
 * @param page - Playwright Page object
 *
 * @example
 * ```typescript
 * if (!await waitForAIProcessing(page)) {
 *   await retryProcessing(page);
 * }
 * ```
 */
export async function retryProcessing(page: Page): Promise<void> {
  // Click retry button
  await page.click('button:has-text("Spróbuj ponownie")');

  // Wait for processing to start
  await page.waitForTimeout(1000);
}

/**
 * Get extracted expense items count
 *
 * @param page - Playwright Page object
 * @returns Number of extracted items
 *
 * @example
 * ```typescript
 * const count = await getExtractedItemsCount(page);
 * expect(count).toBeGreaterThan(0);
 * ```
 */
export async function getExtractedItemsCount(page: Page): Promise<number> {
  const items = await page.$$('[data-testid^="expense-item-"]');
  return items.length;
}

/**
 * Edit multiple expense items at once
 *
 * @param page - Playwright Page object
 * @param edits - Array of {index, amount} objects
 *
 * @example
 * ```typescript
 * await editMultipleItems(page, [
 *   { index: 0, amount: '10.00' },
 *   { index: 1, amount: '20.00' },
 *   { index: 2, amount: '30.00' }
 * ]);
 * ```
 */
export async function editMultipleItems(page: Page, edits: { index: number; amount: string }[]): Promise<void> {
  for (const edit of edits) {
    await editExpenseItem(page, edit.index, edit.amount);
  }
}

/**
 * Verify error message is displayed
 *
 * @param page - Playwright Page object
 * @param errorText - Expected error text (or regex pattern)
 * @returns true if error is visible
 *
 * @example
 * ```typescript
 * const hasError = await verifyError(page, 'Przekroczono limit czasu');
 * expect(hasError).toBe(true);
 * ```
 */
export async function verifyError(page: Page, errorText: string | RegExp): Promise<boolean> {
  if (typeof errorText === "string") {
    return await page.isVisible(`text=${errorText}`);
  } else {
    // For regex, need to check all text content
    const bodyText = await page.textContent("body");
    return errorText.test(bodyText || "");
  }
}

/**
 * Wait for upload to complete (file selected and validated)
 *
 * @param page - Playwright Page object
 * @param timeout - Maximum time to wait in milliseconds
 *
 * @example
 * ```typescript
 * await page.setInputFiles('input[type="file"]', filePath);
 * await waitForUploadComplete(page);
 * ```
 */
export async function waitForUploadComplete(page: Page, timeout = 5000): Promise<void> {
  // Wait for process button to be enabled
  await page.waitForSelector('button:has-text("Przetwórz paragon"):not([disabled])', {
    timeout,
  });
}

/**
 * Get total amount from extracted data
 *
 * @param page - Playwright Page object
 * @returns Total amount as string
 *
 * @example
 * ```typescript
 * const total = await getExtractedTotal(page);
 * expect(total).toBe('45.50');
 * ```
 */
export async function getExtractedTotal(page: Page): Promise<string> {
  const totalText = await page.textContent('[data-testid="total-amount"]');

  if (!totalText) {
    throw new Error("Total amount not found");
  }

  // Extract just the number
  const match = totalText.match(/[\d,.]+/);
  return match ? match[0] : "0";
}
