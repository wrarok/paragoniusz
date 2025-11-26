/**
 * Login form field values
 */
export type LoginFormData = {
  email: string;           // User's email address
  password: string;        // User's password
  rememberMe: boolean;     // Session persistence preference
};

/**
 * Login form validation error messages
 */
export type LoginValidationErrors = {
  email?: string;      // Email field validation error
  password?: string;   // Password field validation error
  general?: string;    // General form/API error
};

/**
 * Login form component state
 */
export type LoginFormState = {
  formData: LoginFormData;              // Current form values
  errors: LoginValidationErrors;        // Current validation errors
  isSubmitting: boolean;                // Form submission state
  showPassword: boolean;                // Password visibility state
};

/**
 * Login form component props
 */
export type LoginFormProps = {
  redirectTo?: string;           // Redirect path after login (default: '/')
  onSuccess?: () => void;        // Success callback
};

/**
 * Email input component props
 */
export type EmailInputProps = {
  value: string;
  error?: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  disabled?: boolean;
};

/**
 * Password input component props
 */
export type PasswordInputProps = {
  value: string;
  error?: string;
  showPassword: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
  onToggleVisibility: () => void;
  disabled?: boolean;
};

/**
 * Remember me checkbox component props
 */
export type RememberMeCheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

/**
 * Form error message component props
 */
export type FormErrorMessageProps = {
  error?: string;
  className?: string;
};

/**
 * Submit button component props
 */
export type SubmitButtonProps = {
  isLoading: boolean;
  disabled: boolean;
  onClick?: () => void;
};

/**
 * Register link component props
 */
export type RegisterLinkProps = {
  className?: string;
};

/**
 * Register form field values
 */
export type RegisterFormData = {
  email: string;              // User's email address
  password: string;           // User's password
  confirmPassword: string;    // Password confirmation
};

/**
 * Register form validation error messages
 */
export type RegisterValidationErrors = {
  email?: string;           // Email field validation error
  password?: string;        // Password field validation error
  confirmPassword?: string; // Password confirmation validation error
  general?: string;         // General form/API error
};

/**
 * Register form component state
 */
export type RegisterFormState = {
  formData: RegisterFormData;           // Current form values
  errors: RegisterValidationErrors;     // Current validation errors
  isSubmitting: boolean;                // Form submission state
  showPassword: boolean;                // Password visibility state
  showConfirmPassword: boolean;         // Confirm password visibility state
};

/**
 * Register form component props
 */
export type RegisterFormProps = {
  redirectTo?: string;        // Redirect path after registration (default: '/')
  onSuccess?: () => void;     // Success callback
};

/**
 * Confirm password input component props
 */
export type ConfirmPasswordInputProps = {
  value: string;
  error?: string;
  showPassword: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
  onToggleVisibility: () => void;
  disabled?: boolean;
};

/**
 * Login link component props
 */
export type LoginLinkProps = {
  className?: string;
};