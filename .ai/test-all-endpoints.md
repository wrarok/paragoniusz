# Complete API Testing Guide - PowerShell Commands

## Test Data
- **Host**: `http://localhost:3000`
- **User ID**: `a33573a0-3562-495e-b3c4-d898d0b54241`
- **Profile ID**: `a33573a0-3562-495e-b3c4-d898d0b54241`

### Available Categories
- `05dcb7fd-8b62-4237-a714-2d4a20f6d921` - other
- `27db23d8-e66d-4cb5-beaa-1be8e2992175` - entertainment
- `2f1a0d96-fc12-4586-9679-f27971e9e27a` - dining
- `4449cb63-e74c-4029-8169-f45728c3fcfb` - travel
- `4a4a0a45-b5bc-4ce4-bc17-e4f0c5f717ee` - education
- `75e1b2a1-d942-459b-a13f-d0e4464d5252` - subscriptions
- `79094682-d207-4a47-b737-a0e30f7f25cc` - gifts
- `95ea67dc-9f43-4972-a1a3-fc4533328e1b` - clothing
- `98b70605-a314-470b-8ecb-b2b5c7e6d3d3` - transport
- `998e859a-025a-49e6-9a22-78a9a0aa09e1` - insurance
- `9f7bffe9-7dcb-4881-b061-3fafe337a9df` - utilities
- `a079cedc-862f-4bc2-94c3-b602a3a9761e` - housing
- `a3ffc564-e1cb-4726-8119-db670d94bc61` - groceries
- `cfd44936-0efb-4007-bde5-b3b81d2ac302` - healthcare
- `d542f793-dba4-4ad7-b577-2748c4acf979` - personal care

---

## 1. Profile Endpoints

### 1.1 Get Current User Profile ✅

```powershell
# Get user profile
Invoke-WebRequest -Uri "http://localhost:3000/api/profiles/me" -Method GET | Select-Object -ExpandProperty Content | ConvertFrom-Json
```

**Expected Response (200 OK):**
```json
{
  "id": "a33573a0-3562-495e-b3c4-d898d0b54241",
  "ai_consent_given": true,
  "created_at": "2025-11-08T18:29:21.534801+00:00",
  "updated_at": "2025-11-08T19:03:51.421591+00:00"
}
```

---

### 1.2 Update User Profile ✅

```powershell
# Update AI consent to false
$body = @{
    ai_consent_given = $false
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/api/profiles/me" -Method PATCH -ContentType "application/json" -Body $body | Select-Object -ExpandProperty Content | ConvertFrom-Json
```

**Expected Response (200 OK):**
```json
{
  "id": "a33573a0-3562-495e-b3c4-d898d0b54241",
  "ai_consent_given": false,
  "created_at": "2025-11-08T18:29:21.534801+00:00",
  "updated_at": "2025-11-15T20:00:00.000000+00:00"
}
```

```powershell
# Update AI consent back to true
$body = @{
    ai_consent_given = $true
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/api/profiles/me" -Method PATCH -ContentType "application/json" -Body $body | Select-Object -ExpandProperty Content | ConvertFrom-Json
```

---

### 1.3 Delete User Account ✅

**⚠️ WARNING: This will permanently delete the user and all associated data!**

```powershell
# Delete user account (use with caution!)
Invoke-WebRequest -Uri "http://localhost:3000/api/profiles/me" -Method DELETE
```

**Expected Response (204 No Content):**
- Empty response body
- Status code: 204

---

## 2. Category Endpoints

### 2.1 List All Categories ✅

```powershell
# Get all categories
Invoke-WebRequest -Uri "http://localhost:3000/api/categories" -Method GET | Select-Object -ExpandProperty Content | ConvertFrom-Json
```

**Expected Response (200 OK):**
```json
{
  "data": [
    {
      "id": "a3ffc564-e1cb-4726-8119-db670d94bc61",
      "name": "groceries"
    },
    {
      "id": "98b70605-a314-470b-8ecb-b2b5c7e6d3d3",
      "name": "transport"
    }
    // ... more categories
  ],
  "count": 15
}
```

---

## 3. Expense Endpoints

### 3.1 Create Expense (Manual) ✅

```powershell
# Create a single expense
$body = @{
    category_id = "a3ffc564-e1cb-4726-8119-db670d94bc61"  # groceries
    amount = 45.50
    expense_date = "2024-11-15"
    currency = "PLN"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/api/expenses" -Method POST -ContentType "application/json" -Body $body | Select-Object -ExpandProperty Content | ConvertFrom-Json
```

**Expected Response (201 Created):**
```json
{
  "id": "new-uuid",
  "user_id": "a33573a0-3562-495e-b3c4-d898d0b54241",
  "category_id": "a3ffc564-e1cb-4726-8119-db670d94bc61",
  "category": {
    "id": "a3ffc564-e1cb-4726-8119-db670d94bc61",
    "name": "groceries"
  },
  "amount": "45.50",
  "expense_date": "2024-11-15",
  "currency": "PLN",
  "created_by_ai": false,
  "was_ai_suggestion_edited": false,
  "created_at": "2024-11-15T20:00:00Z",
  "updated_at": "2024-11-15T20:00:00Z"
}
```

---

### 3.2 Create Multiple Expenses (Batch) ✅

```powershell
# Create multiple expenses at once
$body = @{
    expenses = @(
        @{
            category_id = "a3ffc564-e1cb-4726-8119-db670d94bc61"  # groceries
            amount = "35.50"
            expense_date = "2024-11-15"
            currency = "PLN"
            created_by_ai = $true
            was_ai_suggestion_edited = $false
        },
        @{
            category_id = "98b70605-a314-470b-8ecb-b2b5c7e6d3d3"  # transport
            amount = "15.20"
            expense_date = "2024-11-15"
            currency = "PLN"
            created_by_ai = $true
            was_ai_suggestion_edited = $true
        }
    )
} | ConvertTo-Json -Depth 10

Invoke-WebRequest -Uri "http://localhost:3000/api/expenses/batch" -Method POST -ContentType "application/json" -Body $body | Select-Object -ExpandProperty Content | ConvertFrom-Json
```

**Expected Response (201 Created):**
```json
{
  "data": [
    {
      "id": "uuid-1",
      "category": { "id": "...", "name": "groceries" },
      "amount": "35.50",
      // ... full expense object
    },
    {
      "id": "uuid-2",
      "category": { "id": "...", "name": "transport" },
      "amount": "15.20",
      // ... full expense object
    }
  ],
  "count": 2
}
```

---

### 3.3 List User Expenses ✅

```powershell
# Get all expenses (default: 50 most recent)
Invoke-WebRequest -Uri "http://localhost:3000/api/expenses" -Method GET | Select-Object -ExpandProperty Content | ConvertFrom-Json
```

```powershell
# Get expenses with filters
$params = @{
    limit = 10
    offset = 0
    from_date = "2024-11-01"
    to_date = "2024-11-30"
    category_id = "a3ffc564-e1cb-4726-8119-db670d94bc61"  # groceries
    sort = "expense_date.desc"
}

$queryString = ($params.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }) -join "&"
Invoke-WebRequest -Uri "http://localhost:3000/api/expenses?$queryString" -Method GET | Select-Object -ExpandProperty Content | ConvertFrom-Json
```

**Expected Response (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid",
      "category": { "id": "...", "name": "groceries" },
      "amount": "45.50",
      "expense_date": "2024-11-15",
      // ... full expense object
    }
  ],
  "count": 1,
  "total": 150
}
```

---

### 3.4 Get Single Expense ✅

```powershell
# Replace {expense_id} with actual expense ID from previous responses
$expenseId = "your-expense-id-here"

Invoke-WebRequest -Uri "http://localhost:3000/api/expenses/$expenseId" -Method GET | Select-Object -ExpandProperty Content | ConvertFrom-Json
```

**Expected Response (200 OK):**
```json
{
  "id": "expense-uuid",
  "user_id": "a33573a0-3562-495e-b3c4-d898d0b54241",
  "category": { "id": "...", "name": "groceries" },
  "amount": "45.50",
  "expense_date": "2024-11-15",
  "currency": "PLN",
  "created_by_ai": false,
  "was_ai_suggestion_edited": false,
  "created_at": "2024-11-15T20:00:00Z",
  "updated_at": "2024-11-15T20:00:00Z"
}
```

---

### 3.5 Update Expense ✅

```powershell
# Replace {expense_id} with actual expense ID
$expenseId = "your-expense-id-here"

$body = @{
    category_id = "98b70605-a314-470b-8ecb-b2b5c7e6d3d3"  # transport
    amount = 50.00
    expense_date = "2024-11-16"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/api/expenses/$expenseId" -Method PATCH -ContentType "application/json" -Body $body | Select-Object -ExpandProperty Content | ConvertFrom-Json
```

**Expected Response (200 OK):**
```json
{
  "id": "expense-uuid",
  "category": { "id": "...", "name": "transport" },
  "amount": "50.00",
  "expense_date": "2024-11-16",
  "updated_at": "2024-11-15T20:05:00Z"
  // ... full expense object
}
```

---

### 3.6 Delete Expense ✅

```powershell
# Replace {expense_id} with actual expense ID
$expenseId = "your-expense-id-here"

Invoke-WebRequest -Uri "http://localhost:3000/api/expenses/$expenseId" -Method DELETE
```

**Expected Response (204 No Content):**
- Empty response body
- Status code: 204

---

## 4. Dashboard Endpoints

### 4.1 Get Dashboard Summary ✅

```powershell
# Get current month summary
Invoke-WebRequest -Uri "http://localhost:3000/api/dashboard/summary" -Method GET | Select-Object -ExpandProperty Content | ConvertFrom-Json
```

```powershell
# Get specific month summary
Invoke-WebRequest -Uri "http://localhost:3000/api/dashboard/summary?month=2024-11" -Method GET | Select-Object -ExpandProperty Content | ConvertFrom-Json
```

**Expected Response (200 OK):**
```json
{
  "period": {
    "month": "2024-11",
    "from_date": "2024-11-01",
    "to_date": "2024-11-30"
  },
  "total_amount": "1250.75",
  "currency": "PLN",
  "expense_count": 45,
  "categories": [
    {
      "category_id": "a3ffc564-e1cb-4726-8119-db670d94bc61",
      "category_name": "groceries",
      "amount": "450.50",
      "percentage": 36.0,
      "count": 15
    }
    // ... more categories
  ],
  "ai_metrics": {
    "ai_created_count": 30,
    "ai_created_percentage": 66.7,
    "ai_edited_count": 5,
    "ai_accuracy_percentage": 83.3
  }
}
```

---

## 5. Receipt Processing Endpoints

### 5.1 Upload Receipt Image ✅

```powershell
# Upload a receipt image
$response = Invoke-WebRequest -Uri "http://localhost:3000/api/receipts/upload" -Method POST -Form @{ 
    file = Get-Item "C:\path\to\your\receipt.jpg" 
}

$uploadResult = $response.Content | ConvertFrom-Json
Write-Host "Uploaded to: $($uploadResult.file_path)"
$uploadResult
```

**Expected Response (201 Created):**
```json
{
  "file_id": "550e8400-e29b-41d4-a716-446655440000",
  "file_path": "receipts/a33573a0-3562-495e-b3c4-d898d0b54241/550e8400-e29b-41d4-a716-446655440000.jpg",
  "uploaded_at": "2024-11-15T20:00:00Z"
}
```

---

### 5.2 Process Receipt with AI ✅

```powershell
# Process the uploaded receipt
$body = @{
    file_path = "receipts/a33573a0-3562-495e-b3c4-d898d0b54241/550e8400-e29b-41d4-a716-446655440000.jpg"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/receipts/process" -Method POST -ContentType "application/json" -Body $body
    $response.Content | ConvertFrom-Json
} catch {
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $reader.BaseStream.Position = 0
    $reader.DiscardBufferedData()
    $reader.ReadToEnd() | ConvertFrom-Json
}
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

---

## Complete Test Flow

Here's a complete workflow to test the entire system:

```powershell
# 1. Get user profile
Write-Host "`n=== 1. Get Profile ===" -ForegroundColor Cyan
Invoke-WebRequest -Uri "http://localhost:3000/api/profiles/me" -Method GET | Select-Object -ExpandProperty Content | ConvertFrom-Json

# 2. Get all categories
Write-Host "`n=== 2. Get Categories ===" -ForegroundColor Cyan
$categories = Invoke-WebRequest -Uri "http://localhost:3000/api/categories" -Method GET | Select-Object -ExpandProperty Content | ConvertFrom-Json
$categories

# 3. Create a manual expense
Write-Host "`n=== 3. Create Manual Expense ===" -ForegroundColor Cyan
$body = @{
    category_id = "a3ffc564-e1cb-4726-8119-db670d94bc61"
    amount = 45.50
    expense_date = (Get-Date -Format "yyyy-MM-dd")
    currency = "PLN"
} | ConvertTo-Json

$newExpense = Invoke-WebRequest -Uri "http://localhost:3000/api/expenses" -Method POST -ContentType "application/json" -Body $body | Select-Object -ExpandProperty Content | ConvertFrom-Json
$newExpense
$expenseId = $newExpense.id

# 4. Get the created expense
Write-Host "`n=== 4. Get Single Expense ===" -ForegroundColor Cyan
Invoke-WebRequest -Uri "http://localhost:3000/api/expenses/$expenseId" -Method GET | Select-Object -ExpandProperty Content | ConvertFrom-Json

# 5. Update the expense
Write-Host "`n=== 5. Update Expense ===" -ForegroundColor Cyan
$body = @{
    amount = 55.00
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/api/expenses/$expenseId" -Method PATCH -ContentType "application/json" -Body $body | Select-Object -ExpandProperty Content | ConvertFrom-Json

# 6. List all expenses
Write-Host "`n=== 6. List Expenses ===" -ForegroundColor Cyan
Invoke-WebRequest -Uri "http://localhost:3000/api/expenses?limit=5" -Method GET | Select-Object -ExpandProperty Content | ConvertFrom-Json

# 7. Get dashboard summary
Write-Host "`n=== 7. Dashboard Summary ===" -ForegroundColor Cyan
Invoke-WebRequest -Uri "http://localhost:3000/api/dashboard/summary" -Method GET | Select-Object -ExpandProperty Content | ConvertFrom-Json

# 8. Create batch expenses
Write-Host "`n=== 8. Create Batch Expenses ===" -ForegroundColor Cyan
$body = @{
    expenses = @(
        @{
            category_id = "2f1a0d96-fc12-4586-9679-f27971e9e27a"  # dining
            amount = "25.00"
            expense_date = (Get-Date -Format "yyyy-MM-dd")
            currency = "PLN"
            created_by_ai = $true
            was_ai_suggestion_edited = $false
        },
        @{
            category_id = "27db23d8-e66d-4cb5-beaa-1be8e2992175"  # entertainment
            amount = "40.00"
            expense_date = (Get-Date -Format "yyyy-MM-dd")
            currency = "PLN"
            created_by_ai = $true
            was_ai_suggestion_edited = $false
        }
    )
} | ConvertTo-Json -Depth 10

Invoke-WebRequest -Uri "http://localhost:3000/api/expenses/batch" -Method POST -ContentType "application/json" -Body $body | Select-Object -ExpandProperty Content | ConvertFrom-Json

# 9. Delete the expense (optional - uncomment to test)
# Write-Host "`n=== 9. Delete Expense ===" -ForegroundColor Cyan
# Invoke-WebRequest -Uri "http://localhost:3000/api/expenses/$expenseId" -Method DELETE

Write-Host "`n=== All Tests Completed! ===" -ForegroundColor Green
```

---

## Error Testing

### Test Invalid Requests

```powershell
# Test invalid expense amount
$body = @{
    category_id = "a3ffc564-e1cb-4726-8119-db670d94bc61"
    amount = -10.00  # Invalid: negative amount
    expense_date = "2024-11-15"
} | ConvertTo-Json

try {
    Invoke-WebRequest -Uri "http://localhost:3000/api/expenses" -Method POST -ContentType "application/json" -Body $body
} catch {
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $reader.BaseStream.Position = 0
    $reader.DiscardBufferedData()
    $reader.ReadToEnd() | ConvertFrom-Json
}
```

```powershell
# Test invalid category ID
$body = @{
    category_id = "invalid-uuid"
    amount = 10.00
    expense_date = "2024-11-15"
} | ConvertTo-Json

try {
    Invoke-WebRequest -Uri "http://localhost:3000/api/expenses" -Method POST -ContentType "application/json" -Body $body
} catch {
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $reader.BaseStream.Position = 0
    $reader.DiscardBufferedData()
    $reader.ReadToEnd() | ConvertFrom-Json
}
```

```powershell
# Test future date
$body = @{
    category_id = "a3ffc564-e1cb-4726-8119-db670d94bc61"
    amount = 10.00
    expense_date = "2025-12-31"  # Future date
} | ConvertTo-Json

try {
    Invoke-WebRequest -Uri "http://localhost:3000/api/expenses" -Method POST -ContentType "application/json" -Body $body
} catch {
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $reader.BaseStream.Position = 0
    $reader.DiscardBufferedData()
    $reader.ReadToEnd() | ConvertFrom-Json
}
```

---

## Notes

- All commands use PowerShell syntax with `Invoke-WebRequest`
- Replace placeholder IDs (like `your-expense-id-here`) with actual IDs from responses
- Error responses are caught and displayed using try-catch blocks
- The complete test flow creates, reads, updates expenses and shows dashboard data
- Authentication is not yet implemented, so all requests use the hardcoded user ID