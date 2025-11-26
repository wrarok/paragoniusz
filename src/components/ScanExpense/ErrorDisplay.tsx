import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  AlertCircle, 
  Clock, 
  FileX, 
  ServerCrash, 
  ShieldAlert,
  RefreshCw,
  PlusCircle,
  X
} from 'lucide-react';
import type { APIErrorResponse } from '../../types';

type ErrorDisplayProps = {
  error: APIErrorResponse;
  onRetry: () => void;
  onAddManually: () => void;
  onCancel: () => void;
};

type ErrorConfig = {
  icon: React.ReactNode;
  title: string;
  description: string;
  showRetry: boolean;
  showManual: boolean;
  variant: 'default' | 'destructive';
};

export function ErrorDisplay({
  error,
  onRetry,
  onAddManually,
  onCancel,
}: ErrorDisplayProps) {
  const getErrorConfig = (errorCode: string): ErrorConfig => {
    switch (errorCode) {
      case 'PROCESSING_TIMEOUT':
        return {
          icon: <Clock className="h-5 w-5" />,
          title: 'Processing Timeout',
          description:
            'AI processing took longer than expected (20 seconds). This can happen with complex receipts or poor image quality. You can try again with a clearer image or add expenses manually.',
          showRetry: true,
          showManual: true,
          variant: 'default',
        };

      case 'EXTRACTION_FAILED':
        return {
          icon: <FileX className="h-5 w-5" />,
          title: 'Cannot Read Receipt',
          description:
            'The AI could not extract expense information from this receipt. This may be due to poor image quality, unusual receipt format, or handwritten text. Please try with a clearer image or add expenses manually.',
          showRetry: true,
          showManual: true,
          variant: 'default',
        };

      case 'VALIDATION_ERROR':
        return {
          icon: <AlertCircle className="h-5 w-5" />,
          title: 'Invalid File',
          description:
            error.error.message || 'The uploaded file is invalid. Please ensure you upload a JPEG, PNG, or HEIC image under 10MB.',
          showRetry: true,
          showManual: false,
          variant: 'destructive',
        };

      case 'PAYLOAD_TOO_LARGE':
        return {
          icon: <AlertCircle className="h-5 w-5" />,
          title: 'File Too Large',
          description:
            'The uploaded file exceeds the 10MB size limit. Please compress the image or take a new photo with lower resolution.',
          showRetry: true,
          showManual: false,
          variant: 'destructive',
        };

      case 'AI_CONSENT_REQUIRED':
        return {
          icon: <ShieldAlert className="h-5 w-5" />,
          title: 'AI Consent Required',
          description:
            'You need to grant consent to use AI features before uploading receipts. Please accept the AI consent prompt to continue.',
          showRetry: false,
          showManual: true,
          variant: 'default',
        };

      case 'AI_SERVICE_ERROR':
        return {
          icon: <ServerCrash className="h-5 w-5" />,
          title: 'AI Service Error',
          description:
            'The AI service is temporarily unavailable. This is usually a temporary issue. Please try again in a few moments or add expenses manually.',
          showRetry: true,
          showManual: true,
          variant: 'destructive',
        };

      case 'UNAUTHORIZED':
        return {
          icon: <ShieldAlert className="h-5 w-5" />,
          title: 'Session Expired',
          description:
            'Your session has expired. Please log in again to continue.',
          showRetry: false,
          showManual: false,
          variant: 'destructive',
        };

      default:
        return {
          icon: <AlertCircle className="h-5 w-5" />,
          title: 'An Error Occurred',
          description:
            error.error.message || 'An unexpected error occurred. Please try again or add expenses manually.',
          showRetry: true,
          showManual: true,
          variant: 'destructive',
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
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {config.icon}
          {config.title}
        </CardTitle>
        <CardDescription>
          Something went wrong while processing your receipt
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant={config.variant}>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Details</AlertTitle>
          <AlertDescription>{config.description}</AlertDescription>
        </Alert>

        {error.error.details && (
          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              Technical Details
            </summary>
            <pre className="mt-2 p-3 bg-muted rounded-md overflow-x-auto text-xs">
              {JSON.stringify(error.error.details, null, 2)}
            </pre>
          </details>
        )}

        <div className="space-y-2 text-sm text-muted-foreground">
          <p className="font-medium">What you can do:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            {config.showRetry && (
              <li>Try uploading the receipt again with a clearer image</li>
            )}
            {config.showManual && (
              <li>Add expenses manually without AI assistance</li>
            )}
            <li>Return to the dashboard and try again later</li>
          </ul>
        </div>

        {error.error.code === 'PROCESSING_TIMEOUT' && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium mb-1">Tips for better results:</p>
              <ul className="list-disc list-inside space-y-0.5 text-sm">
                <li>Ensure good lighting when taking photos</li>
                <li>Keep the receipt flat and in focus</li>
                <li>Avoid shadows and glare</li>
                <li>Capture the entire receipt in the frame</li>
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row gap-3">
        <Button
          variant="outline"
          onClick={handleCancel}
          className="w-full sm:w-auto"
        >
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        {config.showManual && (
          <Button
            variant="outline"
            onClick={handleManual}
            className="w-full sm:flex-1"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Manually
          </Button>
        )}
        {config.showRetry && (
          <Button
            onClick={handleRetry}
            className="w-full sm:flex-1"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}