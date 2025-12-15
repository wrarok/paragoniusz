import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import type { ProfileDTO } from "../../types";

interface AIConsentSectionProps {
  profile: ProfileDTO;
  onConsentUpdated: () => void;
}

/**
 * AIConsentSection - Allows users to manage their AI consent preference
 */
export function AIConsentSection({ profile, onConsentUpdated }: AIConsentSectionProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleToggleConsent = async () => {
    setIsUpdating(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/profiles/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ai_consent_given: !profile.ai_consent_given,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Nie udało się zaktualizować zgody");
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onConsentUpdated();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wystąpił nieoczekiwany błąd");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Zgoda na przetwarzanie AI</CardTitle>
        <CardDescription>
          Zarządzaj zgodą na wykorzystanie sztucznej inteligencji do przetwarzania paragonów
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">Status zgody</p>
            <p className="text-sm text-muted-foreground">
              {profile.ai_consent_given ? (
                <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  Zgoda udzielona - możesz korzystać z funkcji AI
                </span>
              ) : (
                <span className="text-muted-foreground">Zgoda nie udzielona - funkcje AI są wyłączone</span>
              )}
            </p>
          </div>
          <Button
            onClick={handleToggleConsent}
            disabled={isUpdating}
            variant={profile.ai_consent_given ? "destructive" : "default"}
          >
            {isUpdating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Aktualizacja...
              </>
            ) : profile.ai_consent_given ? (
              "Wycofaj zgodę"
            ) : (
              "Udziel zgody"
            )}
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-600 text-green-600 dark:border-green-400 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>Zgoda została pomyślnie zaktualizowana</AlertDescription>
          </Alert>
        )}

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            Funkcje AI pozwalają na automatyczne rozpoznawanie wydatków z paragonów. Możesz wycofać zgodę w dowolnym
            momencie.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
