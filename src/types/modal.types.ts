import type { APIErrorResponse, ProfileDTO } from '../types';

// ============================================================================
// Modal State Management
// ============================================================================

/**
 * Modal state management
 * Internal state for the AddExpenseModal component
 */
export type AddExpenseModalState = {
  isOpen: boolean;
  isLoading: boolean;
  error: APIErrorResponse | null;
  profile: ProfileDTO | null;
};

// ============================================================================
// Modal Component Props
// ============================================================================

/**
 * Modal component props
 * Main props for the AddExpenseModal component
 */
export type AddExpenseModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectManual: () => void;
  onSelectAI: () => void;
};

/**
 * Action buttons container props
 * Props for the ActionButtons component that contains manual and AI buttons
 */
export type ActionButtonsProps = {
  profile: ProfileDTO;
  onSelectManual: () => void;
  onSelectAI: () => void;
};

// ============================================================================
// Individual Button Props
// ============================================================================

/**
 * Manual add button props
 * Props for the button that navigates to manual expense entry
 */
export type ManualAddButtonProps = {
  onClick: () => void;
  disabled?: boolean;
};

/**
 * AI add button props
 * Props for the button that navigates to AI receipt scanning
 */
export type AIAddButtonProps = {
  onClick: () => void;
  disabled?: boolean;
};

// ============================================================================
// State Component Props
// ============================================================================

/**
 * Error state props
 * Props for displaying error messages with retry functionality
 */
export type ErrorStateProps = {
  error: APIErrorResponse;
  onRetry: (() => void) | null;
  onClose: () => void;
};

/**
 * Loading state props
 * Props for displaying loading indicators
 */
export type LoadingStateProps = {
  message?: string;
};

/**
 * Consent info message props
 * Props for displaying AI consent information
 */
export type ConsentInfoMessageProps = {
  onNavigateToSettings?: () => void;
};

// ============================================================================
// Trigger Button Props
// ============================================================================

/**
 * Trigger button props
 * Props for the button that opens the modal
 */
export type AddExpenseModalTriggerProps = {
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
};