/**
 * Base API Client Service
 * 
 * Provides centralized HTTP client functionality with:
 * - Error handling
 * - Type safety
 * - Consistent response processing
 */

export class APIClientService {
  /**
   * Handle API response and extract data or throw error
   */
  private static async handleResponse<T>(response: Response): Promise<T> {
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
  static async post<T>(url: string, body: unknown): Promise<T> {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return this.handleResponse<T>(response);
  }

  /**
   * PATCH request
   */
  static async patch<T>(url: string, body: unknown): Promise<T> {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return this.handleResponse<T>(response);
  }

  /**
   * GET request
   */
  static async get<T>(url: string): Promise<T> {
    const response = await fetch(url);
    return this.handleResponse<T>(response);
  }

  /**
   * DELETE request
   */
  static async delete<T>(url: string): Promise<T> {
    const response = await fetch(url, { method: 'DELETE' });
    return this.handleResponse<T>(response);
  }
}