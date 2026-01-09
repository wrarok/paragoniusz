/**
 * Router Service
 *
 * Abstracts navigation logic to avoid direct window.location usage
 * Makes code more testable and easier to refactor if routing changes
 */

/**
 * Router service for handling application navigation
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class RouterService {
  /**
   * Redirect to dashboard (home page)
   *
   * @param delay - Optional delay in milliseconds before redirect
   */
  static redirectToDashboard(delay = 0): void {
    if (delay > 0) {
      setTimeout(() => {
        window.location.assign("/");
      }, delay);
    } else {
      window.location.assign("/");
    }
  }

  /**
   * Redirect to login page
   */
  static redirectToLogin(): void {
    window.location.assign("/login");
  }

  /**
   * Redirect to a specific path
   *
   * @param path - Path to navigate to
   */
  static redirect(path: string): void {
    window.location.assign(path);
  }

  /**
   * Reload current page
   */
  static reload(): void {
    window.location.reload();
  }

  /**
   * Go back in browser history
   */
  static goBack(): void {
    window.history.back();
  }
}
