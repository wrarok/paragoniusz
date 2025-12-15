import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { DeleteAccountButton } from "./DeleteAccountButton";
import { DeleteAccountModal } from "./DeleteAccountModal";

/**
 * DangerZoneSection - Container for destructive account operations
 * Clearly marked section with warning styling for account deletion
 */
export function DangerZoneSection() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <Card className="border-red-200 dark:border-red-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <AlertTriangle className="h-5 w-5" />
          Strefa niebezpieczna
        </CardTitle>
        <CardDescription>Nieodwracalne i destrukcyjne działania</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive" className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Uwaga:</strong> Usunięcie konta jest trwałe i nie można go cofnąć. Wszystkie Twoje dane zostaną
            trwale usunięte z naszych serwerów.
          </AlertDescription>
        </Alert>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
          <div>
            <h4 className="font-medium text-sm">Usuń konto</h4>
            <p className="text-sm text-muted-foreground">Trwale usuń swoje konto i wszystkie powiązane dane</p>
          </div>
          <DeleteAccountButton onClick={() => setIsModalOpen(true)} />
        </div>

        <DeleteAccountModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </CardContent>
    </Card>
  );
}
