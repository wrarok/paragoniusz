import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { APIContext } from 'astro';

import type { Database } from '../../../src/db/database.types';
import { POST } from '../../../src/pages/api/receipts/upload';
import { createAuthenticatedClient } from '../../helpers/test-auth';
import { TEST_USER } from '../../integration-setup';
import { MAX_FILE_SIZE } from '../../../src/lib/validation/receipt.validation';

/**
 * Integration Tests: Receipt Upload API
 *
 * Tests file upload logic and validation:
 * - Authentication requirements
 * - File validation (type, size, empty)
 * - Error handling
 *
 * NOTE: Actual file upload to Storage is tested in E2E tests (Playwright).
 * Integration tests focus on validation and business logic only.
 *
 * Tests: 6 total
 */

describe('API Integration: POST /api/receipts/upload', () => {
  let supabase: SupabaseClient<Database>;

  beforeAll(async () => {
    supabase = await createAuthenticatedClient();
  });


  // ============================================================================
  // Authentication
  // ============================================================================

  it('should reject request without authentication', async () => {
    const file = new File([Buffer.from('content')], 'receipt.jpg', {
      type: 'image/jpeg',
    });
    
    const formData = new FormData();
    formData.append('file', file);

    const request = new Request('http://localhost/api/receipts/upload', {
      method: 'POST',
      body: formData,
    });

    const context = {
      request,
      locals: {
        supabase,
        user: undefined, // Not authenticated
      },
    } as unknown as APIContext;

    const response = await POST(context);
    expect(response.status).toBe(401);
    
    const data = await response.json();
    expect(data.error.code).toBe('UNAUTHORIZED');
    expect(data.error.message).toContain('authenticated');
  });

  // ============================================================================
  // Validation Errors
  // ============================================================================

  it('should reject request with no file', async () => {
    const formData = new FormData();
    // No file appended

    const request = new Request('http://localhost/api/receipts/upload', {
      method: 'POST',
      body: formData,
    });

    const context = {
      request,
      locals: {
        supabase,
        user: { id: TEST_USER.id, email: TEST_USER.email },
      },
    } as unknown as APIContext;

    const response = await POST(context);
    expect(response.status).toBe(400);
    
    const data = await response.json();
    expect(data.error.code).toBe('VALIDATION_ERROR');
    expect(data.error.message).toContain('No file provided');
  });

  it('should reject file exceeding size limit (10MB)', async () => {
    // Create file larger than 10MB
    const largeBuffer = Buffer.alloc(MAX_FILE_SIZE + 1024); // 10MB + 1KB
    const file = new File([largeBuffer], 'large-receipt.jpg', {
      type: 'image/jpeg',
    });
    
    const formData = new FormData();
    formData.append('file', file);

    const request = new Request('http://localhost/api/receipts/upload', {
      method: 'POST',
      body: formData,
    });

    const context = {
      request,
      locals: {
        supabase,
        user: { id: TEST_USER.id, email: TEST_USER.email },
      },
    } as unknown as APIContext;

    const response = await POST(context);
    expect(response.status).toBe(413);
    
    const data = await response.json();
    expect(data.error.code).toBe('PAYLOAD_TOO_LARGE');
    expect(data.error.message).toContain('10MB');
    expect(data.error.details.max_size_mb).toBe(10);
  });

  it('should reject invalid file type (PDF)', async () => {
    const fileBuffer = Buffer.from('fake-pdf-content');
    const file = new File([fileBuffer], 'document.pdf', {
      type: 'application/pdf',
    });
    
    const formData = new FormData();
    formData.append('file', file);

    const request = new Request('http://localhost/api/receipts/upload', {
      method: 'POST',
      body: formData,
    });

    const context = {
      request,
      locals: {
        supabase,
        user: { id: TEST_USER.id, email: TEST_USER.email },
      },
    } as unknown as APIContext;

    const response = await POST(context);
    expect(response.status).toBe(400);
    
    const data = await response.json();
    expect(data.error.code).toBe('VALIDATION_ERROR');
    expect(data.error.message).toContain('JPEG, PNG, or HEIC');
  });

  it('should reject empty file', async () => {
    // Create empty file
    const file = new File([], 'empty.jpg', { type: 'image/jpeg' });
    
    const formData = new FormData();
    formData.append('file', file);

    const request = new Request('http://localhost/api/receipts/upload', {
      method: 'POST',
      body: formData,
    });

    const context = {
      request,
      locals: {
        supabase,
        user: { id: TEST_USER.id, email: TEST_USER.email },
      },
    } as unknown as APIContext;

    const response = await POST(context);
    expect(response.status).toBe(400);
    
    const data = await response.json();
    expect(data.error.code).toBe('VALIDATION_ERROR');
    expect(data.error.message).toContain('empty');
  });


  it('should handle storage errors gracefully', async () => {
    // Mock storage error by using invalid bucket name
    const file = new File([Buffer.from('content')], 'receipt.jpg', {
      type: 'image/jpeg',
    });
    
    const formData = new FormData();
    formData.append('file', file);

    const request = new Request('http://localhost/api/receipts/upload', {
      method: 'POST',
      body: formData,
    });

    // Mock a broken supabase client
    const brokenSupabase = {
      ...supabase,
      storage: {
        from: () => ({
          upload: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Storage quota exceeded' },
          }),
        }),
      },
    };

    const context = {
      request,
      locals: {
        supabase: brokenSupabase as any,
        user: { id: TEST_USER.id, email: TEST_USER.email },
      },
    } as unknown as APIContext;

    const response = await POST(context);
    expect(response.status).toBe(500);
    
    const data = await response.json();
    expect(data.error.code).toBe('INTERNAL_ERROR');
    expect(data.error.message).toContain('Failed to upload');
  });
});