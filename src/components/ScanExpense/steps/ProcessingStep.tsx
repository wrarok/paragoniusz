import { ProcessingStatusIndicator } from "../ProcessingStatusIndicator";

interface ProcessingStepProps {
  startTime: number;
  onTimeout: () => void;
}

/**
 * Processing step - displays AI processing indicator
 */
export function ProcessingStep({ startTime, onTimeout }: ProcessingStepProps) {
  return <ProcessingStatusIndicator step="processing" startTime={startTime} onTimeout={onTimeout} />;
}
