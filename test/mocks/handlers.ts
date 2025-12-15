import { http, HttpResponse } from "msw";

/**
 * MSW handlers for mocking Supabase API calls
 * These handlers intercept network requests during tests
 */
export const handlers = [
  // Mock Supabase Auth - Sign In
  http.post("*/auth/v1/token", async ({ request }) => {
    const body = await request.json();

    // Simulate successful login
    if (body && typeof body === "object" && "email" in body && "password" in body) {
      return HttpResponse.json({
        access_token: "mock-access-token",
        token_type: "bearer",
        expires_in: 3600,
        refresh_token: "mock-refresh-token",
        user: {
          id: "mock-user-id",
          email: body.email,
          created_at: new Date().toISOString(),
        },
      });
    }

    return HttpResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }),

  // Mock Supabase Auth - Sign Up
  http.post("*/auth/v1/signup", async ({ request }) => {
    const body = await request.json();

    if (body && typeof body === "object" && "email" in body) {
      return HttpResponse.json({
        user: {
          id: "mock-user-id",
          email: body.email,
          created_at: new Date().toISOString(),
        },
        session: {
          access_token: "mock-access-token",
          refresh_token: "mock-refresh-token",
        },
      });
    }

    return HttpResponse.json({ error: "Invalid request" }, { status: 400 });
  }),

  // Mock Supabase Auth - Get User
  http.get("*/auth/v1/user", () => {
    return HttpResponse.json({
      id: "mock-user-id",
      email: "test@example.com",
      created_at: new Date().toISOString(),
    });
  }),

  // Mock Supabase Auth - Sign Out
  http.post("*/auth/v1/logout", () => {
    return HttpResponse.json({}, { status: 204 });
  }),

  // Mock Supabase Database - Get Expenses
  http.get("*/rest/v1/expenses", () => {
    return HttpResponse.json([
      {
        id: "expense-1",
        user_id: "mock-user-id",
        amount: 100.5,
        category_id: "category-1",
        expense_date: "2024-01-15",
        currency: "PLN",
        created_at: new Date().toISOString(),
      },
    ]);
  }),

  // Mock Supabase Database - Create Expense
  http.post("*/rest/v1/expenses", async ({ request }) => {
    const body = (await request.json()) as Record<string, any>;

    return HttpResponse.json(
      {
        id: "new-expense-id",
        user_id: "mock-user-id",
        ...body,
        created_at: new Date().toISOString(),
      },
      { status: 201 }
    );
  }),

  // Mock Supabase Database - Update Expense
  http.patch("*/rest/v1/expenses", async ({ request }) => {
    const body = (await request.json()) as Record<string, any>;

    return HttpResponse.json({
      id: "expense-1",
      user_id: "mock-user-id",
      ...body,
      updated_at: new Date().toISOString(),
    });
  }),

  // Mock Supabase Database - Delete Expense
  http.delete("*/rest/v1/expenses", () => {
    return HttpResponse.json({}, { status: 204 });
  }),

  // Mock Supabase Database - Get Categories
  http.get("*/rest/v1/categories", () => {
    return HttpResponse.json([
      {
        id: "category-1",
        name: "Żywność",
        icon: "🍔",
        created_at: new Date().toISOString(),
      },
      {
        id: "category-2",
        name: "Transport",
        icon: "🚗",
        created_at: new Date().toISOString(),
      },
    ]);
  }),

  // Mock Supabase Storage - Upload File
  http.post("*/storage/v1/object/receipts/*", () => {
    return HttpResponse.json({
      Key: "receipts/mock-user-id/mock-file-id.jpg",
      Id: "mock-file-id",
    });
  }),

  // Mock Supabase Storage - Delete File
  http.delete("*/storage/v1/object/receipts/*", () => {
    return HttpResponse.json({}, { status: 200 });
  }),

  // Mock Astro API - Create Expense
  http.post(/\/api\/expenses$/, async ({ request }) => {
    const body = (await request.json()) as Record<string, any>;

    return HttpResponse.json(
      {
        id: "new-expense-id",
        user_id: "mock-user-id",
        ...body,
        created_at: new Date().toISOString(),
        category: {
          id: body.category_id,
          name: "Żywność",
        },
      },
      { status: 201 }
    );
  }),

  // Mock Astro API - Update Expense
  http.patch(/\/api\/expenses\/[^/]+$/, async ({ request, params }) => {
    const body = (await request.json()) as Record<string, any>;
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const id = pathParts[pathParts.length - 1];

    return HttpResponse.json({
      id,
      user_id: "mock-user-id",
      ...body,
      updated_at: new Date().toISOString(),
      category: {
        id: body.category_id,
        name: "Żywność",
      },
    });
  }),
];
