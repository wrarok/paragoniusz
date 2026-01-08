import { describe, it, expect } from "vitest";
import {
  uploadReceiptSchema,
  processReceiptSchema,
  receiptItemSchema,
  receiptDataSchema,
  MAX_FILE_SIZE,
} from "@/lib/validation/receipt.validation";

describe("Receipt Validation", () => {
  describe("uploadReceiptSchema", () => {
    it("should accept valid JPEG file", () => {
      const file = new File(["content"], "receipt.jpg", { type: "image/jpeg" });
      expect(() => uploadReceiptSchema.parse({ file })).not.toThrow();
    });

    it("should accept valid PNG file", () => {
      const file = new File(["content"], "receipt.png", { type: "image/png" });
      expect(() => uploadReceiptSchema.parse({ file })).not.toThrow();
    });

    it("should accept valid HEIC file", () => {
      const file = new File(["content"], "receipt.heic", { type: "image/heic" });
      expect(() => uploadReceiptSchema.parse({ file })).not.toThrow();
    });

    it("should accept HEIC file with empty MIME type (iOS compatibility)", () => {
      const file = new File(["content"], "receipt.heic", { type: "" });
      expect(() => uploadReceiptSchema.parse({ file })).not.toThrow();
    });

    it("should accept HEIC file with wrong MIME type but correct extension", () => {
      const file = new File(["content"], "receipt.heic", { type: "application/octet-stream" });
      expect(() => uploadReceiptSchema.parse({ file })).not.toThrow();
    });

    it("should accept JPG file with empty MIME type", () => {
      const file = new File(["content"], "receipt.jpg", { type: "" });
      expect(() => uploadReceiptSchema.parse({ file })).not.toThrow();
    });

    it("should reject empty file", () => {
      const file = new File([], "empty.jpg", { type: "image/jpeg" });
      expect(() => uploadReceiptSchema.parse({ file })).toThrow("Nie podano pliku");
    });

    it("should reject unsupported file types", () => {
      const pdfFile = new File(["content"], "receipt.pdf", { type: "application/pdf" });
      expect(() => uploadReceiptSchema.parse({ file: pdfFile })).toThrow("Nieprawidłowy typ pliku. Prześlij tylko obrazy JPEG, PNG lub HEIC.");

      const txtFile = new File(["content"], "receipt.txt", { type: "text/plain" });
      expect(() => uploadReceiptSchema.parse({ file: txtFile })).toThrow("Nieprawidłowy typ pliku. Prześlij tylko obrazy JPEG, PNG lub HEIC.");
    });
  });

  describe("processReceiptSchema", () => {
    it("should accept valid file path with jpg extension", () => {
      const validPath = "receipts/123e4567-e89b-12d3-a456-426614174000/987fcdeb-51a2-43e7-b890-123456789abc.jpg";
      expect(() => processReceiptSchema.parse({ file_path: validPath })).not.toThrow();
    });

    it("should accept valid file path with jpeg extension", () => {
      const validPath = "receipts/123e4567-e89b-12d3-a456-426614174000/987fcdeb-51a2-43e7-b890-123456789abc.jpeg";
      expect(() => processReceiptSchema.parse({ file_path: validPath })).not.toThrow();
    });

    it("should accept valid file path with png extension", () => {
      const validPath = "receipts/123e4567-e89b-12d3-a456-426614174000/987fcdeb-51a2-43e7-b890-123456789abc.png";
      expect(() => processReceiptSchema.parse({ file_path: validPath })).not.toThrow();
    });

    it("should accept valid file path with heic extension", () => {
      const validPath = "receipts/123e4567-e89b-12d3-a456-426614174000/987fcdeb-51a2-43e7-b890-123456789abc.heic";
      expect(() => processReceiptSchema.parse({ file_path: validPath })).not.toThrow();
    });

    it("should reject empty file path", () => {
      expect(() => processReceiptSchema.parse({ file_path: "" })).toThrow("File path is required");
    });

    it("should reject invalid file path format", () => {
      expect(() => processReceiptSchema.parse({ file_path: "invalid/path.jpg" })).toThrow(
        "Invalid file path format. Expected: receipts/{user_id}/{uuid}.{ext}"
      );
    });

    it("should reject file path with invalid UUID format", () => {
      const invalidPath = "receipts/not-a-uuid/987fcdeb-51a2-43e7-b890-123456789abc.jpg";
      expect(() => processReceiptSchema.parse({ file_path: invalidPath })).toThrow(
        "Invalid file path format. Expected: receipts/{user_id}/{uuid}.{ext}"
      );
    });

    it("should reject file path with unsupported extension", () => {
      const invalidPath = "receipts/123e4567-e89b-12d3-a456-426614174000/987fcdeb-51a2-43e7-b890-123456789abc.pdf";
      expect(() => processReceiptSchema.parse({ file_path: invalidPath })).toThrow(
        "Invalid file path format. Expected: receipts/{user_id}/{uuid}.{ext}"
      );
    });
  });

  describe("receiptItemSchema", () => {
    it("should accept valid receipt item", () => {
      const validItem = {
        name: "Mleko",
        amount: 5.5,
        category: "żywność",
      };
      expect(() => receiptItemSchema.parse(validItem)).not.toThrow();
    });

    it("should reject item with empty name", () => {
      const invalidItem = {
        name: "",
        amount: 5.5,
        category: "żywność",
      };
      expect(() => receiptItemSchema.parse(invalidItem)).toThrow("Item name is required");
    });

    it("should reject item with negative amount", () => {
      const invalidItem = {
        name: "Mleko",
        amount: -5.5,
        category: "żywność",
      };
      expect(() => receiptItemSchema.parse(invalidItem)).toThrow("Amount must be positive");
    });

    it("should reject item with zero amount", () => {
      const invalidItem = {
        name: "Mleko",
        amount: 0,
        category: "żywność",
      };
      expect(() => receiptItemSchema.parse(invalidItem)).toThrow("Amount must be positive");
    });

    it("should reject item with empty category", () => {
      const invalidItem = {
        name: "Mleko",
        amount: 5.5,
        category: "",
      };
      expect(() => receiptItemSchema.parse(invalidItem)).toThrow("Category is required");
    });
  });

  describe("receiptDataSchema", () => {
    it("should accept valid receipt data", () => {
      const validData = {
        items: [
          { name: "Mleko", amount: 5.5, category: "żywność" },
          { name: "Chleb", amount: 3.2, category: "żywność" },
        ],
        total: 8.7,
        date: "2024-01-15",
      };
      expect(() => receiptDataSchema.parse(validData)).not.toThrow();
    });

    it("should reject receipt data with empty items array", () => {
      const invalidData = {
        items: [],
        total: 0,
        date: "2024-01-15",
      };
      expect(() => receiptDataSchema.parse(invalidData)).toThrow("At least one item is required");
    });

    it("should reject receipt data with negative total", () => {
      const invalidData = {
        items: [{ name: "Mleko", amount: 5.5, category: "żywność" }],
        total: -5.5,
        date: "2024-01-15",
      };
      expect(() => receiptDataSchema.parse(invalidData)).toThrow("Total must be positive");
    });

    it("should reject receipt data with invalid date format", () => {
      const invalidData = {
        items: [{ name: "Mleko", amount: 5.5, category: "żywność" }],
        total: 5.5,
        date: "01-15-2024",
      };
      expect(() => receiptDataSchema.parse(invalidData)).toThrow("Date must be in YYYY-MM-DD format");
    });

    it("should reject receipt data with invalid date format (slashes)", () => {
      const invalidData = {
        items: [{ name: "Mleko", amount: 5.5, category: "żywność" }],
        total: 5.5,
        date: "2024/01/15",
      };
      expect(() => receiptDataSchema.parse(invalidData)).toThrow("Date must be in YYYY-MM-DD format");
    });
  });

  describe("MAX_FILE_SIZE", () => {
    it("should be 10MB in bytes", () => {
      expect(MAX_FILE_SIZE).toBe(10 * 1024 * 1024);
      expect(MAX_FILE_SIZE).toBe(10485760);
    });
  });
});
