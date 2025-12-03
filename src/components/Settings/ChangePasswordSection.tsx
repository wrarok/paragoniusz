import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChangePasswordForm } from './ChangePasswordForm';

/**
 * ChangePasswordSection - Container for password change functionality
 * Wraps the ChangePasswordForm with a card layout and section header
 */
export function ChangePasswordSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Zmień hasło</CardTitle>
        <CardDescription>
          Zaktualizuj swoje hasło, aby zabezpieczyć konto
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChangePasswordForm />
      </CardContent>
    </Card>
  );
}