/**
 * Base API Client Service
 *
 * Provides centralized HTTP client functionality with:
 * - Error handling
 * - Type safety
 * - Consistent response processing
 */

/**
 * Handle API response and extract data or throw error
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
    throw new Error(message);
  }
  return response.json();
}

/**
 * POST request
 */
export async function post<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleResponse<T>(response);
}

/**
 * PATCH request
 */
export async function patch<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleResponse<T>(response);
}

/**
 * GET request
 */
export async function get<T>(url: string): Promise<T> {
  const response = await fetch(url);
  return handleResponse<T>(response);
}

/**
 * DELETE request
 */
export async function delete_<T>(url: string): Promise<T> {
  const response = await fetch(url, { method: "DELETE" });
  return handleResponse<T>(response);
}
