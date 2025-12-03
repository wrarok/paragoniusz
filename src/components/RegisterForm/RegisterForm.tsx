import { useRegisterForm } from '../hooks/useRegisterForm';
import { EmailInput } from '../LoginForm/EmailInput';
import { PasswordInput } from '../LoginForm/PasswordInput';
import { ConfirmPasswordInput } from './ConfirmPasswordInput';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';
import { FormErrorMessage } from '../LoginForm/FormErrorMessage';
import { SubmitButton } from './SubmitButton';
import { LoginLink } from './LoginLink';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { RegisterFormProps } from '../../types/auth.types';

/**
 * Main registration form component
 * Orchestrates all child components and handles form submission
 */
export function RegisterForm(props?: RegisterFormProps) {
  const {
    formData,
    errors,
    isSubmitting,
    showPassword,
    showConfirmPassword,
    passwordStrength,
    handleInputChange,
    handleBlur,
    handleSubmit,
    togglePasswordVisibility,
    toggleConfirmPasswordVisibility
  } = useRegisterForm(props);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-3xl font-bold tracking-tight">Utwórz konto</CardTitle>
        <CardDescription>Wprowadź swoje dane, aby rozpocząć</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* General error message */}
          <FormErrorMessage error={errors.general} />

          {/* Email field */}
          <EmailInput
            value={formData.email}
            error={errors.email}
            onChange={(value) => handleInputChange('email', value)}
            onBlur={() => handleBlur('email')}
            disabled={isSubmitting}
          />

          {/* Password field */}
          <PasswordInput
            value={formData.password}
            error={errors.password}
            showPassword={showPassword}
            onChange={(value) => handleInputChange('password', value)}
            onBlur={() => handleBlur('password')}
            onToggleVisibility={togglePasswordVisibility}
            disabled={isSubmitting}
          />

          {/* Password strength indicator */}
          <PasswordStrengthIndicator
            strength={passwordStrength}
            password={formData.password}
          />

          {/* Confirm password field */}
          <ConfirmPasswordInput
            value={formData.confirmPassword}
            error={errors.confirmPassword}
            showPassword={showConfirmPassword}
            onChange={(value) => handleInputChange('confirmPassword', value)}
            onBlur={() => handleBlur('confirmPassword')}
            onToggleVisibility={toggleConfirmPasswordVisibility}
            disabled={isSubmitting}
          />

          {/* Submit button */}
          <SubmitButton
            isLoading={isSubmitting}
            disabled={isSubmitting}
          />

          {/* Login link */}
          <LoginLink className="mt-4" />
        </form>
      </CardContent>
    </Card>
  );
}