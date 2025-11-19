# API Endpoint Implementation Plan: Upload Receipt Image

## 1. Endpoint Overview

This endpoint handles the upload of receipt images to temporary storage in Supabase Storage. It's the first step in the AI-powered receipt processing workflow, where users upload a photo of their receipt before it gets processed by AI to extract expense data.

**Key Characteristics:**
- Accepts multipart/form-data with image file
- Stores files temporarily in Supabase Storage
- Generates unique file identifiers to prevent collisions
- Validates file type and size before upload
- Returns file metadata for subsequent processing

## 2. Request Details

### HTTP Method
`POST`

### URL Structure
`/api/receipts/upload`

### Headers
- `Content-Type: multipart/form-data` (required)
- `Authorization: Bearer {access_token}` (required, but not enforced in MVP - will use hardcoded user ID)

### Request Body
Multipart form data containing:
- **file** (required): Image file in JPEG, PNG, or HEIC format

### Parameters

#### Required Parameters:
- `file`: Image file from form data
  - Accepted formats: JPEG (.jpg, .jpeg), PNG (.png), HEIC (.heic)
  - Maximum size: 10MB (10,485,760 bytes)
  - MIME types: `image/jpeg`, `image/png`, `image/heic`

#### Optional Parameters:
None

## 3. Used Types

### DTOs (from `src/types.ts`)

```typescript
/**
 * Upload Receipt Response DTO - response after uploading a receipt image
 * Used in: POST /api/receipts/upload
 */
export type UploadReceiptResponseDTO = {
  file_id: string;        // UUID of the uploaded file
  file_path: string;      // Full path in Supabase Storage
  uploaded_at: string;    // ISO 8601 timestamp
};

/**
 * API Error Response - standardized error response format
 */
export type APIErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
};
```

### Validation Schema (to be created in `src/lib/validation/receipt.validation.ts`)

```typescript
import { z } from 'zod';

// Allowed MIME types for receipt images
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/heic',
] as const;

// Allowed file extensions
export const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.heic'] as const;

// Maximum file size (10MB in bytes)
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// File validation schema
export const uploadReceiptSchema = z.object({
  file: z.custom<File>((val) => val instanceof File, {
    message: 'File is required',
  })
  .refine((file) => file.size > 0, {
    message: 'File cannot be empty',
  })
  .refine((file) => file.size <= MAX_FILE_SIZE, {
    message: `File size must not exceed ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
  })
  .refine(
    (file) => ALLOWED_MIME_TYPES.includes(file.type as any),
    {
      message: `File type must be one of: ${ALLOWED_MIME_TYPES.join(', ')}`,
    }
  ),
});

export type UploadReceiptInput = z.infer<typeof uploadReceiptSchema>;
```

## 4. Response Details

### Success Response (201 Created)

```json
{
  "file_id": "550e8400-e29b-41d4-a716-446655440000",
  "file_path": "receipts/a33573a0-3562-495e-b3c4-d898d0b54241/550e8400-e29b-41d4-a716-446655440000.jpg",
  "uploaded_at": "2024-01-15T10:30:00.000Z"
}
```

### Error Responses

#### 400 Bad Request - No File Provided
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "No file provided in request",
    "details": {
      "field": "file"
    }
  }
}
```

#### 400 Bad Request - Invalid File Type
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "File type must be one of: image/jpeg, image/png, image/heic",
    "details": {
      "field": "file",
      "provided_type": "application/pdf"
    }
  }
}
```

#### 413 Payload Too Large
```json
{
  "error": {
    "code": "PAYLOAD_TOO_LARGE",
    "message": "File size must not exceed 10MB",
    "details": {
      "max_size_mb": 10,
      "provided_size_mb": 15.5
    }
  }
}
```

#### 401 Unauthorized (when auth is implemented)
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired authentication token"
  }
}
```

#### 500 Internal Server Error
```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to upload file to storage",
    "details": {
      "reason": "Storage service unavailable"
    }
  }
}
```

## 5. Data Flow

```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │ 1. POST /api/receipts/upload
       │    multipart/form-data with file
       ▼
┌─────────────────────────────────────┐
│  Astro API Route                    │
│  src/pages/api/receipts/upload.ts   │
│                                     │
│  - Extract file from form data      │
│  - Validate file (type, size)       │
│  - Get user ID (hardcoded for MVP)  │
└──────┬──────────────────────────────┘
       │ 2. Call service method
       ▼
┌─────────────────────────────────────┐
│  Receipt Service                    │
│  src/lib/services/receipt.service.ts│
│                                     │
│  - Generate unique file ID (UUID)   │
│  - Determine file extension         │
│  - Build storage path               │
│  - Upload to Supabase Storage       │
└──────┬──────────────────────────────┘
       │ 3. Upload file
       ▼
┌─────────────────────────────────────┐
│  Supabase Storage                   │
│  Bucket: receipts                   │
│                                     │
│  Path: receipts/{user_id}/{uuid}.ext│
│  - Store file temporarily           │
│  - Return public URL                │
└──────┬──────────────────────────────┘
       │ 4. Return metadata
       ▼
┌─────────────────────────────────────┐
│  Receipt Service                    │
│  - Format response DTO              │
│  - Return file metadata             │
└──────┬──────────────────────────────┘
       │ 5. Return response
       ▼
┌─────────────────────────────────────┐
│  Astro API Route                    │
│  - Return 201 with JSON response    │
└──────┬──────────────────────────────┘
       │ 6. Response
       ▼
┌─────────────┐
│   Client    │
│  (Browser)  │
└─────────────┘
```

## 6. Security Considerations

### 1. File Type Validation
- **Threat**: Malicious file upload (executable, script, etc.)
- **Mitigation**: 
  - Validate MIME type against whitelist
  - Validate file extension against whitelist
  - Use double validation (both MIME type and extension)
  - Never trust client-provided MIME type alone

### 2. File Size Limits
- **Threat**: Denial of Service (DoS) through large file uploads
- **Mitigation**:
  - Enforce strict 10MB limit
  - Validate size before processing
  - Consider implementing rate limiting per user

### 3. Path Traversal Prevention
- **Threat**: Attacker manipulates filename to access/overwrite other files
- **Mitigation**:
  - Generate UUID-based filenames server-side
  - Never use client-provided filenames directly
  - Store files in user-specific directories

### 4. Storage Isolation
- **Threat**: Users accessing other users' files
- **Mitigation**:
  - Store files in user-specific paths: `receipts/{user_id}/`
  - Implement Supabase Storage RLS policies
  - Verify user ownership before file access

### 5. Temporary Storage Management
- **Threat**: Storage exhaustion from abandoned uploads
- **Mitigation**:
  - Mark files as temporary
  - Implement cleanup job for old files (>24 hours)
  - Delete files immediately after AI processing

### 6. Authentication & Authorization
- **Current State**: Using hardcoded user ID for MVP
- **Future Implementation**:
  - Validate JWT token from Authorization header
  - Extract user ID from validated token
  - Reject requests without valid authentication

### 7. Content Security
- **Threat**: Malicious image files (steganography, exploits)
- **Mitigation**:
  - Consider image re-encoding/sanitization
  - Scan files with antivirus if handling sensitive data
  - Implement Content Security Policy (CSP) headers

## 7. Error Handling

### Error Scenarios and Responses

| Scenario | Status Code | Error Code | Message | Details |
|----------|-------------|------------|---------|---------|
| No file in request | 400 | VALIDATION_ERROR | No file provided in request | field: "file" |
| Empty file | 400 | VALIDATION_ERROR | File cannot be empty | field: "file" |
| Invalid MIME type | 400 | VALIDATION_ERROR | File type must be one of: image/jpeg, image/png, image/heic | provided_type |
| File too large | 413 | PAYLOAD_TOO_LARGE | File size must not exceed 10MB | max_size_mb, provided_size_mb |
| Invalid auth token | 401 | UNAUTHORIZED | Invalid or expired authentication token | - |
| Storage upload fails | 500 | INTERNAL_ERROR | Failed to upload file to storage | reason |
| Unexpected error | 500 | INTERNAL_ERROR | An unexpected error occurred | - |

### Error Handling Strategy

1. **Input Validation Errors (400)**:
   - Validate early in the request pipeline
   - Return detailed validation messages
   - Include field names in error details

2. **File Size Errors (413)**:
   - Check size before processing
   - Return clear size limits in error
   - Log attempts to upload oversized files

3. **Authentication Errors (401)**:
   - Validate token before processing
   - Return generic message (don't leak auth details)
   - Log authentication failures

4. **Storage Errors (500)**:
   - Catch Supabase Storage exceptions
   - Log full error details server-side
   - Return generic message to client
   - Implement retry logic for transient failures

5. **Unexpected Errors (500)**:
   - Catch all unhandled exceptions
   - Log full stack trace
   - Return generic error message
   - Alert monitoring system

## 8. Performance Considerations

### Potential Bottlenecks

1. **File Upload I/O**:
   - Large files (up to 10MB) can take time to upload
   - Network latency affects upload speed
   - Multiple concurrent uploads can strain resources

2. **Memory Usage**:
   - Loading entire file into memory is inefficient
   - Multiple concurrent uploads multiply memory usage

3. **Storage Operations**:
   - Supabase Storage API calls have latency
   - Network issues can cause timeouts

### Optimization Strategies

1. **Streaming Upload**:
   - Use streaming to avoid loading entire file into memory
   - Process file in chunks if possible
   - Reduce memory footprint for large files

2. **Timeout Configuration**:
   - Set appropriate timeout for upload operations (30-60 seconds)
   - Handle timeout errors gracefully
   - Provide clear feedback to user

3. **Compression**:
   - Consider client-side image compression before upload
   - Reduce file size without significant quality loss
   - Faster uploads and lower storage costs

4. **Progress Tracking**:
   - Implement upload progress feedback for UX
   - Use chunked uploads for large files
   - Allow cancellation of in-progress uploads

5. **Caching**:
   - Cache Supabase client instance
   - Reuse connections where possible

6. **Rate Limiting**:
   - Implement per-user rate limits (e.g., 10 uploads per hour)
   - Prevent abuse and resource exhaustion
   - Return 429 Too Many Requests when limit exceeded

## 9. Implementation Steps

### Step 1: Create Validation Schema
**File**: `src/lib/validation/receipt.validation.ts`

```typescript
import { z } from 'zod';

export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/heic'] as const;
export const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.heic'] as const;
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const uploadReceiptSchema = z.object({
  file: z.custom<File>((val) => val instanceof File, {
    message: 'File is required',
  })
  .refine((file) => file.size > 0, {
    message: 'File cannot be empty',
  })
  .refine((file) => file.size <= MAX_FILE_SIZE, {
    message: `File size must not exceed ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
  })
  .refine(
    (file) => ALLOWED_MIME_TYPES.includes(file.type as any),
    {
      message: `File type must be one of: ${ALLOWED_MIME_TYPES.join(', ')}`,
    }
  ),
});

export type UploadReceiptInput = z.infer<typeof uploadReceiptSchema>;
```

### Step 2: Create Receipt Service
**File**: `src/lib/services/receipt.service.ts`

```typescript
import type { SupabaseClient } from '../db/supabase.client';
import type { UploadReceiptResponseDTO } from '../types';
import { ALLOWED_EXTENSIONS } from '../validation/receipt.validation';

export class ReceiptService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Uploads a receipt image to Supabase Storage
   * @param file - The image file to upload
   * @param userId - The ID of the user uploading the file
   * @returns Upload metadata including file_id, file_path, and uploaded_at
   */
  async uploadReceipt(file: File, userId: string): Promise<UploadReceiptResponseDTO> {
    // Generate unique file ID
    const fileId = crypto.randomUUID();
    
    // Determine file extension from MIME type
    const extension = this.getFileExtension(file.type);
    
    // Build storage path: receipts/{user_id}/{file_id}.ext
    const filePath = `receipts/${userId}/${fileId}${extension}`;
    
    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer();
    
    // Upload to Supabase Storage
    const { data, error } = await this.supabase.storage
      .from('receipts')
      .upload(filePath, arrayBuffer, {
        contentType: file.type,
        upsert: false, // Don't overwrite existing files
      });
    
    if (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }
    
    // Return response DTO
    return {
      file_id: fileId,
      file_path: data.path,
      uploaded_at: new Date().toISOString(),
    };
  }

  /**
   * Maps MIME type to file extension
   */
  private getFileExtension(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/heic': '.heic',
    };
    
    return mimeToExt[mimeType] || '.jpg';
  }
}
```

### Step 3: Create API Route Handler
**File**: `src/pages/api/receipts/upload.ts`

```typescript
import type { APIRoute } from 'astro';
import { uploadReceiptSchema, MAX_FILE_SIZE } from '../../../lib/validation/receipt.validation';
import { ReceiptService } from '../../../lib/services/receipt.service';
import type { APIErrorResponse, UploadReceiptResponseDTO } from '../../../types';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // TODO: Get user ID from authenticated session
    // For MVP, using hardcoded user ID
    const userId = 'a33573a0-3562-495e-b3c4-d898d0b54241';

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file');

    // Validate file presence
    if (!file || !(file instanceof File)) {
      const errorResponse: APIErrorResponse = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'No file provided in request',
          details: { field: 'file' },
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate file size early (before full validation)
    if (file.size > MAX_FILE_SIZE) {
      const errorResponse: APIErrorResponse = {
        error: {
          code: 'PAYLOAD_TOO_LARGE',
          message: `File size must not exceed ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
          details: {
            max_size_mb: MAX_FILE_SIZE / (1024 * 1024),
            provided_size_mb: Number((file.size / (1024 * 1024)).toFixed(2)),
          },
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 413,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate file with Zod schema
    const validation = uploadReceiptSchema.safeParse({ file });
    
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      const errorResponse: APIErrorResponse = {
        error: {
          code: 'VALIDATION_ERROR',
          message: firstError.message,
          details: {
            field: 'file',
            provided_type: file.type,
          },
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Upload file using service
    const receiptService = new ReceiptService(locals.supabase);
    const result: UploadReceiptResponseDTO = await receiptService.uploadReceipt(file, userId);

    // Return success response
    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error uploading receipt:', error);
    
    const errorResponse: APIErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to upload file to storage',
        details: {
          reason: error instanceof Error ? error.message : 'Unknown error',
        },
      },
    };
    
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
```

### Step 4: Configure Supabase Storage Bucket

**Manual Configuration in Supabase Dashboard**:

1. Navigate to Storage section in Supabase Dashboard
2. Create new bucket named `receipts`
3. Configure bucket settings:
   - **Public**: No (files should not be publicly accessible)
   - **File size limit**: 10MB
   - **Allowed MIME types**: image/jpeg, image/png, image/heic

4. Set up RLS policies for the bucket:

```sql
-- Policy: Users can upload to their own directory
CREATE POLICY "Users can upload receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can read their own files
CREATE POLICY "Users can read own receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own files
CREATE POLICY "Users can delete own receipts"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### Step 5: Add Environment Variables

**File**: `.env` (local development)

```env
# Supabase configuration (already exists)
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
```

No additional environment variables needed for this endpoint.

### Step 6: Create Tests

**File**: `.ai/test-upload-receipt-powershell.md`

```powershell
# Test 1: Successful upload
$imagePath = "path/to/test-image.jpg"
$boundary = [System.Guid]::NewGuid().ToString()
$fileBytes = [System.IO.File]::ReadAllBytes($imagePath)
$fileContent = [System.Text.Encoding]::GetEncoding("iso-8859-1").GetString($fileBytes)

$body = @"
--$boundary
Content-Disposition: form-data; name="file"; filename="receipt.jpg"
Content-Type: image/jpeg

$fileContent
--$boundary--
"@

Invoke-RestMethod -Uri "http://localhost:4321/api/receipts/upload" `
  -Method POST `
  -ContentType "multipart/form-data; boundary=$boundary" `
  -Body $body

# Test 2: No file provided
Invoke-RestMethod -Uri "http://localhost:4321/api/receipts/upload" `
  -Method POST `
  -ContentType "multipart/form-data"

# Test 3: Invalid file type (PDF)
# Similar to Test 1 but with PDF file

# Test 4: File too large (>10MB)
# Similar to Test 1 but with large file
```

### Step 7: Update API Documentation

Update `.ai/api-plan.md` to mark the endpoint as implemented:

```markdown
#### Upload Receipt Image ✅ IMPLEMENTED
- **HTTP Method**: POST
- **URL Path**: `/api/receipts/upload`
- **Implementation Status**:
  - ✅ Route handler: `src/pages/api/receipts/upload.ts`
  - ✅ Service: `ReceiptService.uploadReceipt()`
  - ✅ Validation: `uploadReceiptSchema`
  - ⚠️ Authentication: Not yet implemented
```

### Step 8: Manual Testing Checklist

- [ ] Test successful upload with valid JPEG image
- [ ] Test successful upload with valid PNG image
- [ ] Test successful upload with valid HEIC image
- [ ] Test error: No file provided
- [ ] Test error: Empty file
- [ ] Test error: Invalid file type (PDF, TXT, etc.)
- [ ] Test error: File too large (>10MB)
- [ ] Verify file is stored in correct path in Supabase Storage
- [ ] Verify file_id is valid UUID
- [ ] Verify uploaded_at is valid ISO 8601 timestamp
- [ ] Test concurrent uploads from same user
- [ ] Verify files are isolated per user (when auth is implemented)

## 10. Future Enhancements

1. **Authentication Integration**:
   - Replace hardcoded user ID with authenticated user from JWT
   - Implement proper authorization checks

2. **Rate Limiting**:
   - Implement per-user upload limits (e.g., 10 per hour)
   - Add rate limit headers to responses

3. **Progress Tracking**:
   - Implement chunked uploads for large files
   - Provide upload progress feedback

4. **Image Optimization**:
   - Compress images before storage
   - Generate thumbnails for preview

5. **Cleanup Job**:
   - Implement scheduled job to delete old temporary files
   - Remove files older than 24 hours

6. **Monitoring**:
   - Track upload success/failure rates
   - Monitor storage usage per user
   - Alert on unusual upload patterns

7. **Enhanced Validation**:
   - Validate image dimensions
   - Check for corrupted images
   - Implement virus scanning for production