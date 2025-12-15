import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface DeleteAccountButtonProps {
  onClick: () => void;
}

/**
 * DeleteAccountButton - Button that triggers account deletion modal
 * Styled as a destructive action with warning appearance
 */
export function DeleteAccountButton({ onClick }: DeleteAccountButtonProps) {
  return (
    <Button variant="destructive" onClick={onClick} className="w-full sm:w-auto">
      <Trash2 className="mr-2 h-4 w-4" />
      Usuń konto
    </Button>
  );
}
