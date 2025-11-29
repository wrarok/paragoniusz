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
            <p className="text-muted-foreground">Loading...</p>
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
                <p className="text-lg font-medium">Saving Expenses...</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Creating {state.editedExpenses.length} expense
                  {state.editedExpenses.length !== 1 ? 's' : ''}
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
                <p className="text-lg font-medium">Expenses Saved Successfully!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Redirecting to dashboard...
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
        <h1 className="text-3xl font-bold mb-2">Scan Receipt</h1>
        <p className="text-muted-foreground">
          Upload a receipt image and let AI extract your expenses
        </p>
      </div>

      {renderStep()}
    </div>
  );
}