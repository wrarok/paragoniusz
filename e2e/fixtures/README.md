# E2E Test Fixtures

## 📁 Receipt Images

Place receipt image samples in `receipts/` directory for testing AI receipt scanning functionality.

### Required Files:

#### 1. **grocery-receipt.jpg** ✅ Required

Standard grocery receipt with multiple food items.

**Requirements:**

- Format: JPG or PNG
- Size: < 5 MB
- Items: 3-5 food items
- Total: ~45-50 PLN
- Polish language receipt preferred

**Expected Data Structure:**

```json
{
  "total": "45.50",
  "items": [
    { "name": "Mleko UHT 2%", "amount": "5.50", "category": "żywność" },
    { "name": "Chleb pszenny", "amount": "3.20", "category": "żywność" },
    { "name": "Ser żółty", "amount": "12.90", "category": "żywność" }
  ],
  "date": "2024-01-15"
}
```

---

**Requirements:**

- Format: JPG or PNG
- Size: < 5 MB
- Items: 2-3 items (food/drinks)
- Total: ~40 PLN
- Category: restauracje

**Expected Data Structure:**

```json
{
  "total": "40.00",
  "items": [
    { "name": "Pizza Margherita", "amount": "32.00", "category": "restauracje" },
    { "name": "Coca-Cola 0.5L", "amount": "8.00", "category": "restauracje" }
  ],
  "date": "2024-01-15"
}
```

---

#### 3. **multi-item-receipt.jpg** ✅ Required

Receipt with many items (8-10+) from various categories.

**Requirements:**

- Format: JPG or PNG
- Size: < 5 MB
- Items: 8-10 items minimum
- Categories: Mix (żywność, transport, media, etc.)
- Total: ~200-300 PLN

**Use Case:** Testing bulk expense extraction and category mapping.

---

#### 4. **corrupted-receipt.jpg** ⚠️ For Error Testing

Corrupted or unreadable image file.

**Requirements:**

- Format: JPG or PNG
- Content: Blurry, damaged, or unreadable text
- Alternative: Empty/blank image

**Use Case:** Testing error handling for failed AI processing.

---

#### 5. **slow-receipt.jpg** ⏱️ For Timeout Testing

Large file that may trigger processing timeout.

**Requirements:**

- Format: JPG
- Size: 5-10 MB
- Resolution: Very high (4000x6000px or higher)

**Use Case:** Testing timeout handling (20s limit).

---

## 📝 General Image Requirements

### Format Support:

- ✅ JPEG (.jpg, .jpeg)
- ✅ PNG (.png)
- ✅ HEIC (.heic) - Apple Photos format

### Quality Guidelines:

- **Resolution:** 1000x1500px minimum (except slow-receipt)
- **Text Clarity:** All text must be clearly readable
- **Lighting:** Good lighting, no shadows
- **Orientation:** Portrait orientation preferred
- **Language:** Polish receipts preferred for realistic testing

### What to Avoid:

- ❌ Receipts with personal information (blur if needed)
- ❌ Receipts with credit card numbers
- ❌ Extremely faded or damaged receipts (except corrupted-receipt test)
- ❌ Handwritten receipts (AI may struggle)

---

## 🔧 Creating Test Fixtures

### Option 1: Use Real Receipts

1. Take clear photos of receipts with your phone
2. Crop and adjust brightness if needed
3. Blur any sensitive information
4. Rename according to naming convention
5. Place in `e2e/fixtures/receipts/` directory

### Option 2: Generate Sample Receipts

1. Use online receipt generator tools
2. Configure with Polish text and items
3. Download as image
4. Rename according to naming convention

### Option 3: Use Sample Images (Development Only)

For initial testing, you can use placeholder images:

```bash
# Create placeholder images (requires ImageMagick)
convert -size 1000x1500 xc:white -pointsize 30 \
  -annotate +100+100 "Sample Grocery Receipt\nMleko: 5.50 PLN\nChleb: 3.20 PLN\nTotal: 45.50 PLN" \
  e2e/fixtures/receipts/grocery-receipt.jpg
```

---

## 📊 Fixture Usage in Tests

### Example: Loading Receipt in Test

```typescript
import { test } from "@playwright/test";
import { uploadReceipt, waitForAIProcessing } from "./helpers/receipt.helpers";

test("should process grocery receipt", async ({ page }) => {
  await page.goto("/expenses/scan");

  // Upload fixture
  await uploadReceipt(page, "./e2e/fixtures/receipts/grocery-receipt.jpg");

  // Wait for AI processing
  const processed = await waitForAIProcessing(page);
  expect(processed).toBe(true);
});
```

---

## 🔒 Security & Privacy

**IMPORTANT:**

- ⚠️ All receipt image files are **gitignored** (see `.gitignore`)
- ⚠️ Never commit actual receipt images to version control
- ⚠️ Blur or remove any personal information before using real receipts
- ⚠️ Test receipts should not contain sensitive financial data

---

## 📦 Distributing Fixtures to Team

Since fixtures are gitignored, share them with your team via:

1. **Secure Cloud Storage:** Google Drive, Dropbox (private folder)
2. **Internal File Server:** Company network drive
3. **Encrypted Archive:** Password-protected ZIP file
4. **Document Instructions:** This README explains how to obtain/create them

**Setup Instructions for New Developers:**

```bash
# 1. Clone repository
git clone <repo-url>
cd paragoniusz

# 2. Install dependencies
npm install

# 3. Obtain fixture images from team lead
# Place them in: e2e/fixtures/receipts/

# 4. Verify fixtures are in place
ls -la e2e/fixtures/receipts/

# 5. Run E2E tests
npm run test:e2e
```

---

## ✅ Verification Checklist

Before running E2E tests, verify:

- [ ] All 5 required receipt images are present
- [ ] Images meet size and format requirements
- [ ] grocery-receipt.jpg has ~3-5 items, ~45 PLN total
- [ ] multi-item-receipt.jpg has 8+ items
- [ ] corrupted-receipt.jpg is unreadable/damaged
- [ ] slow-receipt.jpg is 5-10 MB in size
- [ ] No sensitive personal information visible
- [ ] File names match exact conventions

---

## 🆘 Troubleshooting

### Problem: "File not found" error in tests

**Solution:** Verify fixture path is relative to project root:

```typescript
"./e2e/fixtures/receipts/grocery-receipt.jpg"; // ✅ Correct
"../fixtures/receipts/grocery-receipt.jpg"; // ❌ Wrong
```

### Problem: AI processing always fails

**Solution:**

1. Check image quality (blur, low resolution)
2. Verify file isn't corrupted
3. Try with a clearer receipt image

### Problem: Timeout on all receipts

**Solution:**

1. Check internet connection (OpenRouter API requires network)
2. Verify `.env.test` has correct Supabase credentials
3. Check if OpenRouter API is accessible

---

## 📚 Additional Resources

- [Playwright File Uploads](https://playwright.dev/docs/input#upload-files)
- [Image Quality Guidelines](https://developers.google.com/ml-kit/vision/text-recognition/v2)
- [Polish Receipt Formats](https://www.biznes.gov.pl/pl/portal/00382)

---

**Last Updated:** 2024-12-06  
**Maintainer:** QA Team
