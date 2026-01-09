import { AlertCircle, Clock, FileX, ServerCrash, ShieldAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Configuration for error display components
 */
export interface ErrorConfig {
  icon: LucideIcon;
  title: string;
  description: string;
  actions: {
    retry?: boolean;
    manual?: boolean;
    cancel?: boolean;
  };
  variant: "default" | "destructive";
  tips?: string[];
}

/**
 * Centralized error message configurations
 *
 * Each error code maps to a specific UI configuration including:
 * - Icon to display
 * - Title and description
 * - Available actions (retry, manual entry, cancel)
 * - Alert variant (default or destructive)
 * - Optional tips for users
 */
export const ERROR_CONFIGS: Record<string, ErrorConfig> = {
  PROCESSING_TIMEOUT: {
    icon: Clock,
    title: "Przekroczono limit czasu przetwarzania",
    description:
      "Przetwarzanie AI trwało dłużej niż oczekiwano (20 sekund). Może się to zdarzyć w przypadku skomplikowanych paragonów lub słabej jakości obrazu. Możesz spróbować ponownie z wyraźniejszym obrazem lub dodać wydatki ręcznie.",
    actions: { retry: true, manual: true, cancel: true },
    variant: "default",
    tips: [
      "Zapewnij dobre oświetlenie podczas robienia zdjęć",
      "Trzymaj paragon płasko i w ostrości",
      "Unikaj cieni i odblasku",
      "Umieść cały paragon w kadrze",
    ],
  },

  EXTRACTION_FAILED: {
    icon: FileX,
    title: "Nie można odczytać paragonu",
    description:
      "AI nie mogło wyodrębnić informacji o wydatkach z tego paragonu. Może to być spowodowane słabą jakością obrazu, nietypowym formatem paragonu lub tekstem pisanym odręcznie. Spróbuj z wyraźniejszym obrazem lub dodaj wydatki ręcznie.",
    actions: { retry: true, manual: true, cancel: true },
    variant: "default",
  },

  VALIDATION_ERROR: {
    icon: AlertCircle,
    title: "Błąd walidacji danych",
    description: "Dane wydatków są nieprawidłowe. Sprawdź wprowadzone wartości i spróbuj ponownie.",
    actions: { retry: true, manual: true, cancel: true },
    variant: "destructive",
  },

  PAYLOAD_TOO_LARGE: {
    icon: AlertCircle,
    title: "Plik zbyt duży",
    description:
      "Przesłany plik przekracza limit 10MB. Skompresuj obraz lub zrób nowe zdjęcie w niższej rozdzielczości.",
    actions: { retry: true, manual: false, cancel: true },
    variant: "destructive",
  },

  AI_CONSENT_REQUIRED: {
    icon: ShieldAlert,
    title: "Wymagana zgoda na AI",
    description:
      "Musisz wyrazić zgodę na korzystanie z funkcji AI przed przesłaniem paragonów. Zaakceptuj monit o zgodę na AI, aby kontynuować.",
    actions: { retry: false, manual: true, cancel: true },
    variant: "default",
  },

  AI_SERVICE_ERROR: {
    icon: ServerCrash,
    title: "Błąd usługi AI",
    description:
      "Usługa AI jest tymczasowo niedostępna. To zwykle tymczasowy problem. Spróbuj ponownie za chwilę lub dodaj wydatki ręcznie.",
    actions: { retry: true, manual: true, cancel: true },
    variant: "destructive",
  },

  UNAUTHORIZED: {
    icon: ShieldAlert,
    title: "Sesja wygasła",
    description: "Twoja sesja wygasła. Zaloguj się ponownie, aby kontynuować.",
    actions: { retry: false, manual: false, cancel: true },
    variant: "destructive",
  },
};

/**
 * Default error configuration for unknown error codes
 */
export const DEFAULT_ERROR_CONFIG: ErrorConfig = {
  icon: AlertCircle,
  title: "Wystąpił błąd",
  description: "Wystąpił nieoczekiwany błąd. Spróbuj ponownie lub dodaj wydatki ręcznie.",
  actions: { retry: true, manual: true, cancel: true },
  variant: "destructive",
};

/**
 * Get error configuration for a given error code
 *
 * @param errorCode - Error code from API response
 * @param customMessage - Optional custom message to override default description
 * @returns ErrorConfig object
 */
export function getErrorConfig(errorCode: string, customMessage?: string): ErrorConfig {
  const config = ERROR_CONFIGS[errorCode] ?? DEFAULT_ERROR_CONFIG;

  // Override description with custom message if provided (for VALIDATION_ERROR)
  if (customMessage && errorCode === "VALIDATION_ERROR") {
    return {
      ...config,
      description: customMessage,
    };
  }

  return config;
}

/**
 * Check if error should show tips section
 *
 * @param errorCode - Error code from API response
 * @returns True if tips should be displayed
 */
export function shouldShowTips(errorCode: string): boolean {
  return ERROR_CONFIGS[errorCode]?.tips !== undefined;
}
