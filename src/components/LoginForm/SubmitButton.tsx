import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { SubmitButtonProps } from "../../types/auth.types";

/**
 * Submit button component with loading state
 */
export function SubmitButton({ isLoading, disabled, onClick }: SubmitButtonProps) {
  return (
    <Button type="submit" className="w-full" disabled={disabled || isLoading} onClick={onClick}>
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Logowanie...
        </>
      ) : (
        "Zaloguj się"
      )}
    </Button>
  );
}
