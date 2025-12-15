import { useLoginForm } from "../hooks/useLoginForm";
import { EmailInput } from "./EmailInput";
import { PasswordInput } from "./PasswordInput";
import { RememberMeCheckbox } from "./RememberMeCheckbox";
import { FormErrorMessage } from "./FormErrorMessage";
import { SubmitButton } from "./SubmitButton";
import { RegisterLink } from "./RegisterLink";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { LoginFormProps } from "../../types/auth.types";

/**
 * Main login form component
 * Orchestrates all child components and handles form submission
 */
export function LoginForm(props?: LoginFormProps) {
  const {
    formData,
    errors,
    isSubmitting,
    showPassword,
    handleInputChange,
    handleBlur,
    handleSubmit,
    togglePasswordVisibility,
  } = useLoginForm(props);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-3xl font-bold tracking-tight">Witaj ponownie</CardTitle>
        <CardDescription>Wprowadź swoje dane, aby zalogować się do konta</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* General error message */}
          <FormErrorMessage error={errors.general} />

          {/* Email field */}
          <EmailInput
            value={formData.email}
            error={errors.email}
            onChange={(value) => handleInputChange("email", value)}
            onBlur={() => handleBlur("email")}
            disabled={isSubmitting}
          />

          {/* Password field */}
          <PasswordInput
            value={formData.password}
            error={errors.password}
            showPassword={showPassword}
            onChange={(value) => handleInputChange("password", value)}
            onBlur={() => handleBlur("password")}
            onToggleVisibility={togglePasswordVisibility}
            disabled={isSubmitting}
          />

          {/* Remember me checkbox */}
          <RememberMeCheckbox
            checked={formData.rememberMe}
            onChange={(checked) => handleInputChange("rememberMe", checked)}
            disabled={isSubmitting}
          />

          {/* Submit button */}
          <SubmitButton isLoading={isSubmitting} disabled={isSubmitting} />

          {/* Register link */}
          <RegisterLink className="mt-4" />
        </form>
      </CardContent>
    </Card>
  );
}
