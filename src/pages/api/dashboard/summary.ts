import type { APIRoute } from 'astro';
import { dashboardQuerySchema } from '../../../lib/validation/dashboard.validation';
import { DashboardService } from '../../../lib/services/dashboard.service';

export const prerender = false;

/**
 * GET /api/dashboard/summary
 * Retrieves aggregated expense data for a specified month
 * 
 * Query Parameters:
 * - month (optional): YYYY-MM format, defaults to current month
 * 
 * Returns:
 * - 200: Dashboard summary with expense aggregations
 * - 400: Invalid query parameters
 * - 500: Internal server error
 */
export const GET: APIRoute = async ({ request, locals }) => {
  try {
    // Check if user is authenticated
    if (!locals.user) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'UNAUTHORIZED',
            message: 'User must be authenticated',
          },
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const userId = locals.user.id;

    // Parse and validate query parameters
    const url = new URL(request.url);
    const monthParam = url.searchParams.get('month');

    const validationResult = dashboardQuerySchema.safeParse({
      month: monthParam,
    });

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'INVALID_INPUT',
            message: 'Invalid query parameters',
            details: validationResult.error.flatten().fieldErrors,
          },
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Calculate date range for the specified or current month
    const month = validationResult.data.month || getCurrentMonth();
    const { fromDate, toDate } = getMonthDateRange(month);

    // Get dashboard summary from service
    const dashboardService = new DashboardService(locals.supabase);
    const summary = await dashboardService.getSummary(userId, fromDate, toDate);

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Dashboard summary error:', error);

    return new Response(
      JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve dashboard summary',
        },
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

/**
 * Get current month in YYYY-MM format (UTC)
 * @returns Current month string
 */
function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Calculate the first and last day of a given month
 * @param month - Month in YYYY-MM format
 * @returns Object with fromDate and toDate in YYYY-MM-DD format
 */
function getMonthDateRange(month: string): { fromDate: string; toDate: string } {
  const [year, monthNum] = month.split('-').map(Number);
  const fromDate = `${year}-${String(monthNum).padStart(2, '0')}-01`;
  
  // Calculate last day of month (day 0 of next month)
  const lastDay = new Date(year, monthNum, 0).getDate();
  const toDate = `${year}-${String(monthNum).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  
  return { fromDate, toDate };
}