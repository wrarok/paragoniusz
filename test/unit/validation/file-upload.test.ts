import { describe, it, expect } from "vitest";
import {
  validateFile,
  fileUploadSchema,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_FILE_TYPES,
} from "@/lib/validation/file-upload.validation";

describe("File Upload Validation", () => {
  describe("validateFile", () => {
    describe("valid files", () => {
      it("should accept JPEG file with correct MIME type", () => {
        const file = new File(["content"], "receipt.jpg", { type: "image/jpeg" });
        const result = validateFile(file);
        expect(result.isValid).toBe(true);
      });

      it("should accept PNG file with correct MIME type", () => {
        const file = new File(["content"], "receipt.png", { type: "image/png" });
        const result = validateFile(file);
        expect(result.isValid).toBe(true);
      });

      it("should accept HEIC file with correct MIME type", () => {
        const file = new File(["content"], "receipt.heic", { type: "image/heic" });
        const result = validateFile(file);
        expect(result.isValid).toBe(true);
      });

      // Tests for iOS/mobile compatibility
      it("should accept HEIC file with empty MIME type (iOS compatibility)", () => {
        const file = new File(["content"], "receipt.heic", { type: "" });
        const result = validateFile(file);
        expect(result.isValid).toBe(true);
      });

      it("should accept HEIC file with wrong MIME type but correct extension", () => {
        const file = new File(["content"], "receipt.heic", { type: "application/octet-stream" });
        const result = validateFile(file);
        expect(result.isValid).toBe(true);
      });

      it("should accept JPG file with empty MIME type", () => {
        const file = new File(["content"], "receipt.jpg", { type: "" });
        const result = validateFile(file);
        expect(result.isValid).toBe(true);
      });

      it("should accept JPEG extension", () => {
        const file = new File(["content"], "receipt.jpeg", { type: "image/jpeg" });
        const result = validateFile(file);
        expect(result.isValid).toBe(true);
      });

      it("should be case-insensitive for extensions", () => {
        const upperFile = new File(["content"], "receipt.HEIC", { type: "" });
        const mixedFile = new File(["content"], "receipt.HeIc", { type: "" });
        
        expect(validateFile(upperFile).isValid).toBe(true);
        expect(validateFile(mixedFile).isValid).toBe(true);
      });
    });

    describe("invalid files", () => {
      it("should reject null file", () => {
        const result = validateFile(null);
        expect(result).toEqual({ isValid: false, error: "Nie wybrano pliku" });
      });

      it("should reject undefined file", () => {
        const result = validateFile(undefined);
        expect(result).toEqual({ isValid: false, error: "Nie wybrano pliku" });
      });

      it("should reject empty file", () => {
        const file = new File([], "empty.jpg", { type: "image/jpeg" });
        const result = validateFile(file);
        expect(result).toEqual({ isValid: false, error: "Plik jest pusty" });
      });

      it("should reject file exceeding size limit", () => {
        const largeContent = new Array(MAX_FILE_SIZE_BYTES + 1).fill("a").join("");
        const file = new File([largeContent], "large.jpg", { type: "image/jpeg" });
        const result = validateFile(file);
        expect(result.isValid).toBe(false);
        expect((result as { isValid: false; error: string }).error).toContain("Rozmiar pliku przekracza limit");
      });

      it("should reject PDF file", () => {
        const file = new File(["content"], "document.pdf", { type: "application/pdf" });
        const result = validateFile(file);
        expect(result).toEqual({
          isValid: false,
          error: "Nieprawidłowy typ pliku. Prześlij tylko obrazy JPEG, PNG lub HEIC.",
        });
      });

      it("should reject TXT file", () => {
        const file = new File(["content"], "document.txt", { type: "text/plain" });
        const result = validateFile(file);
        expect(result).toEqual({
          isValid: false,
          error: "Nieprawidłowy typ pliku. Prześlij tylko obrazy JPEG, PNG lub HEIC.",
        });
      });

      it("should reject file with wrong extension and wrong MIME type", () => {
        const file = new File(["content"], "document.pdf", { type: "application/pdf" });
        const result = validateFile(file);
        expect(result).toEqual({
          isValid: false,
          error: "Nieprawidłowy typ pliku. Prześlij tylko obrazy JPEG, PNG lub HEIC.",
        });
      });

      it("should reject file with wrong extension and empty MIME type", () => {
        const file = new File(["content"], "document.pdf", { type: "" });
        const result = validateFile(file);
        expect(result).toEqual({
          isValid: false,
          error: "Nieprawidłowy typ pliku. Prześlij tylko obrazy JPEG, PNG lub HEIC.",
        });
      });
    });
  });

  describe("fileUploadSchema", () => {
    it("should accept valid JPEG file", () => {
      const file = new File(["content"], "receipt.jpg", { type: "image/jpeg" });
      expect(() => fileUploadSchema.parse(file)).not.toThrow();
    });

    it("should accept valid PNG file", () => {
      const file = new File(["content"], "receipt.png", { type: "image/png" });
      expect(() => fileUploadSchema.parse(file)).not.toThrow();
    });

    it("should accept valid HEIC file", () => {
      const file = new File(["content"], "receipt.heic", { type: "image/heic" });
      expect(() => fileUploadSchema.parse(file)).not.toThrow();
    });

    it("should accept HEIC file with empty MIME type (iOS fix)", () => {
      const file = new File(["content"], "receipt.heic", { type: "" });
      expect(() => fileUploadSchema.parse(file)).not.toThrow();
    });

    it("should reject empty file", () => {
      const file = new File([], "empty.jpg", { type: "image/jpeg" });
      expect(() => fileUploadSchema.parse(file)).toThrow();
    });

    it("should reject unsupported file type", () => {
      const file = new File(["content"], "document.pdf", { type: "application/pdf" });
      expect(() => fileUploadSchema.parse(file)).toThrow();
    });
  });

  describe("constants", () => {
    it("should have correct ALLOWED_FILE_TYPES", () => {
      expect(ALLOWED_FILE_TYPES).toEqual(["image/jpeg", "image/png", "image/heic"]);
    });

    it("should have correct MAX_FILE_SIZE_BYTES (10MB)", () => {
      expect(MAX_FILE_SIZE_BYTES).toBe(10 * 1024 * 1024);
      expect(MAX_FILE_SIZE_BYTES).toBe(10485760);
    });
  });
});
