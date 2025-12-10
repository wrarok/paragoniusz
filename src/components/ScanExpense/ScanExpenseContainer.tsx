import { useScanExpenseFlow } from '../hooks/useScanExpenseFlow';
import { AIConsentModal } from './AIConsentModal';
import { FileUploadSection } from './FileUploadSection';
import { ProcessingStatusIndicator } from './ProcessingStatusIndicator';
import { ExpenseVerificationList } from './ExpenseVerificationList';
import { ErrorDisplay } from './ErrorDisplay';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';

export function ScanExpenseContainer() {
  const {
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
  } = useScanExpenseFlow();

  // Show loading state while checking consent
  if (hasAIConsent === null) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="w-full max-w-2xl mx-auto">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Ładowanie...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render based on current step
  const renderStep = () => {
    switch (state.step) {
      case 'consent':
        return (
          <AIConsentModal
            isOpen={true}
            onAccept={grantAIConsent}
            onCancel={cancelFlow}
            isLoading={state.isLoading}
          />
        );

      case 'upload':
        return (
          <FileUploadSection
            onUpload={uploadFile}
            isUploading={state.isLoading}
            error={state.error?.error.message || null}
          />
        );

      case 'processing':
        return (
          <ProcessingStatusIndicator
            step="processing"
            startTime={state.processingStartTime || Date.now()}
            onTimeout={() => {
              // Timeout is handled in the hook
            }}
          />
        );

      case 'verification':
        if (!state.processedData) {
          return null;
        }
        return (
          <ExpenseVerificationList
            expenses={state.editedExpenses}
            categories={categories}
            receiptDate={state.processedData.receipt_date}
            totalAmount={state.processedData.total_amount}
            currency={state.processedData.currency}
            onUpdateExpense={updateExpense}
            onUpdateReceiptDate={updateReceiptDate}
            onRemoveExpense={removeExpense}
            onSave={saveExpenses}
            onCancel={resetFlow}
            isSaving={state.isLoading}
          />
        );

      case 'saving':
        return (
          <Card className="w-full max-w-2xl mx-auto">
            <CardContent className="py-12 text-center space-y-4">
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
              </div>
              <div>
                <p className="text-lg font-medium">Zapisywanie wydatków...</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Tworzenie {state.editedExpenses.length} {state.editedExpenses.length === 1 ? 'wydatku' : state.editedExpenses.length < 5 ? 'wydatków' : 'wydatków'}
                </p>
              </div>
            </CardContent>
          </Card>
        );

      case 'complete':
        return (
          <Card className="w-full max-w-2xl mx-auto">
            <CardContent className="py-12 text-center space-y-4">
              <div className="flex justify-center">
                <CheckCircle2 className="h-16 w-16 text-green-500" />
              </div>
              <div>
                <p className="text-lg font-medium">Wydatki zostały zapisane pomyślnie!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Przekierowywanie do panelu głównego...
                </p>
              </div>
            </CardContent>
          </Card>
        );

      case 'error':
        if (!state.error) {
          return null;
        }
        return (
          <ErrorDisplay
            error={state.error}
            onRetry={resetFlow}
            onAddManually={() => {
              window.location.href = '/expenses/new';
            }}
            onCancel={cancelFlow}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Skanuj paragon</h1>
        <p className="text-muted-foreground">
          Prześlij zdjęcie paragonu i pozwól AI wyodrębnić Twoje wydatki
        </p>
      </div>

      {renderStep()}
    </div>
  );
}