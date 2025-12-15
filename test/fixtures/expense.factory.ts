import { faker } from "@faker-js/faker/locale/pl";

/**
 * Factory for creating test expense data
 */
export function createExpense(
  overrides?: Partial<{
    id: string;
    user_id: string;
    amount: number;
    category_id: string;
    expense_date: string;
    currency: string;
    created_at: string;
    updated_at: string;
  }>
) {
  return {
    id: faker.string.uuid(),
    user_id: faker.string.uuid(),
    amount: parseFloat(faker.finance.amount({ min: 1, max: 1000, dec: 2 })),
    category_id: faker.string.uuid(),
    expense_date: faker.date.past().toISOString().split("T")[0],
    currency: "PLN",
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.past().toISOString(),
    ...overrides,
  };
}

/**
 * Factory for creating multiple test expenses
 */
export function createExpenses(count: number, overrides?: Parameters<typeof createExpense>[0]) {
  return Array.from({ length: count }, () => createExpense(overrides));
}

/**
 * Factory for creating expense form data
 */
export function createExpenseFormData(
  overrides?: Partial<{
    category_id: string;
    amount: string;
    expense_date: string;
    currency: string;
  }>
) {
  return {
    category_id: faker.string.uuid(),
    amount: faker.finance.amount({ min: 1, max: 1000, dec: 2 }),
    expense_date: faker.date.past().toISOString().split("T")[0],
    currency: "PLN",
    ...overrides,
  };
}
