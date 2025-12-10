import { useCallback, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileImage, AlertCircle } from 'lucide-react';

type FileUploadSectionProps = {
  onUpload: (file: File) => Promise<void>;
  isUploading: boolean;
  error: string | null;
};

export function FileUploadSection({
  onUpload,
  isUploading,
  error,
}: FileUploadSectionProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((file: File | null) => {
    if (file) {
      setSelectedFile(file);
    }
  }, []);

  const handleFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] || null;
      handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setIsDragging(false);

      const file = event.dataTransfer.files?.[0] || null;
      handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleUploadClick = useCallback(async () => {
    if (selectedFile) {
      await onUpload(selectedFile);
    }
  }, [selectedFile, onUpload]);

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Prześlij paragon</CardTitle>
        <CardDescription>
          Prześlij zdjęcie paragonu, aby automatycznie wyodrębnić dane o wydatkach
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
            ${isUploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer hover:border-primary/50'}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleBrowseClick}
          role="button"
          tabIndex={0}
          aria-label="Prześlij zdjęcie paragonu"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleBrowseClick();
            }
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/heic"
            onChange={handleFileInputChange}
            className="hidden"
            disabled={isUploading}
            aria-label="Wybór pliku"
          />

          <div className="flex flex-col items-center gap-4">
            {selectedFile ? (
              <>
                <FileImage className="h-12 w-12 text-primary" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              </>
            ) : (
              <>
                <Upload className="h-12 w-12 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    Upuść paragon tutaj lub kliknij, aby przeglądać
                  </p>
                  <p className="text-xs text-muted-foreground">
                    JPEG, PNG lub HEIC do 10MB
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {selectedFile && (
          <div className="flex gap-2">
            <Button
              onClick={handleUploadClick}
              disabled={isUploading}
              className="flex-1"
            >
              {isUploading ? 'Przesyłanie...' : 'Prześlij i przetwórz'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedFile(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
              disabled={isUploading}
            >
              Wyczyść
            </Button>
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p className="font-medium">Obsługiwane formaty:</p>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            <li>JPEG (.jpg, .jpeg)</li>
            <li>PNG (.png)</li>
            <li>HEIC (.heic) - zdjęcia iPhone</li>
          </ul>
          <p className="pt-2">Maksymalny rozmiar pliku: 10MB</p>
        </div>
      </CardContent>
    </Card>
  );
}