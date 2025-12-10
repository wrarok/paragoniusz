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
          <DialogTitle>Skanowanie paragonów z wykorzystaniem AI</DialogTitle>
          <DialogDescription>
            Włącz funkcje AI, aby automatycznie wyodrębnić dane o wydatkach ze zdjęć paragonów
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Włączając funkcje AI, wyrażasz zgodę na:
            </AlertDescription>
          </Alert>

          <ul className="space-y-2 text-sm text-muted-foreground ml-6 list-disc">
            <li>
              Twoje zdjęcia paragonów będą przetwarzane przez naszą usługę AI w celu wyodrębnienia informacji o wydatkach
            </li>
            <li>
              Dane z paragonu (kwoty, kategorie, daty) będą automatycznie wykrywane i sugerowane
            </li>
            <li>
              Możesz przejrzeć i edytować wszystkie sugestie AI przed zapisaniem
            </li>
            <li>
              Zdjęcia paragonów są przetwarzane bezpiecznie i nie są przechowywane na stałe
            </li>
          </ul>

          <div className="pt-2 text-sm text-muted-foreground">
            <p className="font-medium mb-2">Co dzieje się dalej:</p>
            <ol className="space-y-1 ml-6 list-decimal">
              <li>Prześlij zdjęcie paragonu (JPEG, PNG lub HEIC)</li>
              <li>AI przetwarza obraz (zwykle 5-15 sekund)</li>
              <li>Przejrzyj i edytuj wyodrębnione wydatki</li>
              <li>Zapisz wszystkie wydatki jednocześnie</li>
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
            Anuluj
          </Button>
          <Button
            onClick={onAccept}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {isLoading ? 'Włączanie...' : 'Włącz funkcje AI'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}