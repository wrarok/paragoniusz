import type {
  UploadReceiptResponseDTO,
  ProcessReceiptResponseDTO,
  APIErrorResponse,
} from '../types';

/**
 * Processing step in the scan expense flow state machine
 */
export type ProcessingStep =
  | 'consent'
  | 'upload'
  | 'processing'
  | 'verification'
  | 'saving'
  | 'complete'
  | 'error';

/**
 * Main state object for the scan expense flow
 */
export type ScanFlowState = {
  step: ProcessingStep;
  uploadedFile: UploadReceiptResponseDTO | null;
  processedData: ProcessReceiptResponseDTO | null;
  editedExpenses: EditableExpense[];
  error: APIErrorResponse | null;
  isLoading: boolean;
  processingStartTime: number | null;
};

/**
 * Editable expense item for verification step
 */
export type EditableExpense = {
  id: string;
  category_id: string;
  category_name: string;
  amount: string;
  items: string[];
  isEdited: boolean;
};

/**
 * File validation result
 */
export type FileValidationResult = {
  isValid: boolean;
  error?: string;
};