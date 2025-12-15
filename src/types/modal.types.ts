import type { APIErrorResponse, ProfileDTO } from "../types";

// ============================================================================
// Modal State Management
// ============================================================================

/**
 * Modal state management
 * Internal state for the AddExpenseModal component
 */
export interface AddExpenseModalState {
  isOpen: boolean;
  isLoading: boolean;
  error: APIErrorResponse | null;
  profile: ProfileDTO | null;
}

// ============================================================================
// Modal Component Props
// ============================================================================

/**
 * Modal component props
 * Main props for the AddExpenseModal component
 */
export interface AddExpenseModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectManual: () => void;
  onSelectAI: () => void;
}

/**
 * Action buttons container props
 * Props for the ActionButtons component that contains manual and AI buttons
 */
export interface ActionButtonsProps {
  profile: ProfileDTO;
  onSelectManual: () => void;
  onSelectAI: () => void;
}

// ============================================================================
// Individual Button Props
// ============================================================================

/**
 * Manual add button props
 * Props for the button that navigates to manual expense entry
 */
export interface ManualAddButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

/**
 * AI add button props
 * Props for the button that navigates to AI receipt scanning
 */
export interface AIAddButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

// ============================================================================
// State Component Props
// ============================================================================

/**
 * Error state props
 * Props for displaying error messages with retry functionality
 */
export interface ErrorStateProps {
  error: APIErrorResponse;
  onRetry: (() => void) | null;
  onClose: () => void;
}

/**
 * Loading state props
 * Props for displaying loading indicators
 */
export interface LoadingStateProps {
  message?: string;
}

/**
 * Consent info message props
 * Props for displaying AI consent information
 */
export interface ConsentInfoMessageProps {
  onNavigateToSettings?: () => void;
}

// ============================================================================
// Trigger Button Props
// ============================================================================

/**
 * Trigger button props
 * Props for the button that opens the modal
 */
export interface AddExpenseModalTriggerProps {
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}
