import { useState, useCallback, useEffect } from "react";
import { processReceipt as processReceiptAPI, saveExpensesBatch } from "@/lib/services/scan-flow.service";
import { useAIConsent } from "./useAIConsent";
import { useFileUpload } from "./useFileUpload";
import { scanFlowLogger } from "@/lib/utils/logger";
import { RouterService } from "@/lib/services/router.service";
import type { CategoryDTO, ProcessReceiptResponseDTO, CreateExpenseBatchCommand, APIErrorResponse } from "@/types";
import type { ExpenseVerificationFormValues } from "@/lib/validation/expense-verification.validation";
import type { ProcessingStep as ScanFlowStep } from "@/types/scan-flow.types";

/**
 * Hook do zarządzania flow skanowania wydatków z paragonów (Refactored)
 *
 * Orchestruje proces: zgoda AI -> upload -> przetwarzanie AI -> weryfikacja -> zapis
 * Wykorzystuje wyspecjalizowane hooki do poszczególnych kroków
 *
 * **Refactoring Summary:**
 * - Original: 214 LOC with 15+ console.log statements
 * - Refactored: ~170 LOC with proper logging and router abstraction
 * - Benefits: Better logging, easier testing, cleaner code
 */
export function useScanExpenseFlow() {
  // Delegacja do wyspecjalizowanych hooków
  const aiConsent = useAIConsent();
  const fileUpload = useFileUpload();

  // State flow
  const [step, setStep] = useState<ScanFlowStep>("upload");
  const [processedData, setProcessedData] = useState<ProcessReceiptResponseDTO | null>(null);
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<APIErrorResponse | null>(null);

  /**
   * Pobierz dostępne kategorie wydatków
   */
  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch("/api/categories");
      if (!response.ok) {
        throw new Error("Nie udało się pobrać kategorii");
      }
      const data = await response.json();
      setCategories(data.data);
      scanFlowLogger.debug("Categories fetched successfully", { count: data.data.length });
    } catch (err) {
      scanFlowLogger.error("Error fetching categories", err);
    }
  }, []);

  /**
   * Przetwórz paragon używając AI
   *
   * @param filePath - Ścieżka do uploadowanego pliku
   */
  const processReceipt = useCallback(async (filePath: string) => {
    scanFlowLogger.info("Starting AI processing", { filePath });
    setIsProcessing(true);
    setStep("processing");
    setError(null);

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
   * Upload pliku i automatycznie rozpocznij przetwarzanie
   *
   * @param file - Plik do uploadu
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
   * Zapisz zweryfikowane wydatki (dane z React Hook Form)
   *
   * @param formData - Dane formularza z React Hook Form
   */
  const saveExpenses = useCallback(async (formData: ExpenseVerificationFormValues) => {
    scanFlowLogger.info("Saving expenses", { expenseCount: formData.expenses.length });
    setIsSaving(true);
    setStep("saving");
    setError(null);

    try {
      // Konwersja danych z formularza do komendy API
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

      // Przekieruj do dashboardu po pomyślnym zapisie
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
   * Resetuj flow do początkowego stanu
   */
  const resetFlow = useCallback(() => {
    scanFlowLogger.debug("Resetting scan flow");
    setStep("upload");
    setProcessedData(null);
    setError(null);
    setIsProcessing(false);
    setIsSaving(false);
    fileUpload.reset();
  }, [fileUpload]);

  /**
   * Anuluj flow i wróć do dashboardu
   */
  const cancelFlow = useCallback(() => {
    scanFlowLogger.debug("Cancelling scan flow");
    RouterService.redirectToDashboard();
  }, []);

  /**
   * Inicjalizacja: sprawdź zgodę AI i pobierz kategorie
   */
  useEffect(() => {
    const init = async () => {
      const hasConsent = await aiConsent.checkConsent();

      if (!hasConsent) {
        setStep("consent");
      }

      await fetchCategories();
    };

    init();
  }, [aiConsent, fetchCategories]); // Dependencies for initialization

  // Agreguj błędy z różnych źródeł
  const aggregatedError = error || aiConsent.error || fileUpload.error;

  return {
    // State flow
    step,
    processedData,
    categories,
    isProcessing,
    isSaving,
    error: aggregatedError,

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
