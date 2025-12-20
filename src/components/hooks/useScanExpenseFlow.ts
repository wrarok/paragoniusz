import { useState, useCallback, useEffect } from "react";
import { processReceipt as processReceiptAPI, saveExpensesBatch } from "@/lib/services/scan-flow.service";
import { useAIConsent } from "./useAIConsent";
import { useFileUpload } from "./useFileUpload";
import type { CategoryDTO, ProcessReceiptResponseDTO, CreateExpenseBatchCommand, APIErrorResponse } from "@/types";
import type { ExpenseVerificationFormValues } from "@/lib/validation/expense-verification.validation";
import type { ProcessingStep as ScanFlowStep } from "@/types/scan-flow.types";

/**
 * Hook do zarządzania flow skanowania wydatków z paragonów
 *
 * Orchestruje proces: zgoda AI -> upload -> przetwarzanie AI -> weryfikacja -> zapis
 * Wykorzystuje wyspecjalizowane hooki do poszczególnych kroków
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
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  }, []);

  /**
   * Przetwórz paragon używając AI
   *
   * @param filePath - Ścieżka do uploadowanego pliku
   */
  const processReceipt = useCallback(async (filePath: string) => {
    console.log("🔄 Starting AI processing for file:", filePath);
    setIsProcessing(true);
    setStep("processing");
    setError(null);

    try {
      console.log("📡 Calling processReceiptAPI...");
      const result = await processReceiptAPI(filePath);
      console.log("✅ AI processing successful, result:", result);
      console.log("📊 Result data structure:", {
        hasExpenses: result?.expenses?.length > 0,
        expenseCount: result?.expenses?.length,
        receiptDate: result?.receipt_date,
        currency: result?.currency,
      });

      setProcessedData(result);
      console.log("💾 ProcessedData state updated");

      setStep("verification");
      console.log("🎯 Step set to verification, current step should be 'verification'");

      // Dodatkowe sprawdzenie stanu po ustawieniu
      setTimeout(() => {
        console.log("🔍 State check after 100ms - step should be 'verification'");
      }, 100);
    } catch (err) {
      const apiError = err as APIErrorResponse;
      console.error("❌ Error processing receipt:", apiError);
      setError(apiError);
      setStep("error");
      console.log("🚨 Step set to error due to processing failure");
    } finally {
      setIsProcessing(false);
      console.log("🏁 Processing finished, isProcessing set to false");
    }
  }, []);

  /**
   * Upload pliku i automatycznie rozpocznij przetwarzanie
   *
   * @param file - Plik do uploadu
   */
  const uploadAndProcess = useCallback(
    async (file: File) => {
      console.log("🔄 Starting upload and process for file:", file.name);
      const uploadResult = await fileUpload.validateAndUpload(file);

      if (uploadResult) {
        console.log("✅ Upload successful, starting AI processing:", uploadResult.file_path);
        await processReceipt(uploadResult.file_path);
      } else {
        console.error("❌ Upload failed, fileUpload.error:", fileUpload.error);
        // Błąd walidacji lub uploadu - ustaw step na error
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

      // Przekieruj do dashboardu po pomyślnym zapisie
      setTimeout(() => {
        window.location.assign("/");
      }, 1500);
    } catch (err) {
      const apiError = err as APIErrorResponse;
      setError(apiError);
      setStep("error");
      console.error("Error saving expenses:", apiError);
    } finally {
      setIsSaving(false);
    }
  }, []);

  /**
   * Resetuj flow do początkowego stanu
   */
  const resetFlow = useCallback(() => {
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
    window.location.assign("/");
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
  }, [aiConsent.checkConsent, fetchCategories]); // Używaj konkretnych funkcji, nie całych obiektów

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
