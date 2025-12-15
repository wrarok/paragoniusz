import { FileUploadSection } from "../FileUploadSection";

interface UploadStepProps {
  onUpload: (file: File) => Promise<void>;
  isUploading: boolean;
  error: string | null;
}

/**
 * Upload step - displays file upload section
 */
export function UploadStep({ onUpload, isUploading, error }: UploadStepProps) {
  return <FileUploadSection onUpload={onUpload} isUploading={isUploading} error={error} />;
}
