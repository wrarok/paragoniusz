import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface ErrorHeaderProps {
  icon: LucideIcon;
  title: string;
}

/**
 * Error display header component
 * Shows error icon and title with consistent styling
 */
export function ErrorHeader({ icon: Icon, title }: ErrorHeaderProps) {
  return (
    <CardHeader>
      <CardTitle className="flex items-center gap-2" data-testid="error-title">
        <Icon className="h-5 w-5" />
        {title}
      </CardTitle>
      <CardDescription>Wystąpił problem podczas przetwarzania Twojego paragonu</CardDescription>
    </CardHeader>
  );
}
