import type { LoginLinkProps } from "../../types/auth.types";

/**
 * Login link component
 * Provides navigation to the login page for existing users
 */
export function LoginLink({ className = "" }: LoginLinkProps) {
  return (
    <div className={`text-center text-sm ${className}`}>
      <span className="text-muted-foreground">Masz już konto? </span>
      <a
        href="/login"
        className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        Zaloguj się
      </a>
    </div>
  );
}
