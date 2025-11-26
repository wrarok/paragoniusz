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
        <CardTitle>Account Information</CardTitle>
        <CardDescription>
          View your account details and metadata
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium text-muted-foreground">
            User ID
          </label>
          <p className="mt-1 text-sm font-mono bg-muted px-3 py-2 rounded-md break-all">
            {profile.id}
          </p>
        </div>
        
        <div>
          <label className="text-sm font-medium text-muted-foreground">
            Account Created
          </label>
          <p className="mt-1 text-sm">
            {formatDate(profile.created_at)}
          </p>
        </div>
        
        <div>
          <label className="text-sm font-medium text-muted-foreground">
            Last Updated
          </label>
          <p className="mt-1 text-sm">
            {formatDate(profile.updated_at)}
          </p>
        </div>
        
        <div>
          <label className="text-sm font-medium text-muted-foreground">
            AI Consent Status
          </label>
          <p className="mt-1 text-sm">
            {profile.ai_consent_given ? (
              <span className="text-green-600 dark:text-green-400">✓ Granted</span>
            ) : (
              <span className="text-muted-foreground">Not granted</span>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}