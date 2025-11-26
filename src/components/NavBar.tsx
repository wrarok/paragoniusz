import { Home, Settings } from 'lucide-react';
import { AddExpenseModalContainer } from './AddExpenseModal';

/**
 * NavBar Component
 * Main navigation bar with home, add expense modal trigger, and settings links
 */
export function NavBar() {
  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-around h-16">
          {/* Home Link */}
          <a
            href="/"
            className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Home"
          >
            <Home className="h-6 w-6" aria-hidden="true" />
            <span className="text-xs">Home</span>
          </a>

          {/* Add Expense Modal Trigger */}
          <div className="flex flex-col items-center gap-1">
            <AddExpenseModalContainer />
            <span className="text-xs text-muted-foreground">Add</span>
          </div>

          {/* Settings Link */}
          <a
            href="/settings"
            className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Settings"
          >
            <Settings className="h-6 w-6" aria-hidden="true" />
            <span className="text-xs">Settings</span>
          </a>
        </div>
      </div>
    </nav>
  );
}