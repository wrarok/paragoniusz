import type { ComponentType } from "react";
import type { ProcessingStep as FlowStep } from "@/types/scan-flow.types";
import type { CategoryDTO, APIErrorResponse } from "@/types";
import type { ExpenseVerificationFormValues } from "@/lib/validation/expense-verification.validation";
import {
  LoadingStep,
  ConsentStep,
  UploadStep,
  ProcessingStep as ProcessingStepComponent,
  VerificationStep,
  SavingStep,
  CompleteStep,
  ErrorStep,
} from "./steps";

/**
 * Props required by each step component
 */
interface StepProps {
  consent: {
    onAccept: () => Promise<void>;
    onCancel: () => void;
    isLoading: boolean;
  };
  upload: {
    onUpload: (file: File) => Promise<void>;
    isUploading: boolean;
    error: string | null;
  };
  processing: {
    startTime: number;
    onTimeout: () => void;
  };
  verification: {
    defaultValues: ExpenseVerificationFormValues;
    categories: CategoryDTO[];
    onSubmit: (data: ExpenseVerificationFormValues) => Promise<void>;
    onCancel: () => void;
  };
  error: {
    error: APIErrorResponse;
    onRetry: () => void;
    onAddManually: () => void;
    onCancel: () => void;
  };
}

/**
 * Step component registry - maps step names to their components
 */
type StepRegistry = {
  [K in FlowStep]: K extends keyof StepProps ? ComponentType<StepProps[K]> : ComponentType<Record<string, never>>;
};

/**
 * Type-safe step registry
 */
export const stepRegistry: StepRegistry = {
  consent: ConsentStep,
  upload: UploadStep,
  processing: ProcessingStepComponent,
  verification: VerificationStep,
  saving: SavingStep,
  complete: CompleteStep,
  error: ErrorStep,
} as const;

/**
 * Loading step is handled separately as it's shown before the flow starts
 */
export const loadingStep = LoadingStep;

/**
 * Type guard to check if a step requires props
 */
export function stepRequiresProps(step: FlowStep): step is keyof StepProps {
  return step in (["consent", "upload", "processing", "verification", "error"] as const);
}

/**
 * Get props type for a specific step
 */
export type StepPropsFor<T extends FlowStep> = T extends keyof StepProps ? StepProps[T] : Record<string, never>;
