import type { RegisterLinkProps } from "../../types/auth.types";

/**
 * Link to registration page for new users
 */
export function RegisterLink({ className = "" }: RegisterLinkProps) {
  return (
    <div className={`text-center text-sm ${className}`}>
      <span className="text-gray-600">Nie masz konta? </span>
      <a
        href="/register"
        className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        Zarejestruj się
      </a>
    </div>
  );
}
