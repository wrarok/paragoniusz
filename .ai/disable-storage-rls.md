# Disable RLS for Supabase Storage (MVP Development)

The error "new row violates row-level security policy" means RLS is still enabled on the storage bucket. Here's how to disable it:

## Method 1: Via Supabase Dashboard (Recommended)

### Step 1: Navigate to Storage Policies

1. Go to your Supabase Dashboard
2. Click on **Storage** in the left sidebar
3. Click on the **`receipts`** bucket
4. Click on the **"Policies"** tab

### Step 2: Disable RLS

You have two options:

#### Option A: Disable RLS Entirely (Simplest for MVP)

1. Look for a toggle or button that says **"Enable RLS"** or **"RLS enabled"**
2. Click to **disable** it
3. Confirm the action

#### Option B: Create Permissive Policies (If RLS can't be disabled)

If the dashboard doesn't allow disabling RLS, create these permissive policies:

**Policy 1: Allow all inserts**

```sql
CREATE POLICY "Allow all inserts for MVP"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'receipts');
```

**Policy 2: Allow all selects**

```sql
CREATE POLICY "Allow all selects for MVP"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'receipts');
```

**Policy 3: Allow all deletes**

```sql
CREATE POLICY "Allow all deletes for MVP"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'receipts');
```

**Policy 4: Allow all updates**

```sql
CREATE POLICY "Allow all updates for MVP"
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'receipts');
```

## Method 2: Via SQL Editor

### Step 1: Open SQL Editor

1. Go to your Supabase Dashboard
2. Click on **SQL Editor** in the left sidebar
3. Click **"New query"**

### Step 2: Run This SQL

```sql
-- Disable RLS on storage.objects for the receipts bucket
-- This is temporary for MVP development

-- First, drop any existing policies for the receipts bucket
DROP POLICY IF EXISTS "Users can upload receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own receipts" ON storage.objects;

-- Create permissive policies that allow all operations
CREATE POLICY "Allow all operations for MVP"
ON storage.objects
FOR ALL
TO public
USING (bucket_id = 'receipts')
WITH CHECK (bucket_id = 'receipts');
```

### Step 3: Execute the Query

1. Click **"Run"** or press `Ctrl+Enter`
2. Verify the query executed successfully

## Verification

After disabling RLS or creating permissive policies, test the upload again:

```powershell
# Quick verification test
$testImagePath = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "test.png")

# Create minimal PNG
$pngBytes = @(
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
    0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
    0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
    0x42, 0x60, 0x82
)
[System.IO.File]::WriteAllBytes($testImagePath, $pngBytes)

$uri = "http://localhost:3000/api/receipts/upload"
$fileBytes = [System.IO.File]::ReadAllBytes($testImagePath)
$boundary = [System.Guid]::NewGuid().ToString()
$LF = "`r`n"

$bodyLines = (
    "--$boundary",
    "Content-Disposition: form-data; name=`"file`"; filename=`"test.png`"",
    "Content-Type: image/png$LF",
    [System.Text.Encoding]::GetEncoding("iso-8859-1").GetString($fileBytes),
    "--$boundary--$LF"
) -join $LF

try {
    $response = Invoke-RestMethod -Uri $uri `
        -Method POST `
        -ContentType "multipart/form-data; boundary=$boundary" `
        -Body $bodyLines

    Write-Host "✅ SUCCESS! RLS is properly configured" -ForegroundColor Green
    $response | ConvertTo-Json
} catch {
    Write-Host "❌ Still getting RLS error" -ForegroundColor Red
    Write-Host $_.Exception.Message
} finally {
    Remove-Item $testImagePath -Force
}
```

## Expected Result

After properly disabling RLS, you should see:

```
✅ SUCCESS! RLS is properly configured
{
  "file_id": "...",
  "file_path": "receipts/a33573a0-3562-495e-b3c4-d898d0b54241/...",
  "uploaded_at": "..."
}
```

## Troubleshooting

### Still Getting RLS Error?

1. **Check if policies exist:**

   ```sql
   SELECT * FROM pg_policies
   WHERE tablename = 'objects'
   AND schemaname = 'storage';
   ```

2. **Verify bucket configuration:**

   ```sql
   SELECT * FROM storage.buckets WHERE name = 'receipts';
   ```

3. **Check RLS status:**
   ```sql
   SELECT relname, relrowsecurity
   FROM pg_class
   WHERE relname = 'objects'
   AND relnamespace = 'storage'::regnamespace;
   ```

### Alternative: Use Service Role Key (Not Recommended for Production)

If you absolutely cannot disable RLS, you can temporarily use the service role key in your `.env`:

```env
# WARNING: Service role key bypasses RLS - only for development!
SUPABASE_KEY=your_service_role_key_here
```

**⚠️ IMPORTANT**: Never commit the service role key to version control!

## Remember

- This RLS configuration is **temporary for MVP development**
- Before production deployment, proper RLS policies must be implemented
- RLS policies will be added together with authentication implementation
