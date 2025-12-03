import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ConsentInfoMessageProps } from '../../types/modal.types';

/**
 * ConsentInfoMessage Component
 * Informational message displayed when AI consent has not been granted
 * Explains how to enable the AI scanning feature
 */
export function ConsentInfoMessage({ onNavigateToSettings }: ConsentInfoMessageProps) {
  return (
    <div 
      className="rounded-lg border border-muted bg-muted/50 p-4 space-y-3"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <Info className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" aria-hidden="true" />
        <div className="flex-1 space-y-2">
          <p className="text-sm text-muted-foreground">
            Skanowanie paragonów AI nie jest dostępne. Włącz je w ustawieniach, aby automatycznie wydobywać wydatki z paragonów.
          </p>
          {onNavigateToSettings && (
            <Button
              onClick={onNavigateToSettings}
              variant="link"
              className="h-auto p-0 text-sm font-normal"
            >
              Przejdź do ustawień
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}