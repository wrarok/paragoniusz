import type { Page, Response } from "@playwright/test";

/**
 * Wait for a specific API response
 * This eliminates race conditions by ensuring backend operations complete before proceeding
 * 
 * @param page - Playwright page object
 * @param urlPattern - String that the URL should include (e.g., '/api/expenses')
 * @param method - HTTP method (GET, POST, PUT, DELETE, etc.)
 * @param expectedStatus - Expected HTTP status code (default: 200)
 * @param timeout - Maximum wait time in milliseconds (default: 15000)
 * @returns Promise<Response> - The API response object
 * 
 * @example
 * // Wait for expense creation
 * const response = await waitForAPI(page, '/api/expenses', 'POST', 201);
 * 
 * @example
 * // Wait for dashboard data load
 * const response = await waitForAPI(page, '/api/dashboard/summary', 'GET');
 */
export async function waitForAPI(
  page: Page,
  urlPattern: string,
  method: string = "GET",
  expectedStatus: number = 200,
  timeout: number = 15000
): Promise<Response> {
  return await page.waitForResponse(
    (response) =>
      response.url().includes(urlPattern) &&
      response.request().method() === method &&
      response.status() === expectedStatus,
    { timeout }
  );
}

/**
 * Wait for multiple API responses in parallel
 * Useful when multiple operations happen simultaneously
 * 
 * @param page - Playwright page object
 * @param apiCalls - Array of API call specifications
 * @returns Promise<Response[]> - Array of API response objects
 * 
 * @example
 * const responses = await waitForMultipleAPIs(page, [
 *   { urlPattern: '/api/expenses', method: 'POST', status: 201 },
 *   { urlPattern: '/api/dashboard/summary', method: 'GET' }
 * ]);
 */
export async function waitForMultipleAPIs(
  page: Page,
  apiCalls: Array<{
    urlPattern: string;
    method?: string;
    status?: number;
    timeout?: number;
  }>
): Promise<Response[]> {
  const promises = apiCalls.map((call) =>
    waitForAPI(
      page,
      call.urlPattern,
      call.method || "GET",
      call.status || 200,
      call.timeout || 15000
    )
  );
  return await Promise.all(promises);
}

/**
 * Wait for any API response matching the pattern
 * Useful when you don't know which endpoint will respond first
 * 
 * @param page - Playwright page object
 * @param urlPatterns - Array of URL patterns to match
 * @param timeout - Maximum wait time in milliseconds (default: 15000)
 * @returns Promise<Response> - The first matching API response
 * 
 * @example
 * // Wait for either expenses or dashboard to load
 * const response = await waitForAnyAPI(page, ['/api/expenses', '/api/dashboard']);
 */
export async function waitForAnyAPI(
  page: Page,
  urlPatterns: string[],
  timeout: number = 15000
): Promise<Response> {
  return await page.waitForResponse(
    (response) =>
      urlPatterns.some((pattern) => response.url().includes(pattern)) &&
      response.ok(),
    { timeout }
  );
}

/**
 * Wait for a successful API response (any 2xx status)
 * 
 * @param page - Playwright page object
 * @param urlPattern - String that the URL should include
 * @param method - HTTP method
 * @param timeout - Maximum wait time in milliseconds (default: 15000)
 * @returns Promise<Response> - The API response object
 */
export async function waitForSuccessfulAPI(
  page: Page,
  urlPattern: string,
  method: string = "GET",
  timeout: number = 15000
): Promise<Response> {
  return await page.waitForResponse(
    (response) =>
      response.url().includes(urlPattern) &&
      response.request().method() === method &&
      response.ok(), // 200-299 status codes
    { timeout }
  );
}
