import { faker } from "@faker-js/faker/locale/pl";

/**
 * Factory for creating test user data
 */
export function createUser(
  overrides?: Partial<{
    id: string;
    email: string;
    created_at: string;
  }>
) {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    created_at: faker.date.past().toISOString(),
    ...overrides,
  };
}

/**
 * Factory for creating login form data
 */
export function createLoginFormData(
  overrides?: Partial<{
    email: string;
    password: string;
    rememberMe: boolean;
  }>
) {
  return {
    email: faker.internet.email(),
    password: faker.internet.password({ length: 12 }),
    rememberMe: false,
    ...overrides,
  };
}

/**
 * Factory for creating register form data
 */
export function createRegisterFormData(
  overrides?: Partial<{
    email: string;
    password: string;
    confirmPassword: string;
  }>
) {
  const password = faker.internet.password({ length: 12 });

  return {
    email: faker.internet.email(),
    password,
    confirmPassword: password,
    ...overrides,
  };
}
