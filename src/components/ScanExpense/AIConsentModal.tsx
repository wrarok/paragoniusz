import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

type AIConsentModalProps = {
  isOpen: boolean;
  onAccept: () => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
};

export function AIConsentModal({
  isOpen,
  onAccept,
  onCancel,
  isLoading,
}: AIConsentModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>AI-Powered Receipt Scanning</DialogTitle>
          <DialogDescription>
            Enable AI features to automatically extract expense data from receipt
            images
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              By enabling AI features, you consent to:
            </AlertDescription>
          </Alert>

          <ul className="space-y-2 text-sm text-muted-foreground ml-6 list-disc">
            <li>
              Your receipt images will be processed by our AI service to extract
              expense information
            </li>
            <li>
              Receipt data (amounts, categories, dates) will be automatically
              detected and suggested
            </li>
            <li>
              You can review and edit all AI suggestions before saving
            </li>
            <li>
              Receipt images are processed securely and not stored permanently
            </li>
          </ul>

          <div className="pt-2 text-sm text-muted-foreground">
            <p className="font-medium mb-2">What happens next:</p>
            <ol className="space-y-1 ml-6 list-decimal">
              <li>Upload a receipt image (JPEG, PNG, or HEIC)</li>
              <li>AI processes the image (typically 5-15 seconds)</li>
              <li>Review and edit the extracted expenses</li>
              <li>Save all expenses in one batch</li>
            </ol>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={onAccept}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {isLoading ? 'Enabling...' : 'Enable AI Features'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}