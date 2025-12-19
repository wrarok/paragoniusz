import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Clock, FileX, ServerCrash, ShieldAlert, RefreshCw, PlusCircle, X } from "lucide-react";
import type { APIErrorResponse } from "../../types";

interface ErrorDisplayProps {
  error: APIErrorResponse;
  onRetry: () => void;
  onAddManually: () => void;
  onCancel: () => void;
}

interface ErrorConfig {
  icon: React.ReactNode;
  title: string;
  description: string;
  showRetry: boolean;
  showManual: boolean;
  variant: "default" | "destructive";
}

export function ErrorDisplay({ error, onRetry, onAddManually, onCancel }: ErrorDisplayProps) {
  const getErrorConfig = (errorCode: string): ErrorConfig => {
    switch (errorCode) {
      case "PROCESSING_TIMEOUT":
        return {
          icon: <Clock className="h-5 w-5" />,
          title: "Przekroczono limit czasu przetwarzania",
          description:
            "Przetwarzanie AI trwało dłużej niż oczekiwano (20 sekund). Może się to zdarzyć w przypadku skomplikowanych paragonów lub słabej jakości obrazu. Możesz spróbować ponownie z wyraźniejszym obrazem lub dodać wydatki ręcznie.",
          showRetry: true,
          showManual: true,
          variant: "default",
        };

      case "EXTRACTION_FAILED":
        return {
          icon: <FileX className="h-5 w-5" />,
          title: "Nie można odczytać paragonu",
          description:
            "AI nie mogło wyodrębnić informacji o wydatkach z tego paragonu. Może to być spowodowane słabą jakością obrazu, nietypowym formatem paragonu lub tekstem pisanym odręcznie. Spróbuj z wyraźniejszym obrazem lub dodaj wydatki ręcznie.",
          showRetry: true,
          showManual: true,
          variant: "default",
        };

      case "VALIDATION_ERROR":
        return {
          icon: <AlertCircle className="h-5 w-5" />,
          title: "Błąd walidacji danych",
          description:
            error.error.message || "Dane wydatków są nieprawidłowe. Sprawdź wprowadzone wartości i spróbuj ponownie.",
          showRetry: true,
          showManual: true,
          variant: "destructive",
        };

      case "PAYLOAD_TOO_LARGE":
        return {
          icon: <AlertCircle className="h-5 w-5" />,
          title: "Plik zbyt duży",
          description:
            "Przesłany plik przekracza limit 10MB. Skompresuj obraz lub zrób nowe zdjęcie w niższej rozdzielczości.",
          showRetry: true,
          showManual: false,
          variant: "destructive",
        };

      case "AI_CONSENT_REQUIRED":
        return {
          icon: <ShieldAlert className="h-5 w-5" />,
          title: "Wymagana zgoda na AI",
          description:
            "Musisz wyrazić zgodę na korzystanie z funkcji AI przed przesłaniem paragonów. Zaakceptuj monit o zgodę na AI, aby kontynuować.",
          showRetry: false,
          showManual: true,
          variant: "default",
        };

      case "AI_SERVICE_ERROR":
        return {
          icon: <ServerCrash className="h-5 w-5" />,
          title: "Błąd usługi AI",
          description:
            "Usługa AI jest tymczasowo niedostępna. To zwykle tymczasowy problem. Spróbuj ponownie za chwilę lub dodaj wydatki ręcznie.",
          showRetry: true,
          showManual: true,
          variant: "destructive",
        };

      case "UNAUTHORIZED":
        return {
          icon: <ShieldAlert className="h-5 w-5" />,
          title: "Sesja wygasła",
          description: "Twoja sesja wygasła. Zaloguj się ponownie, aby kontynuować.",
          showRetry: false,
          showManual: false,
          variant: "destructive",
        };

      default:
        return {
          icon: <AlertCircle className="h-5 w-5" />,
          title: "Wystąpił błąd",
          description:
            error.error.message || "Wystąpił nieoczekiwany błąd. Spróbuj ponownie lub dodaj wydatki ręcznie.",
          showRetry: true,
          showManual: true,
          variant: "destructive",
        };
    }
  };

  const config = getErrorConfig(error.error.code);

  const handleRetry = () => {
    onRetry();
  };

  const handleManual = () => {
    onAddManually();
  };

  const handleCancel = () => {
    onCancel();
  };

  return (
    <Card className="w-full max-w-2xl mx-auto" data-testid="error-display">
      <CardHeader>
        <CardTitle className="flex items-center gap-2" data-testid="error-title">
          {config.icon}
          {config.title}
        </CardTitle>
        <CardDescription>Wystąpił problem podczas przetwarzania Twojego paragonu</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant={config.variant}>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Szczegóły błędu</AlertTitle>
          <AlertDescription>{config.description}</AlertDescription>
        </Alert>

        {error.error.details && (
          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              Szczegóły techniczne
            </summary>
            <pre className="mt-2 p-3 bg-muted rounded-md overflow-x-auto text-xs">
              {JSON.stringify(error.error.details, null, 2)}
            </pre>
          </details>
        )}

        <div className="space-y-2 text-sm text-muted-foreground">
          <p className="font-medium">Co możesz zrobić:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            {config.showRetry && <li>Spróbuj przesłać paragon ponownie z wyraźniejszym obrazem</li>}
            {config.showManual && <li>Dodaj wydatki ręcznie bez pomocy AI</li>}
            <li>Wróć do panelu głównego i spróbuj ponownie później</li>
          </ul>
        </div>

        {error.error.code === "PROCESSING_TIMEOUT" && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium mb-1">Wskazówki dla lepszych rezultatów:</p>
              <ul className="list-disc list-inside space-y-0.5 text-sm">
                <li>Zapewnij dobre oświetlenie podczas robienia zdjęć</li>
                <li>Trzymaj paragon płasko i w ostrości</li>
                <li>Unikaj cieni i odblasku</li>
                <li>Umieść cały paragon w kadrze</li>
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row gap-3">
        <Button variant="outline" onClick={handleCancel} className="w-full sm:w-auto" data-testid="error-cancel-button">
          <X className="h-4 w-4 mr-2" />
          Anuluj
        </Button>
        {config.showManual && (
          <Button
            variant="outline"
            onClick={handleManual}
            className="w-full sm:flex-1"
            data-testid="error-manual-button"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Dodaj ręcznie
          </Button>
        )}
        {config.showRetry && (
          <Button onClick={handleRetry} className="w-full sm:flex-1" data-testid="error-retry-button">
            <RefreshCw className="h-4 w-4 mr-2" />
            Spróbuj ponownie
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
