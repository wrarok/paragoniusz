import { useState, useCallback, useEffect } from 'react';
import type {
  ProfileDTO,
  CategoryDTO,
  UploadReceiptResponseDTO,
  ProcessReceiptResponseDTO,
  CreateExpenseBatchCommand,
  BatchExpenseResponseDTO,
  APIErrorResponse,
} from '../../types';
import type {
  ScanFlowState,
  EditableExpense,
  FileValidationResult,
} from '../../types/scan-flow.types';

const PROCESSING_TIMEOUT_MS = 20000; // 20 seconds
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/heic'];
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/**
 * Custom hook for managing the scan expense flow state machine
 */
export function useScanExpenseFlow() {
  const [state, setState] = useState<ScanFlowState>({
    step: 'upload',
    uploadedFile: null,
    processedData: null,
    editedExpenses: [],
    error: null,
    isLoading: false,
    processingStartTime: null,
  });

  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [hasAIConsent, setHasAIConsent] = useState<boolean | null>(null);

  /**
   * Check if user has granted AI consent
   */
  const checkAIConsent = useCallback(async () => {
    try {
      const response = await fetch('/api/profiles/me');
      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }
      const profile: ProfileDTO = await response.json();
      setHasAIConsent(profile.ai_consent_given);
      
      if (!profile.ai_consent_given) {
        setState((prev) => ({ ...prev, step: 'consent' }));
      }
    } catch (error) {
      console.error('Error checking AI consent:', error);
      setState((prev) => ({
        ...prev,
        step: 'error',
        error: {
          error: {
            code: 'CONSENT_CHECK_FAILED',
            message: 'Failed to check AI consent status',
          },
        },
      }));
    }
  }, []);

  /**
   * Grant AI consent
   */
  const grantAIConsent = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    
    try {
      const response = await fetch('/api/profiles/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ai_consent_given: true }),
      });

      if (!response.ok) {
        throw new Error('Failed to grant consent');
      }

      const profile: ProfileDTO = await response.json();
      setHasAIConsent(profile.ai_consent_given);
      setState((prev) => ({
        ...prev,
        step: 'upload',
        isLoading: false,
      }));
    } catch (error) {
      console.error('Error granting AI consent:', error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        step: 'error',
        error: {
          error: {
            code: 'CONSENT_GRANT_FAILED',
            message: 'Failed to grant AI consent',
          },
        },
      }));
    }
  }, []);

  /**
   * Fetch available categories
   */
  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/categories');
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      const data = await response.json();
      setCategories(data.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, []);

  /**
   * Validate file before upload
   */
  const validateFile = useCallback((file: File): FileValidationResult => {
    if (!file) {
      return { isValid: false, error: 'No file selected' };
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return {
        isValid: false,
        error: 'Invalid file type. Please upload JPEG, PNG, or HEIC images only.',
      };
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return {
        isValid: false,
        error: `File size exceeds ${MAX_FILE_SIZE_MB}MB limit.`,
      };
    }

    if (file.size === 0) {
      return { isValid: false, error: 'File is empty' };
    }

    return { isValid: true };
  }, []);

  /**
   * Process receipt with AI (with 20s timeout)
   */
  const processReceipt = useCallback(async (filePath: string) => {
    setState((prev) => ({
      ...prev,
      step: 'processing',
      isLoading: true,
      processingStartTime: Date.now(),
    }));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PROCESSING_TIMEOUT_MS);

    try {
      const response = await fetch('/api/receipts/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_path: filePath }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData: APIErrorResponse = await response.json();
        throw errorData;
      }

      const processedData: ProcessReceiptResponseDTO = await response.json();
      
      // Convert processed expenses to editable format
      const editableExpenses: EditableExpense[] = processedData.expenses.map(
        (expense, index) => ({
          id: `expense-${index}`,
          category_id: expense.category_id,
          category_name: expense.category_name,
          amount: expense.amount,
          items: expense.items,
          isEdited: false,
        })
      );

      setState((prev) => ({
        ...prev,
        step: 'verification',
        processedData,
        editedExpenses: editableExpenses,
        isLoading: false,
        processingStartTime: null,
      }));
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        setState((prev) => ({
          ...prev,
          step: 'error',
          isLoading: false,
          processingStartTime: null,
          error: {
            error: {
              code: 'PROCESSING_TIMEOUT',
              message: 'AI processing took too long (20s timeout exceeded)',
            },
          },
        }));
      } else {
        console.error('Error processing receipt:', error);
        setState((prev) => ({
          ...prev,
          step: 'error',
          isLoading: false,
          processingStartTime: null,
          error: error as APIErrorResponse,
        }));
      }
    }
  }, []);

  /**
   * Upload file to server
   */
  const uploadFile = useCallback(async (file: File) => {
    const validation = validateFile(file);
    if (!validation.isValid) {
      setState((prev) => ({
        ...prev,
        step: 'error',
        error: {
          error: {
            code: 'VALIDATION_ERROR',
            message: validation.error || 'Invalid file',
          },
        },
      }));
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, step: 'upload' }));

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/receipts/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData: APIErrorResponse = await response.json();
        throw errorData;
      }

      const uploadResult: UploadReceiptResponseDTO = await response.json();
      setState((prev) => ({
        ...prev,
        uploadedFile: uploadResult,
        isLoading: false,
      }));

      // Automatically start processing after successful upload
      await processReceipt(uploadResult.file_path);
    } catch (error) {
      console.error('Error uploading file:', error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        step: 'error',
        error: error as APIErrorResponse,
      }));
    }
  }, [validateFile, processReceipt]);


  /**
   * Update an expense in the verification list
   */
  const updateExpense = useCallback(
    (id: string, updates: Partial<EditableExpense>) => {
      setState((prev) => ({
        ...prev,
        editedExpenses: prev.editedExpenses.map((expense) =>
          expense.id === id
            ? { ...expense, ...updates, isEdited: true }
            : expense
        ),
      }));
    },
    []
  );

  /**
   * Update the receipt date
   */
  const updateReceiptDate = useCallback((newDate: string) => {
    setState((prev) => ({
      ...prev,
      processedData: prev.processedData
        ? { ...prev.processedData, receipt_date: newDate }
        : null,
    }));
  }, []);

  /**
   * Remove an expense from the verification list
   */
  const removeExpense = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      editedExpenses: prev.editedExpenses.filter(
        (expense) => expense.id !== id
      ),
    }));
  }, []);

  /**
   * Save all expenses as a batch
   */
  const saveExpenses = useCallback(async () => {
    if (!state.processedData || state.editedExpenses.length === 0) {
      return;
    }

    setState((prev) => ({ ...prev, step: 'saving', isLoading: true }));

    try {
      const { editedExpenses, processedData } = state;
      
      const batchCommand: CreateExpenseBatchCommand = {
        expenses: editedExpenses.map((expense) => ({
          category_id: expense.category_id,
          amount: expense.amount,
          expense_date: processedData!.receipt_date,
          currency: processedData!.currency,
          created_by_ai: true,
          was_ai_suggestion_edited: expense.isEdited,
        })),
      };

      const response = await fetch('/api/expenses/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batchCommand),
      });

      if (!response.ok) {
        const errorData: APIErrorResponse = await response.json();
        throw errorData;
      }

      const result: BatchExpenseResponseDTO = await response.json();
      
      setState((prev) => ({
        ...prev,
        step: 'complete',
        isLoading: false,
      }));

      // Redirect to dashboard after successful save
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    } catch (error) {
      console.error('Error saving expenses:', error);
      setState((prev) => ({
        ...prev,
        step: 'error',
        isLoading: false,
        error: error as APIErrorResponse,
      }));
    }
  }, [state.editedExpenses, state.processedData]);

  /**
   * Reset flow to upload step
   */
  const resetFlow = useCallback(() => {
    setState({
      step: 'upload',
      uploadedFile: null,
      processedData: null,
      editedExpenses: [],
      error: null,
      isLoading: false,
      processingStartTime: null,
    });
  }, []);

  /**
   * Cancel flow and return to dashboard
   */
  const cancelFlow = useCallback(() => {
    window.location.href = '/';
  }, []);

  // Check AI consent on mount
  useEffect(() => {
    checkAIConsent();
    fetchCategories();
  }, [checkAIConsent, fetchCategories]);

  return {
    state,
    categories,
    hasAIConsent,
    grantAIConsent,
    uploadFile,
    updateExpense,
    updateReceiptDate,
    removeExpense,
    saveExpenses,
    resetFlow,
    cancelFlow,
  };
}