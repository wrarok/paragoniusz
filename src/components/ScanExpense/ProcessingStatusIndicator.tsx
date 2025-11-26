import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Clock, AlertTriangle } from 'lucide-react';

type ProcessingStatusIndicatorProps = {
  step: 'upload' | 'processing';
  startTime: number;
  onTimeout: () => void;
};

const TIMEOUT_MS = 20000; // 20 seconds
const WARNING_THRESHOLD_MS = 15000; // Show warning at 15 seconds

export function ProcessingStatusIndicator({
  step,
  startTime,
  onTimeout,
}: ProcessingStatusIndicatorProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setElapsedTime(elapsed);

      if (elapsed >= WARNING_THRESHOLD_MS && !showWarning) {
        setShowWarning(true);
      }

      if (elapsed >= TIMEOUT_MS) {
        clearInterval(interval);
        onTimeout();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [startTime, onTimeout, showWarning]);

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const milliseconds = Math.floor((ms % 1000) / 100);
    return `${seconds}.${milliseconds}s`;
  };

  const getProgressPercentage = (): number => {
    return Math.min((elapsedTime / TIMEOUT_MS) * 100, 100);
  };

  const getStatusMessage = (): string => {
    if (step === 'upload') {
      return 'Uploading receipt...';
    }
    
    if (elapsedTime < 5000) {
      return 'Analyzing receipt image...';
    } else if (elapsedTime < 10000) {
      return 'Extracting expense data...';
    } else if (elapsedTime < 15000) {
      return 'Identifying categories...';
    } else {
      return 'Finalizing results...';
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Processing Receipt
        </CardTitle>
        <CardDescription>
          AI is analyzing your receipt to extract expense information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Message */}
        <div className="text-center space-y-2">
          <p className="text-lg font-medium">{getStatusMessage()}</p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{formatTime(elapsedTime)}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                showWarning ? 'bg-yellow-500' : 'bg-primary'
              }`}
              style={{ width: `${getProgressPercentage()}%` }}
              role="progressbar"
              aria-valuenow={getProgressPercentage()}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Processing progress"
            />
          </div>
          <p className="text-xs text-center text-muted-foreground">
            {Math.round(getProgressPercentage())}% complete
          </p>
        </div>

        {/* Warning Alert */}
        {showWarning && (
          <Alert variant="default" className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <AlertDescription className="text-yellow-800 dark:text-yellow-200">
              Processing is taking longer than usual. This may happen with complex
              receipts or poor image quality.
            </AlertDescription>
          </Alert>
        )}

        {/* Processing Steps */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Processing steps:</p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li className={elapsedTime >= 0 ? 'text-foreground' : ''}>
              ✓ Image uploaded successfully
            </li>
            <li className={elapsedTime >= 2000 ? 'text-foreground' : ''}>
              {elapsedTime >= 2000 ? '✓' : '○'} Analyzing receipt structure
            </li>
            <li className={elapsedTime >= 7000 ? 'text-foreground' : ''}>
              {elapsedTime >= 7000 ? '✓' : '○'} Extracting text and amounts
            </li>
            <li className={elapsedTime >= 12000 ? 'text-foreground' : ''}>
              {elapsedTime >= 12000 ? '✓' : '○'} Categorizing expenses
            </li>
            <li className={step === 'processing' && elapsedTime < TIMEOUT_MS ? '' : 'text-foreground'}>
              {step === 'processing' && elapsedTime < TIMEOUT_MS ? '○' : '✓'} Preparing results
            </li>
          </ul>
        </div>

        {/* Info */}
        <div className="text-xs text-muted-foreground text-center pt-2">
          <p>
            Processing typically takes 5-15 seconds. Maximum wait time is 20
            seconds.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}