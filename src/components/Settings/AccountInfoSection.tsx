import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ProfileDTO } from '../../types';

interface AccountInfoSectionProps {
  profile: ProfileDTO;
}

/**
 * AccountInfoSection - Displays read-only account information
 * Shows user ID and account creation date
 */
export function AccountInfoSection({ profile }: AccountInfoSectionProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informacje o koncie</CardTitle>
        <CardDescription>
          Zobacz szczegóły i metadane swojego konta
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium text-muted-foreground">
            ID użytkownika
          </label>
          <p className="mt-1 text-sm font-mono bg-muted px-3 py-2 rounded-md break-all">
            {profile.id}
          </p>
        </div>
        
        <div>
          <label className="text-sm font-medium text-muted-foreground">
            Data utworzenia konta
          </label>
          <p className="mt-1 text-sm">
            {formatDate(profile.created_at)}
          </p>
        </div>
        
        <div>
          <label className="text-sm font-medium text-muted-foreground">
            Ostatnia aktualizacja
          </label>
          <p className="mt-1 text-sm">
            {formatDate(profile.updated_at)}
          </p>
        </div>
        
        <div>
          <label className="text-sm font-medium text-muted-foreground">
            Status zgody na AI
          </label>
          <p className="mt-1 text-sm">
            {profile.ai_consent_given ? (
              <span className="text-green-600 dark:text-green-400">✓ Udzielona</span>
            ) : (
              <span className="text-muted-foreground">Nie udzielona</span>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}