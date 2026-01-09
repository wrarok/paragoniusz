import { useState, useCallback, useEffect, useRef } from "react";
import { processReceipt as processReceiptAPI, saveExpensesBatch } from "@/lib/services/scan-flow.service";
import { useAIConsent } from "./useAIConsent";
import { useFileUpload } from "./useFileUpload";
import { scanFlowLogger } from "@/lib/utils/logger";
import { RouterService } from "@/lib/services/router.service";
import type { CategoryDTO, ProcessReceiptResponseDTO, CreateExpenseBatchCommand, APIErrorResponse } from "@/types";
import type { ExpenseVerificationFormValues } from "@/lib/validation/expense-verification.validation";
import type { ProcessingStep as ScanFlowStep } from "@/types/scan-flow.types";

/**
 * Hook for managing receipt expense scanning flow
 *
 * Orchestrates: AI consent -> upload -> AI processing -> verification -> save
 * Uses specialized hooks for each step
 *
 * **Refactoring Summary:**
 * - Original: 214 LOC with 15+ console.log statements
 * - Refactored: ~170 LOC with proper logging and router abstraction
 * - Benefits: Better logging, easier testing, cleaner code
 */
export function useScanExpenseFlow() {
  // Delegate to specialized hooks
  const aiConsent = useAIConsent();
  const fileUpload = useFileUpload();

  // Initialization tracking
  const initialized = useRef(false);

  // State flow
  const [step, setStep] = useState<ScanFlowStep>("upload");
  const [processedData, setProcessedData] = useState<ProcessReceiptResponseDTO | null>(null);
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<APIErrorResponse | null>(null);
  const [processingStartTime, setProcessingStartTime] = useState<number | null>(null);

  /**
   * Fetch available expense categories
   */
  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch("/api/categories");
      if (!response.ok) {
        throw new Error("Failed to fetch categories");
      }
      const data = await response.json();
      setCategories(data.data);
      scanFlowLogger.debug("Categories fetched successfully", { count: data.data.length });
    } catch (err) {
      scanFlowLogger.error("Error fetching categories", err);
    }
  }, []);

  /**
   * Process receipt using AI
   *
   * @param filePath - Path to uploaded file
   */
  const processReceipt = useCallback(async (filePath: string) => {
    scanFlowLogger.info("Starting AI processing", { filePath });
    setIsProcessing(true);
    setStep("processing");
    setError(null);
    setProcessingStartTime(Date.now());

    try {
      const result = await processReceiptAPI(filePath);

      scanFlowLogger.info("AI processing successful", {
        hasExpenses: result?.expenses?.length > 0,
        expenseCount: result?.expenses?.length,
        receiptDate: result?.receipt_date,
        currency: result?.currency,
      });

      setProcessedData(result);
      setStep("verification");
    } catch (err) {
      const apiError = err as APIErrorResponse;
      scanFlowLogger.error("Error processing receipt", apiError);
      setError(apiError);
      setStep("error");
    } finally {
      setIsProcessing(false);
    }
  }, []);

  /**
   * Upload file and automatically start processing
   *
   * @param file - File to upload
   */
  const uploadAndProcess = useCallback(
    async (file: File) => {
      scanFlowLogger.info("Starting upload and process", { fileName: file.name, fileSize: file.size });
      const uploadResult = await fileUpload.validateAndUpload(file);

      if (uploadResult) {
        scanFlowLogger.info("Upload successful, starting AI processing", { filePath: uploadResult.file_path });
        await processReceipt(uploadResult.file_path);
      } else {
        scanFlowLogger.error("Upload failed", fileUpload.error);
        setError(fileUpload.error);
        setStep("error");
      }
    },
    [fileUpload, processReceipt]
  );

  /**
   * Save verified expenses
   *
   * @param formData - Form data from React Hook Form
   */
  const saveExpenses = useCallback(async (formData: ExpenseVerificationFormValues) => {
    scanFlowLogger.info("Saving expenses", { expenseCount: formData.expenses.length });
    setIsSaving(true);
    setStep("saving");
    setError(null);

    try {
      // Convert form data to API command
      const command: CreateExpenseBatchCommand = {
        expenses: formData.expenses.map((expense) => ({
          category_id: expense.category_id,
          amount: expense.amount.toFixed(2),
          expense_date: formData.receipt_date,
          currency: formData.currency,
          created_by_ai: true,
          was_ai_suggestion_edited: expense.isEdited,
        })),
      };

      await saveExpensesBatch(command);
      setStep("complete");
      scanFlowLogger.info("Expenses saved successfully");

      // Redirect to dashboard after save
      RouterService.redirectToDashboard(1500);
    } catch (err) {
      const apiError = err as APIErrorResponse;
      scanFlowLogger.error("Error saving expenses", apiError);
      setError(apiError);
      setStep("error");
    } finally {
      setIsSaving(false);
    }
  }, []);

  /**
   * Reset flow to initial state
   */
  const resetFlow = useCallback(() => {
    scanFlowLogger.debug("Resetting scan flow");
    setStep("upload");
    setProcessedData(null);
    setError(null);
    setIsProcessing(false);
    setIsSaving(false);
    setProcessingStartTime(null);
    fileUpload.reset();
  }, [fileUpload]);

  /**
   * Cancel flow and return to dashboard
   */
  const cancelFlow = useCallback(() => {
    scanFlowLogger.debug("Cancelling scan flow");
    RouterService.redirectToDashboard();
  }, []);

  /**
   * Initialize: check AI consent and fetch categories
   */
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const init = async () => {
      const hasConsent = await aiConsent.checkConsent();

      if (!hasConsent) {
        setStep("consent");
      }

      await fetchCategories();
    };

    init();
  }, [aiConsent, fetchCategories]);

  // Aggregate errors from different sources
  const aggregatedError = error || aiConsent.error || fileUpload.error;

  return {
    // State flow
    step,
    processedData,
    categories,
    isProcessing,
    isSaving,
    error: aggregatedError,
    processingStartTime,

    // AI Consent
    hasAIConsent: aiConsent.hasConsent,
    grantAIConsent: aiConsent.grantConsent,

    // File Upload
    uploadedFile: fileUpload.uploadedFile,
    isUploading: fileUpload.isUploading,

    // Actions
    uploadAndProcess,
    saveExpenses,
    resetFlow,
    cancelFlow,
  };
}
