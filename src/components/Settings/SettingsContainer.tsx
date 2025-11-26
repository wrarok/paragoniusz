import { useProfile } from '../hooks/useProfile';
import { SettingsTabs } from './SettingsTabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

/**
 * SettingsContainer - Main container for the settings view
 * Handles profile data loading and displays appropriate states
 */
export function SettingsContainer() {
  const { profile, isLoading, error, refetch } = useProfile();

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !profile) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Profile</AlertTitle>
        <AlertDescription className="mt-2 space-y-4">
          <p>{error || 'Unable to load your profile. Please try again.'}</p>
          <Button onClick={refetch} variant="outline" size="sm">
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Success state - render tabs
  return <SettingsTabs profile={profile} />;
}