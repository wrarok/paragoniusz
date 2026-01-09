/**
 * ErrorDisplay component - Refactored with Strategy Pattern
 *
 * This module exports the ErrorDisplay component and its sub-components.
 * The refactoring reduced complexity from 206 LOC to ~50 LOC by:
 *
 * 1. Extracting error configuration to centralized config file
 * 2. Splitting monolithic component into reusable sub-components
 * 3. Using Strategy Pattern for error handling
 * 4. Eliminating giant switch statement (120+ lines)
 *
 * Sub-components are also exported for potential reuse in other contexts.
 */

export { ErrorDisplay } from "./ErrorDisplay";
export { ErrorHeader } from "./ErrorHeader";
export { ErrorContent } from "./ErrorContent";
export { ErrorActions } from "./ErrorActions";
export { ErrorAlert } from "./ErrorAlert";
export { ErrorDetails } from "./ErrorDetails";
export { ErrorSuggestions } from "./ErrorSuggestions";
export { ErrorTips } from "./ErrorTips";
