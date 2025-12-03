import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

interface EmptyStateProps {
  message?: string;
  ctaText?: string;
  onCtaClick?: () => void;
}

export function EmptyState({
  message = "Nie dodałeś jeszcze żadnych wydatków",
  ctaText = 'Dodaj swój pierwszy wydatek',
  onCtaClick,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="rounded-full bg-muted p-6 mb-4">
        <PlusCircle className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Nie znaleziono wydatków</h3>
      <p className="text-muted-foreground mb-6 max-w-sm">{message}</p>
      {onCtaClick && (
        <Button onClick={onCtaClick} size="lg">
          <PlusCircle className="mr-2 h-5 w-5" aria-hidden="true" />
          {ctaText}
        </Button>
      )}
    </div>
  );
}