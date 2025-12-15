import { useScanExpenseFlow } from "../hooks/useScanExpenseFlow";
import { toVerificationFormValues } from "@/lib/transformers/verification-form.transformer";
import { stepRegistry, loadingStep as LoadingStep } from "./step-registry";

export function ScanExpenseContainer() {
  const {
    step,
    processedData,
    categories,
    hasAIConsent,
    isProcessing,
    isSaving,
    isUploading,
    error,
    grantAIConsent,
    uploadAndProcess,
    saveExpenses,
    resetFlow,
    cancelFlow,
  } = useScanExpenseFlow();

  // Show loading state while checking consent
  if (hasAIConsent === null) {
    return (
      <div className="container mx-auto px-4 py-8">
        <LoadingStep />
      </div>
    );
  }

  // Prepare props for each step
  const stepProps = {
    consent: {
      onAccept: grantAIConsent,
      onCancel: cancelFlow,
      isLoading: isProcessing || isSaving,
    },
    upload: {
      onUpload: uploadAndProcess,
      isUploading,
      error: error?.error.message || null,
    },
    processing: {
      startTime: Date.now(),
      onTimeout: () => {
        // Timeout is handled in the hook
      },
    },
    verification: processedData
      ? {
          defaultValues: toVerificationFormValues(processedData),
          categories,
          onSubmit: saveExpenses,
          onCancel: resetFlow,
        }
      : null,
    error: error
      ? {
          error,
          onRetry: resetFlow,
          onAddManually: () => {
            window.location.href = "/expenses/new";
          },
          onCancel: cancelFlow,
        }
      : null,
  };

  // Render the current step component
  const renderStep = () => {
    const StepComponent = stepRegistry[step] as React.ComponentType<Record<string, unknown>>;

    // Get props for steps that require them
    const props = stepProps[step as keyof typeof stepProps];

    // Steps that don't have props in the map (saving, complete) or have null props
    if (!props) {
      return <StepComponent />;
    }

    // Steps with props (consent, upload, processing, verification, error)
    return <StepComponent {...props} />;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Skanuj paragon</h1>
        <p className="text-muted-foreground">Prześlij zdjęcie paragonu i pozwól AI wyodrębnić Twoje wydatki</p>
      </div>

      {renderStep()}
    </div>
  );
}
