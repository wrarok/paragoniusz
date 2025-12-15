import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useDeleteAccount } from "../hooks/useDeleteAccount";
import { AlertTriangle } from "lucide-react";

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * DeleteAccountModal - Confirmation dialog for account deletion
 * Requires user to type "DELETE" to confirm the permanent action
 */
export function DeleteAccountModal({ isOpen, onClose }: DeleteAccountModalProps) {
  const { deleteAccount } = useDeleteAccount();
  const [confirmationText, setConfirmationText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConfirmationValid = confirmationText === "USUŃ";

  const handleConfirm = async () => {
    if (!isConfirmationValid) return;

    setIsDeleting(true);
    setError(null);

    const result = await deleteAccount();

    if (!result.success && result.error) {
      setIsDeleting(false);
      setError(result.error);
    }
    // On success, the hook redirects to /goodbye, so no need to handle here
  };

  const handleClose = () => {
    if (isDeleting) return; // Prevent closing while deleting
    setConfirmationText("");
    setError(null);
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="h-5 w-5" />
            Trwale usuń konto
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p className="text-base font-semibold">
              Ta operacja jest nieodwracalna. Spowoduje trwałe usunięcie Twojego konta i wszystkich danych z naszych
              serwerów.
            </p>
            <p>Wszystkie Twoje wydatki, kategorie i informacje profilowe zostaną trwale usunięte.</p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="confirmation">
              Wpisz <span className="font-mono font-bold">USUŃ</span>, aby potwierdzić
            </Label>
            <Input
              id="confirmation"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder="Wpisz USUŃ tutaj"
              disabled={isDeleting}
              className="font-mono"
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting} onClick={handleClose}>
            Anuluj
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={!isConfirmationValid || isDeleting}
            onClick={handleConfirm}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {isDeleting ? "Usuwanie..." : "Potwierdź usunięcie"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
