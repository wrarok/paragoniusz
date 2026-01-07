/**
 * Supabase Edge Function: Process Receipt
 *
 * Processes receipt images using OpenRouter AI to extract structured data.
 * Uses base64 encoding with memory optimization.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Rate limiter to track requests per user
 */
const rateLimiter = new Map<string, number[]>();

const RATE_LIMIT = {
  MAX_REQUESTS: 10,
  WINDOW_MS: 60000,
};

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userRequests = rateLimiter.get(userId) || [];
  const recentRequests = userRequests.filter((timestamp) => now - timestamp < RATE_LIMIT.WINDOW_MS);

  if (recentRequests.length >= RATE_LIMIT.MAX_REQUESTS) {
    return false;
  }

  recentRequests.push(now);
  rateLimiter.set(userId, recentRequests);
  return true;
}

/**
 * Receipt data schema for OpenRouter structured output
 */
const receiptSchema = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Item name from receipt" },
          amount: { type: "number", description: "Item price in PLN" },
          category: {
            type: "string",
            description:
              "Category name - must be one of: żywność, transport, media, rozrywka, zdrowie, edukacja, odzież, restauracje, mieszkanie, ubezpieczenia, higiena, prezenty, podróże, subskrypcje, inne",
            enum: [
              "żywność",
              "transport",
              "media",
              "rozrywka",
              "zdrowie",
              "edukacja",
              "odzież",
              "restauracje",
              "mieszkanie",
              "ubezpieczenia",
              "higiena",
              "prezenty",
              "podróże",
              "subskrypcje",
              "inne",
            ],
          },
        },
        required: ["name", "amount", "category"],
        additionalProperties: false,
      },
    },
    total: { type: "number", description: "Total amount from receipt in PLN" },
    date: {
      type: "string",
      description: "Receipt date in YYYY-MM-DD format",
      pattern: "^\\d{4}-\\d{2}-\\d{2}$",
    },
  },
  required: ["items", "total", "date"],
  additionalProperties: false,
};

/**
 * Converts ArrayBuffer to base64 string efficiently
 * Uses chunking to avoid memory spikes
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192; // Process 8KB at a time
  let binary = "";

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

/**
 * Calls OpenRouter API to process receipt image
 */
async function processReceiptWithOpenRouter(base64Image: string): Promise<{
  items: { name: string; amount: number; category: string }[];
  total: number;
  date: string;
}> {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY not configured");
  }

  const systemMessage = `You are an expert at extracting structured data from Polish receipts.

CRITICAL: For each item, extract the FINAL TOTAL PRICE (rightmost column), NOT the unit price or price with multiplier.
Polish receipts typically show: [Item Name] [Quantity×Unit Price] [FINAL PRICE]
You MUST extract the FINAL PRICE from the rightmost column for each item.

Example from receipt:
- "GRAPEFRUIT KG C 2×6.99" with "15.45C" on the right → amount should be 15.45 (NOT 6.99)
- "SŁONECZNIK TUR 100 2×2.89" with "5.98C" on the right → amount should be 5.98 (NOT 2.89)

Extract all items with their FINAL prices and suggest appropriate categories.
Use ONLY these exact Polish category names (case-sensitive):
- żywność (groceries/food)
- transport (transportation)
- media (utilities)
- rozrywka (entertainment)
- zdrowie (healthcare)
- edukacja (education)
- odzież (clothing)
- restauracje (dining out)
- mieszkanie (housing)
- ubezpieczenia (insurance)
- higiena (personal care)
- prezenty (gifts)
- podróże (travel)
- subskrypcje (subscriptions)
- inne (other/miscellaneous)

Return the total amount and date from the receipt.
If date is not visible, use today's date.`;

  const userMessage = "Extract all items, prices, and categories from this Polish receipt.";

  // Build OpenRouter request
  const model = "openai/gpt-4o-mini";
  console.log(`[OpenRouter] Calling LLM: ${model}`);

  const request = {
    model,
    messages: [
      {
        role: "system",
        content: systemMessage,
      },
      {
        role: "user",
        content: [
          { type: "text", text: userMessage },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } },
        ],
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "receipt_extraction",
        strict: true,
        schema: receiptSchema,
      },
    },
    temperature: 0.1,
    max_tokens: 2000,
  };

  console.log("Calling OpenRouter API...");

  // Call OpenRouter with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://paragoniusz.app",
        "X-Title": "Paragoniusz",
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `API request failed with status ${response.status}`;
      console.error("OpenRouter API error:", {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      });
      throw new Error(errorMessage);
    }

    const data = await response.json();

    // Log response details
    console.log(`[OpenRouter] Response received from: ${data.model || model}`);
    if (data.usage) {
      console.log(
        `[OpenRouter] Token usage - Prompt: ${data.usage.prompt_tokens}, Completion: ${data.usage.completion_tokens}, Total: ${data.usage.total_tokens}`
      );
    }

    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No content in API response");
    }

    // Parse JSON response
    const parsedData = JSON.parse(content);
    console.log("[OpenRouter] Processing successful");

    return parsedData;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Processing timeout - request took too long");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Main Edge Function handler
 */
Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    console.log("Processing receipt request...");

    // TEMPORARY: Auth disabled until authentication is implemented in the app
    // TODO: Re-enable authentication when auth system is ready
    // Get auth header (optional for now)
    const authHeader = req.headers.get("Authorization");

    // Initialize Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: authHeader ? { Authorization: authHeader } : {},
      },
    });

    // TEMPORARY: Use dummy user ID for testing
    // TODO: Replace with real user ID from auth token
    const userId = "test-user-id";

    // Check rate limit
    if (!checkRateLimit(userId)) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse request
    const body = await req.json();
    const { file_path } = body;

    if (!file_path) {
      return new Response(JSON.stringify({ error: "Missing file_path" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log("File path:", file_path);

    // Validate file path format
    const filePathRegex = /^receipts\/[a-f0-9-]{36}\/[a-f0-9-]{36}\.(jpg|jpeg|png|heic)$/i;
    if (!filePathRegex.test(file_path)) {
      return new Response(JSON.stringify({ error: "Invalid file path format" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // TEMPORARY: File ownership check disabled until auth is implemented
    // TODO: Re-enable when authentication is ready
    // Verify file ownership (user_id in path must match authenticated user)
    // const fileUserId = file_path.split('/')[1];
    // if (fileUserId !== userId) {
    //   return new Response(
    //     JSON.stringify({ error: 'Forbidden - file does not belong to user' }),
    //     { status: 403, headers: { 'Content-Type': 'application/json' } }
    //   );
    // }

    // Download image from storage
    console.log("Downloading image from storage...");
    const { data: imageBlob, error: downloadError } = await supabase.storage.from("receipts").download(file_path);

    if (downloadError || !imageBlob) {
      console.error("Failed to download image:", downloadError);
      return new Response(JSON.stringify({ error: "Failed to access receipt image" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Convert to base64 with memory optimization
    console.log("Converting image to base64...");
    const arrayBuffer = await imageBlob.arrayBuffer();
    const imageSize = Math.round(arrayBuffer.byteLength / 1024);
    const base64 = arrayBufferToBase64(arrayBuffer);

    console.log("Image size:", imageSize, "KB");
    console.log("Base64 size:", Math.round(base64.length / 1024), "KB");

    // Process receipt with OpenRouter
    const receiptData = await processReceiptWithOpenRouter(base64);

    // Delete the image file (per PRD requirement)
    try {
      await supabase.storage.from("receipts").remove([file_path]);
      console.log("Image deleted successfully");
    } catch (deleteError) {
      console.warn("Failed to delete image:", deleteError);
      // Don't fail the request if deletion fails
    }

    console.log("Returning success response");
    return new Response(JSON.stringify(receiptData), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: "An unexpected error occurred",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
