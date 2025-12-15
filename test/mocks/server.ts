import { setupServer } from "msw/node";
import { handlers } from "./handlers";

/**
 * MSW server instance for Node environment (Vitest)
 * This server will intercept HTTP requests during tests
 */
export const server = setupServer(...handlers);
