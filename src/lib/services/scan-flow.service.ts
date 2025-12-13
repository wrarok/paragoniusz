import type {
  ProfileDTO,
  UploadReceiptResponseDTO,
  ProcessReceiptResponseDTO,
  CreateExpenseBatchCommand,
  BatchExpenseResponseDTO,
  APIErrorResponse,
} from '@/types';

/**
 * Timeout dla przetwarzania AI w milisekundach (20 sekund)
 */
const PROCESSING_TIMEOUT_MS = 20000;

/**
 * Serwis do obsługi API związanego z flow skanowania paragonów
 * 
 * Wszystkie metody wyrzucają APIErrorResponse w przypadku błędu
 */
export class ScanFlowAPIService {
  /**
   * Sprawdź czy użytkownik udzielił zgody na przetwarzanie AI
   * 
   * @returns Profil użytkownika z informacją o zgodzie AI
   * @throws {APIErrorResponse} W przypadku błędu API
   */
  static async checkAIConsent(): Promise<ProfileDTO> {
    const response = await fetch('/api/profiles/me');
    
    if (!response.ok) {
      const error: APIErrorResponse = await response.json();
      throw error;
    }
    
    return response.json();
  }

  /**
   * Udziel zgody na przetwarzanie AI
   * 
   * @returns Zaktualizowany profil użytkownika
   * @throws {APIErrorResponse} W przypadku błędu API
   */
  static async grantAIConsent(): Promise<ProfileDTO> {
    const response = await fetch('/api/profiles/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ai_consent_given: true }),
    });

    if (!response.ok) {
      const error: APIErrorResponse = await response.json();
      throw error;
    }
    
    return response.json();
  }

  /**
   * Upload pliku paragonu na serwer
   * 
   * @param file - Plik do uploadu (obraz paragonu)
   * @returns Informacje o uploadowanym pliku (ścieżka, rozmiar, etc.)
   * @throws {APIErrorResponse} W przypadku błędu API
   */
  static async uploadReceipt(file: File): Promise<UploadReceiptResponseDTO> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/receipts/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error: APIErrorResponse = await response.json();
      throw error;
    }
    
    return response.json();
  }

  /**
   * Przetwórz paragon używając AI (z timeoutem 20 sekund)
   * 
   * @param filePath - Ścieżka do pliku na serwerze (zwrócona z uploadReceipt)
   * @returns Przetworzone dane z paragonu (wydatki, data, waluta)
   * @throws {APIErrorResponse} W przypadku błędu API lub timeout
   */
  static async processReceipt(
    filePath: string
  ): Promise<ProcessReceiptResponseDTO> {
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
        const error: APIErrorResponse = await response.json();
        throw error;
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      // Obsługa timeout
      if (error instanceof Error && error.name === 'AbortError') {
        throw {
          error: {
            code: 'PROCESSING_TIMEOUT',
            message: 'Przetwarzanie AI trwało zbyt długo (przekroczono limit 20s)',
          },
        } as APIErrorResponse;
      }

      // Inne błędy
      throw error;
    }
  }

  /**
   * Zapisz wydatki wsadowo (batch)
   * 
   * @param command - Komenda z listą wydatków do zapisania
   * @returns Rezultat operacji z liczbą zapisanych wydatków
   * @throws {APIErrorResponse} W przypadku błędu API
   */
  static async saveExpensesBatch(
    command: CreateExpenseBatchCommand
  ): Promise<BatchExpenseResponseDTO> {
    const response = await fetch('/api/expenses/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(command),
    });

    if (!response.ok) {
      const error: APIErrorResponse = await response.json();
      throw error;
    }
    
    return response.json();
  }
}