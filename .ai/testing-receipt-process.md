# Testing Guide: Receipt Processing Endpoint

## Prerequisites

Before testing, ensure:
1. Supabase is running locally or you have access to a dev instance
2. Database migrations are applied
3. You have the existing test user profile with AI consent enabled

## Existing Test Data

✅ **User Profile** (already exists):
- User ID: `a33573a0-3562-495e-b3c4-d898d0b54241`
- AI Consent: `true`

✅ **Categories** (already exist):
- groceries (`a3ffc564-e1cb-4726-8119-db670d94bc61`)
- transport (`98b70605-a314-470b-8ecb-b2b5c7e6d3d3`)
- dining (`2f1a0d96-fc12-4586-9679-f27971e9e27a`)
- entertainment (`27db23d8-e66d-4cb5-beaa-1be8e2992175`)
- healthcare (`cfd44936-0efb-4007-bde5-b3b81d2ac302`)
- And more...

## Setup Test Receipt File

You need to upload a test image to Supabase Storage:

### Option A: Using Supabase Dashboard
1. Go to Storage in Supabase Dashboard
2. Navigate to `receipts` bucket (create if not exists)
3. Create folder: `a33573a0-3562-495e-b3c4-d898d0b54241`
4. Upload any image file (jpg, png, webp)
5. Rename it to: `550e8400-e29b-41d4-a716-446655440000.jpg`

### Option B: Using Upload Endpoint (PowerShell)
```powershell
# First upload a receipt using the upload endpoint
$response = Invoke-WebRequest -Uri "http://localhost:3000/api/receipts/upload" `
  -Method POST `
  -Form @{ file = Get-Item "C:\path\to\receipt.jpg" }

# Note the file_path from the response and use it in the process endpoint
$response.Content | ConvertFrom-Json
```

## Test Scenarios

### Test 1: Successful Receipt Processing ✅

**PowerShell:**
```powershell
$body = @{
    file_path = "receipts/a33573a0-3562-495e-b3c4-d898d0b54241/550e8400-e29b-41d4-a716-446655440000.jpg"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/api/receipts/process" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body | Select-Object -ExpandProperty Content | ConvertFrom-Json
```

**curl (alternative):**
```bash
curl -X POST http://localhost:3000/api/receipts/process \
  -H "Content-Type: application/json" \
  -d '{
    "file_path": "receipts/a33573a0-3562-495e-b3c4-d898d0b54241/550e8400-e29b-41d4-a716-446655440000.jpg"
  }'
```

**Expected Response (200 OK):**
```json
{
  "expenses": [
    {
      "category_id": "a3ffc564-e1cb-4726-8119-db670d94bc61",
      "category_name": "groceries",
      "amount": "35.50",
      "items": [
        "Milk 2L - 5.50",
        "Bread - 4.00",
        "Eggs 10pcs - 12.00",
        "Cheese 200g - 14.00"
      ]
    },
    {
      "category_id": "98b70605-a314-470b-8ecb-b2b5c7e6d3d3",
      "category_name": "transport",
      "amount": "15.20",
      "items": [
        "Dish soap - 8.50",
        "Paper towels - 6.70"
      ]
    }
  ],
  "total_amount": "50.70",
  "currency": "PLN",
  "receipt_date": "2024-11-15",
  "processing_time_ms": 1500
}
```

**Verification:**
- Check that the file was deleted from storage after processing
- Verify processing_time_ms is between 1000-2000ms
- Verify category IDs match existing categories in database

---

### Test 2: Invalid File Path Format ❌

**PowerShell:**
```powershell
$body = @{
    file_path = "invalid/path/format.jpg"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/api/receipts/process" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

**curl:**
```bash
curl -X POST http://localhost:3000/api/receipts/process \
  -H "Content-Type: application/json" \
  -d '{"file_path": "invalid/path/format.jpg"}'
```

**Expected Response (400 Bad Request):**
```json
{
  "error": {
    "code": "INVALID_FILE_PATH",
    "message": "Invalid file path format. Expected: receipts/{user_id}/{uuid}.{ext}",
    "details": {
      "file_path": "invalid/path/format.jpg"
    }
  }
}
```

---

### Test 3: Missing File Path ❌

**PowerShell:**
```powershell
$body = @{} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/api/receipts/process" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

**curl:**
```bash
curl -X POST http://localhost:3000/api/receipts/process \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected Response (400 Bad Request):**
```json
{
  "error": {
    "code": "INVALID_FILE_PATH",
    "message": "File path is required",
    "details": {
      "file_path": null
    }
  }
}
```

---

### Test 4: Invalid JSON Body ❌

**PowerShell:**
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/receipts/process" `
  -Method POST `
  -ContentType "application/json" `
  -Body "invalid json"
```

**curl:**
```bash
curl -X POST http://localhost:3000/api/receipts/process \
  -H "Content-Type: application/json" \
  -d 'invalid json'
```

**Expected Response (400 Bad Request):**
```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Invalid JSON in request body"
  }
}
```

---

### Test 5: File Not Found ❌

**PowerShell:**
```powershell
$body = @{
    file_path = "receipts/a33573a0-3562-495e-b3c4-d898d0b54241/00000000-0000-0000-0000-000000000000.jpg"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/api/receipts/process" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

**curl:**
```bash
curl -X POST http://localhost:3000/api/receipts/process \
  -H "Content-Type: application/json" \
  -d '{
    "file_path": "receipts/a33573a0-3562-495e-b3c4-d898d0b54241/00000000-0000-0000-0000-000000000000.jpg"
  }'
```

**Expected Response (400 Bad Request):**
```json
{
  "error": {
    "code": "FILE_NOT_FOUND",
    "message": "Receipt file not found in storage",
    "details": {
      "file_path": "receipts/a33573a0-3562-495e-b3c4-d898d0b54241/00000000-0000-0000-0000-000000000000.jpg"
    }
  }
}
```

---

### Test 6: AI Consent Not Given ❌

First, disable AI consent:

```sql
UPDATE profiles 
SET ai_consent_given = false 
WHERE id = 'a33573a0-3562-495e-b3c4-d898d0b54241';
```

**PowerShell:**
```powershell
$body = @{
    file_path = "receipts/a33573a0-3562-495e-b3c4-d898d0b54241/550e8400-e29b-41d4-a716-446655440000.jpg"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/api/receipts/process" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

**curl:**
```bash
curl -X POST http://localhost:3000/api/receipts/process \
  -H "Content-Type: application/json" \
  -d '{
    "file_path": "receipts/a33573a0-3562-495e-b3c4-d898d0b54241/550e8400-e29b-41d4-a716-446655440000.jpg"
  }'
```

**Expected Response (403 Forbidden):**
```json
{
  "error": {
    "code": "AI_CONSENT_REQUIRED",
    "message": "AI processing consent has not been given. Please enable AI features in settings."
  }
}
```

**Cleanup:**
```sql
UPDATE profiles 
SET ai_consent_given = true 
WHERE id = 'a33573a0-3562-495e-b3c4-d898d0b54241';
```

---

### Test 7: File Ownership Violation ❌

**PowerShell:**
```powershell
$body = @{
    file_path = "receipts/different-user-id-12345678/550e8400-e29b-41d4-a716-446655440000.jpg"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/api/receipts/process" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

**curl:**
```bash
curl -X POST http://localhost:3000/api/receipts/process \
  -H "Content-Type: application/json" \
  -d '{
    "file_path": "receipts/different-user-id-12345678/550e8400-e29b-41d4-a716-446655440000.jpg"
  }'
```

**Expected Response (403 Forbidden):**
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to process this file"
  }
}
```

---

### Test 8: Invalid File Extension ❌

**PowerShell:**
```powershell
$body = @{
    file_path = "receipts/a33573a0-3562-495e-b3c4-d898d0b54241/550e8400-e29b-41d4-a716-446655440000.pdf"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/api/receipts/process" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

**curl:**
```bash
curl -X POST http://localhost:3000/api/receipts/process \
  -H "Content-Type: application/json" \
  -d '{
    "file_path": "receipts/a33573a0-3562-495e-b3c4-d898d0b54241/550e8400-e29b-41d4-a716-446655440000.pdf"
  }'
```

**Expected Response (400 Bad Request):**
```json
{
  "error": {
    "code": "INVALID_FILE_PATH",
    "message": "Invalid file path format. Expected: receipts/{user_id}/{uuid}.{ext}",
    "details": {
      "file_path": "receipts/a33573a0-3562-495e-b3c4-d898d0b54241/550e8400-e29b-41d4-a716-446655440000.pdf"
    }
  }
}
```

---

## Automated Testing Script

### PowerShell Script

Create `test-receipt-process.ps1`:

```powershell
# Test Receipt Processing Endpoint
$ApiUrl = "http://localhost:3000/api/receipts/process"
$UserId = "a33573a0-3562-495e-b3c4-d898d0b54241"
$ValidPath = "receipts/$UserId/550e8400-e29b-41d4-a716-446655440000.jpg"

Write-Host "🧪 Testing Receipt Processing Endpoint" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Using test user: $UserId" -ForegroundColor Yellow
Write-Host ""

# Test 1: Successful processing
Write-Host "✅ Test 1: Successful processing" -ForegroundColor Green
$body = @{ file_path = $ValidPath } | ConvertTo-Json
try {
    $response = Invoke-WebRequest -Uri $ApiUrl -Method POST -ContentType "application/json" -Body $body
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 2: Invalid format
Write-Host "❌ Test 2: Invalid file path format" -ForegroundColor Yellow
$body = @{ file_path = "invalid/path.jpg" } | ConvertTo-Json
try {
    $response = Invoke-WebRequest -Uri $ApiUrl -Method POST -ContentType "application/json" -Body $body
} catch {
    $_.Exception.Response | ConvertFrom-Json | ConvertTo-Json
}
Write-Host ""

# Test 3: Missing file_path
Write-Host "❌ Test 3: Missing file_path" -ForegroundColor Yellow
$body = @{} | ConvertTo-Json
try {
    $response = Invoke-WebRequest -Uri $ApiUrl -Method POST -ContentType "application/json" -Body $body
} catch {
    $_.Exception.Response | ConvertFrom-Json | ConvertTo-Json
}
Write-Host ""

# Test 4: Invalid JSON
Write-Host "❌ Test 4: Invalid JSON" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $ApiUrl -Method POST -ContentType "application/json" -Body "invalid json"
} catch {
    $_.Exception.Response | ConvertFrom-Json | ConvertTo-Json
}
Write-Host ""

# Test 5: File not found
Write-Host "❌ Test 5: File not found" -ForegroundColor Yellow
$body = @{ file_path = "receipts/$UserId/00000000-0000-0000-0000-000000000000.jpg" } | ConvertTo-Json
try {
    $response = Invoke-WebRequest -Uri $ApiUrl -Method POST -ContentType "application/json" -Body $body
} catch {
    $_.Exception.Response | ConvertFrom-Json | ConvertTo-Json
}
Write-Host ""

# Test 6: Wrong user ID
Write-Host "❌ Test 6: File ownership violation" -ForegroundColor Yellow
$body = @{ file_path = "receipts/different-user-id/550e8400-e29b-41d4-a716-446655440000.jpg" } | ConvertTo-Json
try {
    $response = Invoke-WebRequest -Uri $ApiUrl -Method POST -ContentType "application/json" -Body $body
} catch {
    $_.Exception.Response | ConvertFrom-Json | ConvertTo-Json
}
Write-Host ""

# Test 7: Invalid extension
Write-Host "❌ Test 7: Invalid file extension" -ForegroundColor Yellow
$body = @{ file_path = "receipts/$UserId/550e8400-e29b-41d4-a716-446655440000.pdf" } | ConvertTo-Json
try {
    $response = Invoke-WebRequest -Uri $ApiUrl -Method POST -ContentType "application/json" -Body $body
} catch {
    $_.Exception.Response | ConvertFrom-Json | ConvertTo-Json
}
Write-Host ""

Write-Host "✅ All tests completed!" -ForegroundColor Green
```

Run with:
```powershell
.\test-receipt-process.ps1
```

### Bash Script (alternative)

Create `test-receipt-process.sh`:

```bash
#!/bin/bash

API_URL="http://localhost:3000/api/receipts/process"
USER_ID="a33573a0-3562-495e-b3c4-d898d0b54241"
VALID_PATH="receipts/$USER_ID/550e8400-e29b-41d4-a716-446655440000.jpg"

echo "🧪 Testing Receipt Processing Endpoint"
echo "========================================"
echo "Using test user: $USER_ID"
echo ""

# Test 1: Successful processing
echo "✅ Test 1: Successful processing"
curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d "{\"file_path\": \"$VALID_PATH\"}" | jq
echo ""

# Test 2: Invalid format
echo "❌ Test 2: Invalid file path format"
curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{"file_path": "invalid/path.jpg"}' | jq
echo ""

# Test 3: Missing file_path
echo "❌ Test 3: Missing file_path"
curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{}' | jq
echo ""

# Test 4: Invalid JSON
echo "❌ Test 4: Invalid JSON"
curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d 'invalid json' | jq
echo ""

# Test 5: File not found
echo "❌ Test 5: File not found"
curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d "{\"file_path\": \"receipts/$USER_ID/00000000-0000-0000-0000-000000000000.jpg\"}" | jq
echo ""

# Test 6: Wrong user ID
echo "❌ Test 6: File ownership violation"
curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{"file_path": "receipts/different-user-id/550e8400-e29b-41d4-a716-446655440000.jpg"}' | jq
echo ""

# Test 7: Invalid extension
echo "❌ Test 7: Invalid file extension"
curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d "{\"file_path\": \"receipts/$USER_ID/550e8400-e29b-41d4-a716-446655440000.pdf\"}" | jq
echo ""

echo "✅ All tests completed!"
```

---

## Quick Test (One-Liner)

After uploading a test image:

**PowerShell:**
```powershell
$body = @{ file_path = "receipts/a33573a0-3562-495e-b3c4-d898d0b54241/550e8400-e29b-41d4-a716-446655440000.jpg" } | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/api/receipts/process" -Method POST -ContentType "application/json" -Body $body | Select-Object -ExpandProperty Content | ConvertFrom-Json
```

**curl:**
```bash
curl -X POST http://localhost:3000/api/receipts/process \
  -H "Content-Type: application/json" \
  -d '{"file_path": "receipts/a33573a0-3562-495e-b3c4-d898d0b54241/550e8400-e29b-41d4-a716-446655440000.jpg"}' \
  | jq
```

---

## Monitoring & Debugging

### Check Server Logs

Watch for these log messages:
- `Failed to delete receipt file:` - File cleanup warning (non-blocking)
- `AI service error:` - Service-level errors
- `Unexpected error processing receipt:` - Unexpected errors
- `Fatal error in receipt processing endpoint:` - Critical errors

### Verify File Deletion

After successful processing, verify the file was deleted:

```sql
-- This should return empty if file was deleted
SELECT * FROM storage.objects 
WHERE bucket_id = 'receipts' 
AND name LIKE '%550e8400-e29b-41d4-a716-446655440000%';
```

### Check Processing Time

The mock service simulates 1-2 seconds of processing. Verify:
- `processing_time_ms` is between 1000-2000ms
- Response time is reasonable (< 3 seconds total)

### Verify Mock Data Uses Real Categories

Check that the response uses actual category IDs from your database:

```sql
SELECT id, name FROM categories 
WHERE id IN (
  'a3ffc564-e1cb-4726-8119-db670d94bc61',  -- groceries
  '98b70605-a314-470b-8ecb-b2b5c7e6d3d3'   -- transport
);
```

---

## Next Steps

After successful testing:
1. ✅ Implement authentication (replace hardcoded user ID with session)
2. ✅ Create Supabase Edge Function for real AI processing
3. ✅ Add rate limiting to prevent abuse
4. ✅ Implement request logging/monitoring
5. ✅ Add integration tests with Jest/Vitest
6. ✅ Set up error tracking (e.g., Sentry)