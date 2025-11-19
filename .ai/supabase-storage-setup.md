# Supabase Storage Setup for Receipt Uploads

This document provides step-by-step instructions for configuring the Supabase Storage bucket required for the receipt upload functionality.

## Step 1: Create Storage Bucket

1. Navigate to your Supabase project dashboard
2. Go to **Storage** section in the left sidebar
3. Click **"New bucket"** button
4. Configure the bucket:
   - **Name**: `receipts`
   - **Public bucket**: ❌ **No** (files should not be publicly accessible)
   - **File size limit**: `10485760` bytes (10MB)
   - **Allowed MIME types**:
     - `image/jpeg`
     - `image/png`
     - `image/heic`

5. Click **"Create bucket"**

## Step 2: Disable RLS (Temporary - For MVP Development)

**For MVP development, we'll temporarily disable RLS policies on the storage bucket. This will be implemented later together with the authentication system.**

### Disable RLS for the receipts bucket

1. In the Storage section, click on the `receipts` bucket
2. Click on **"Policies"** tab
3. If RLS is enabled, click **"Disable RLS"** or ensure no policies are active

**Note**: This is a temporary measure for development. In production, proper RLS policies must be implemented to ensure user data isolation.

## Step 3: Verify Configuration

After setting up the bucket, verify the configuration:

1. **Check bucket settings**:
   - Bucket name: `receipts`
   - Public: No
   - File size limit: 10MB
   - Allowed MIME types: image/jpeg, image/png, image/heic

2. **Check RLS status**:
   - RLS should be disabled for MVP development
   - Will be enabled later with authentication implementation

## Step 4: Test Access (Optional)

You can test the bucket configuration using the Supabase client:

```typescript
// Test upload (should succeed for authenticated user)
const { data, error } = await supabase.storage
  .from('receipts')
  .upload('receipts/user-id/test.jpg', file);

// Test access to another user's file (should fail)
const { data: otherData, error: otherError } = await supabase.storage
  .from('receipts')
  .download('receipts/other-user-id/test.jpg');
```

## Troubleshooting

### Issue: "new row violates row-level security policy"
**Solution**: Ensure RLS is disabled for the `receipts` bucket during MVP development

### Issue: "File size exceeds limit"
**Solution**: Check that the file is under 10MB and the bucket file size limit is set correctly

### Issue: "Invalid MIME type"
**Solution**: Verify the file MIME type is one of: `image/jpeg`, `image/png`, `image/heic`

### Issue: "Permission denied"
**Solution**: Ensure RLS is disabled for the `receipts` bucket during MVP development

## Security Notes

1. **Private Bucket**: The bucket is private by default, meaning files are not publicly accessible via URL
2. **Temporary Storage**: Files should be deleted after AI processing (handled by the process endpoint)
3. **File Size Limit**: 10MB limit prevents abuse and excessive storage usage
4. **MIME Type Restriction**: Only image files are allowed to prevent malicious uploads
5. **⚠️ RLS Disabled**: For MVP development, RLS is disabled. This means:
   - All authenticated users can access all files in the bucket
   - User isolation is not enforced at the storage level
   - **This must be addressed before production deployment**

## Future Implementation: RLS Policies

When implementing authentication, the following RLS policies should be added:

### Policy 1: Users can upload to their own directory
```sql
CREATE POLICY "Users can upload receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### Policy 2: Users can read their own files
```sql
CREATE POLICY "Users can read own receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### Policy 3: Users can delete their own files
```sql
CREATE POLICY "Users can delete own receipts"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

## Next Steps

After completing this setup:
1. Test the upload endpoint with a valid image file
2. Verify files are stored in the correct path: `receipts/{user_id}/{file_id}.ext`
3. Implement cleanup logic to delete old temporary files
4. **Before production**: Implement authentication and enable RLS policies