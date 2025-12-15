import { faker } from "@faker-js/faker/locale/pl";

/**
 * Predefined Polish category names matching the database
 */
const POLISH_CATEGORIES = [
  { name: "Żywność", icon: "🍔" },
  { name: "Transport", icon: "🚗" },
  { name: "Rachunki", icon: "💡" },
  { name: "Rozrywka", icon: "🎬" },
  { name: "Zdrowie", icon: "💊" },
  { name: "Odzież", icon: "👕" },
  { name: "Dom", icon: "🏠" },
  { name: "Edukacja", icon: "📚" },
  { name: "Inne", icon: "📦" },
] as const;

/**
 * Factory for creating test category data
 */
export function createCategory(
  overrides?: Partial<{
    id: string;
    name: string;
    icon: string;
    created_at: string;
  }>
) {
  const randomCategory = faker.helpers.arrayElement(POLISH_CATEGORIES);

  return {
    id: faker.string.uuid(),
    name: randomCategory.name,
    icon: randomCategory.icon,
    created_at: faker.date.past().toISOString(),
    ...overrides,
  };
}

/**
 * Factory for creating multiple test categories
 */
export function createCategories(count: number, overrides?: Parameters<typeof createCategory>[0]) {
  return Array.from({ length: count }, () => createCategory(overrides));
}

/**
 * Get all predefined categories
 */
export function getAllCategories() {
  return POLISH_CATEGORIES.map((cat) => ({
    id: faker.string.uuid(),
    name: cat.name,
    icon: cat.icon,
    created_at: faker.date.past().toISOString(),
  }));
}
