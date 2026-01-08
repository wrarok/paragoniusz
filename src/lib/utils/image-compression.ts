/**
 * Image Compression Utility
 *
 * Compresses images before upload to reduce file size and processing time.
 * Particularly important for mobile photos which are often very large.
 * Includes HEIC to JPEG conversion for iOS photos.
 */

/**
 * Maximum dimensions for compressed images (width or height)
 * Images larger than this will be scaled down while maintaining aspect ratio
 */
const MAX_DIMENSION = 1920;

/**
 * JPEG compression quality (0-1)
 * Lower values = smaller file size but lower quality
 */
const JPEG_QUALITY = 0.85;

/**
 * Converts HEIC file to JPEG blob
 * HEIC files cannot be loaded into Image/Canvas directly in browsers
 * Uses dynamic import to avoid SSR issues with heic2any library
 */
async function convertHeicToJpeg(file: File): Promise<Blob> {
  console.log("[ImageCompression] Converting HEIC to JPEG using heic2any");
  try {
    // Dynamic import to avoid SSR issues (heic2any requires browser APIs)
    const heic2any = (await import("heic2any")).default;

    const convertedBlob = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.9,
    });

    // heic2any can return Blob or Blob[] - handle both cases
    if (Array.isArray(convertedBlob)) {
      return convertedBlob[0];
    }
    return convertedBlob;
  } catch (error) {
    console.error("[ImageCompression] HEIC conversion failed:", error);
    throw new Error("Failed to convert HEIC image. Please use JPG or PNG format.");
  }
}

/**
 * Compresses an image file to reduce size before upload
 *
 * Process:
 * 1. Load image into canvas
 * 2. Scale down if larger than MAX_DIMENSION
 * 3. Convert to JPEG with compression
 * 4. Return as File object
 *
 * @param file - Original image file (JPEG, PNG, HEIC)
 * @returns Compressed image file (always JPEG)
 *
 * @example
 * ```typescript
 * const originalFile = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
 * const compressed = await compressImage(originalFile);
 * console.log(`Reduced from ${originalFile.size} to ${compressed.size} bytes`);
 * ```
 */
export async function compressImage(file: File): Promise<File> {
  // Check if file is HEIC
  const isHeic = file.type === "image/heic" || file.name.toLowerCase().endsWith(".heic");

  // Convert HEIC to JPEG first (browsers can't load HEIC into canvas)
  let fileToProcess = file;
  if (isHeic) {
    console.log(`[ImageCompression] Converting HEIC to JPEG: ${(file.size / 1024).toFixed(0)}KB`);
    try {
      const jpegBlob = await convertHeicToJpeg(file);
      fileToProcess = new File([jpegBlob], file.name.replace(/\.heic$/i, ".jpg"), {
        type: "image/jpeg",
        lastModified: Date.now(),
      });
      console.log(
        `[ImageCompression] HEIC converted: ${(file.size / 1024).toFixed(0)}KB → ${(fileToProcess.size / 1024).toFixed(0)}KB`
      );
    } catch (error) {
      console.error("[ImageCompression] HEIC conversion failed:", error);
      throw error;
    }
  }

  // Return small non-HEIC files unchanged (< 500KB)
  const SMALL_FILE_THRESHOLD = 500 * 1024; // 500KB
  if (fileToProcess.size < SMALL_FILE_THRESHOLD && !isHeic) {
    console.log("[ImageCompression] File is small enough, skipping compression");
    return fileToProcess;
  }

  console.log(`[ImageCompression] Starting compression: ${(fileToProcess.size / 1024).toFixed(0)}KB`);

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Failed to get canvas context"));
      return;
    }

    img.onload = () => {
      try {
        // Calculate new dimensions (maintain aspect ratio)
        let { width, height } = img;

        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
          console.log(`[ImageCompression] Resizing to ${width}x${height}`);
        } else {
          console.log(`[ImageCompression] Keeping original dimensions ${width}x${height}`);
        }

        // Set canvas size
        canvas.width = width;
        canvas.height = height;

        // Draw image on canvas with high quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob (JPEG with compression)
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Failed to compress image"));
              return;
            }

            // Create new File from blob
            const compressedFile = new File([blob], fileToProcess.name.replace(/\.\w+$/, ".jpg"), {
              type: "image/jpeg",
              lastModified: Date.now(),
            });

            const compressionRatio = ((1 - compressedFile.size / fileToProcess.size) * 100).toFixed(1);
            console.log(
              `[ImageCompression] Compressed: ${(fileToProcess.size / 1024).toFixed(0)}KB → ${(compressedFile.size / 1024).toFixed(0)}KB (${compressionRatio}% reduction)`
            );

            resolve(compressedFile);
          },
          "image/jpeg",
          JPEG_QUALITY
        );

        // Clean up
        URL.revokeObjectURL(img.src);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error("Failed to load image"));
      URL.revokeObjectURL(img.src);
    };

    // Load image (use fileToProcess which may be converted from HEIC)
    img.src = URL.createObjectURL(fileToProcess);
  });
}

/**
 * Check if image compression is supported in current browser
 *
 * @returns true if canvas.toBlob is available
 */
export function isCompressionSupported(): boolean {
  return (
    typeof document !== "undefined" &&
    typeof HTMLCanvasElement !== "undefined" &&
    typeof HTMLCanvasElement.prototype.toBlob === "function"
  );
}
