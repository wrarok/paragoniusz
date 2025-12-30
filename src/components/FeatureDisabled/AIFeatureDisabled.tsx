/**
 * AIFeatureDisabled Component
 *
 * Fallback UI component displayed when AI features are disabled
 * Provides clear messaging and alternative actions for users
 */

import { AlertCircle, Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AIFeatureDisabledProps {
  /** Title for the disabled feature */
  title?: string;
  /** Description of what the feature would do */
  description?: string;
  /** Alternative action button text */
  alternativeActionText?: string;
  /** Alternative action button click handler */
  onAlternativeAction?: () => void;
  /** Whether to show as a card or inline alert */
  variant?: "card" | "alert";
  /** Custom message to display */
  customMessage?: string;
}

/**
 * Default fallback component for disabled AI features
 */
export function AIFeatureDisabled({
  title = "AI Feature Unavailable",
  description = "This AI-powered feature is currently disabled.",
  alternativeActionText = "Add Manually",
  onAlternativeAction,
  variant = "card",
  customMessage,
}: AIFeatureDisabledProps) {
  const message = customMessage || "AI receipt processing is currently disabled. You can still add expenses manually.";

  if (variant === "alert") {
    return (
      <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <AlertDescription className="text-amber-800 dark:text-amber-200">
          {message}
          {onAlternativeAction && (
            <Button onClick={onAlternativeAction} variant="outline" size="sm" className="ml-2 h-6 text-xs">
              <Plus className="h-3 w-3 mr-1" />
              {alternativeActionText}
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <CardTitle className="text-amber-900 dark:text-amber-100">{title}</CardTitle>
        </div>
        <CardDescription className="text-amber-700 dark:text-amber-300">{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-amber-800 dark:text-amber-200 mb-4">{message}</p>
        {onAlternativeAction && (
          <Button
            onClick={onAlternativeAction}
            variant="outline"
            className="w-full border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900"
          >
            <Plus className="h-4 w-4 mr-2" />
            {alternativeActionText}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Specific fallback for AI receipt scanning
 */
export function AIScanningDisabled({ onManualAdd }: { onManualAdd?: () => void }) {
  return (
    <AIFeatureDisabled
      title="AI Receipt Scanning Unavailable"
      description="Automatic receipt processing is currently disabled"
      alternativeActionText="Add Expense Manually"
      onAlternativeAction={onManualAdd}
      customMessage="AI receipt scanning is temporarily disabled. You can still add your expenses manually using the form below."
    />
  );
}

/**
 * Specific fallback for AI consent section
 */
export function AIConsentDisabled() {
  return (
    <AIFeatureDisabled
      title="AI Features Disabled"
      description="AI-powered features are not available in this environment"
      variant="alert"
      customMessage="AI features are currently disabled. Contact your administrator for more information."
    />
  );
}

/**
 * Inline message for disabled AI buttons
 */
export function AIButtonDisabled({ className }: { className?: string }) {
  return <div className={`text-xs text-muted-foreground italic ${className}`}>AI features disabled</div>;
}
