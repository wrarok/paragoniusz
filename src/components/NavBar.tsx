import { useState } from 'react';
import { Home, Settings, LogOut, User } from 'lucide-react';
import { AddExpenseModalContainer } from './AddExpenseModal';
import { logoutUser } from '../lib/services/auth.service';

interface NavBarProps {
  userEmail?: string;
}

/**
 * NavBar Component
 * Main navigation bar with home, add expense modal trigger, settings, and logout
 */
export function NavBar({ userEmail }: NavBarProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    
    try {
      const result = await logoutUser();
      
      if (result.success) {
        // Redirect to login page
        window.location.href = '/login';
      } else {
        // Show error (for now, just log it)
        console.error('Logout failed:', result.error);
        setIsLoggingOut(false);
      }
    } catch (error) {
      console.error('Logout error:', error);
      setIsLoggingOut(false);
    }
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-around h-16">
          {/* User Info / Home Link */}
          <a
            href="/"
            className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Strona główna"
            title={userEmail || 'Strona główna'}
          >
            {userEmail ? (
              <>
                <User className="h-6 w-6" aria-hidden="true" />
                <span className="text-xs truncate max-w-[60px]">
                  {userEmail.split('@')[0]}
                </span>
              </>
            ) : (
              <>
                <Home className="h-6 w-6" aria-hidden="true" />
                <span className="text-xs">Start</span>
              </>
            )}
          </a>

          {/* Add Expense Modal Trigger */}
          <div className="flex flex-col items-center gap-1">
            <AddExpenseModalContainer />
            <span className="text-xs text-muted-foreground">Dodaj</span>
          </div>

          {/* Settings Link */}
          <a
            href="/settings"
            className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Ustawienia"
          >
            <Settings className="h-6 w-6" aria-hidden="true" />
            <span className="text-xs">Ustawienia</span>
          </a>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Wyloguj"
          >
            <LogOut className="h-6 w-6" aria-hidden="true" />
            <span className="text-xs">{isLoggingOut ? 'Wylogowywanie...' : 'Wyloguj'}</span>
          </button>
        </div>
      </div>
    </nav>
  );
}