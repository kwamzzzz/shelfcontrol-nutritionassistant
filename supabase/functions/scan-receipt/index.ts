import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_IMAGES = 10;
const MAX_IMAGE_BASE64_CHARS = 6_000_000;
const MAX_TOTAL_BASE64_CHARS = 18_000_000;
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

interface ReceiptImagePayload {
  image_base64?: unknown;
  mime_type?: unknown;
  source_index?: unknown;
  part?: unknown;
  total_parts?: unknown;
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const isAuthenticated = async (req: Request): Promise<boolean> => {
  const authHeader = req.headers.get("Authorization") ?? "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase authentication is not configured");
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const { data, error } = await supabase.auth.getUser(match[1]);
  return !error && Boolean(data.user);
};

const parseImages = (body: Record<string, unknown>): ReceiptImagePayload[] => {
  if (Array.isArray(body.images)) return body.images as ReceiptImagePayload[];

  // Keep the original one-image client contract working during rollout.
  if (body.image_base64) {
    return [{
      image_base64: body.image_base64,
      mime_type: body.mime_type,
      source_index: 0,
      part: 1,
      total_parts: 1,
    }];
  }

  return [];
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    if (!await isAuthenticated(req)) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const rawBody = await req.json();
    if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
      return jsonResponse({ error: "Invalid request body" }, 400);
    }

    const images = parseImages(rawBody as Record<string, unknown>);
    if (images.length === 0) {
      return jsonResponse({ error: "No receipt images provided" }, 400);
    }
    if (images.length > MAX_IMAGES) {
      return jsonResponse({ error: `A receipt can include up to ${MAX_IMAGES} prepared images` }, 400);
    }

    let totalBase64Chars = 0;
    const validatedImages: Array<{ base64: string; mime: string; label: string }> = [];

    for (const [index, image] of images.entries()) {
      if (
        typeof image.image_base64 !== "string" ||
        image.image_base64.length === 0 ||
        image.image_base64.length > MAX_IMAGE_BASE64_CHARS
      ) {
        return jsonResponse({ error: `Receipt image ${index + 1} is invalid or too large` }, 400);
      }

      const mime = typeof image.mime_type === "string" ? image.mime_type : "image/jpeg";
      if (!allowedMimeTypes.has(mime)) {
        return jsonResponse({ error: `Receipt image ${index + 1} has an unsupported format` }, 400);
      }

      totalBase64Chars += image.image_base64.length;
      if (totalBase64Chars > MAX_TOTAL_BASE64_CHARS) {
        return jsonResponse({ error: "The combined receipt images are too large" }, 400);
      }

      const sourceIndex =
        typeof image.source_index === "number" && Number.isFinite(image.source_index)
          ? Math.max(0, Math.floor(image.source_index)) + 1
          : index + 1;
      const part =
        typeof image.part === "number" && Number.isFinite(image.part)
          ? Math.max(1, Math.floor(image.part))
          : 1;
      const totalParts =
        typeof image.total_parts === "number" && Number.isFinite(image.total_parts)
          ? Math.max(part, Math.floor(image.total_parts))
          : 1;

      validatedImages.push({
        base64: image.image_base64,
        mime,
        label:
          totalParts > 1
            ? `Screenshot ${sourceIndex}, section ${part} of ${totalParts}`
            : `Screenshot ${sourceIndex}`,
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are a grocery-receipt OCR extractor. Read paper receipts and digital order screenshots from grocery apps such as Careem, InstaShop, and noon, then extract every purchased grocery line item.

Rules:
- Images may be sequential or overlapping parts of one order. Read them in the supplied order and never duplicate a line item that appears in an overlap.
- One entry per purchased product line. Skip totals, subtotals, tax, change, loyalty, and store header/footer text.
- Skip delivery fees, service fees, tips, substitutions that were not delivered, cancelled items, and refunded items.
- name: the product name as printed, cleaned up (title case, no SKU codes).
- quantity + quantity_unit: the count if shown (e.g. 2, "piece"/"pack"/"bottle"). Use null if not shown.
- weight + weight_unit: the weight/volume if shown (e.g. 1.2 "kg", 500 "g", 1 "L"). Use null if not shown.
- price: the line total actually paid for that item after visible item discounts. If only a unit price and quantity are shown, calculate the line total. Use null if unreadable.
- notes: useful purchase context such as "offer", "2 for 1", or a visible substitution. Use null if none.
- Also return store_name (merchant or supermarket name, not the delivery app) and purchased_at (ISO date yyyy-mm-dd) if legible, else null.
- Never invent items or fill unreadable values with guesses. If these images are not a grocery receipt or order, return an empty items array.`;

    const imageContent = validatedImages.flatMap((image, index) => [
      {
        type: "text",
        text: `${image.label} (${index + 1} of ${validatedImages.length})`,
      },
      {
        type: "image_url",
        image_url: { url: `data:${image.mime};base64,${image.base64}` },
      },
    ]);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: validatedImages.length === 1
                  ? "Extract this grocery receipt into editable line items."
                  : "These images belong to one grocery order. Combine them into one receipt without duplicating overlapping items.",
              },
              ...imageContent,
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_receipt",
              description: "Return the structured line items read from the receipt.",
              parameters: {
                type: "object",
                properties: {
                  store_name: { type: ["string", "null"] },
                  purchased_at: { type: ["string", "null"] },
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        quantity: { type: ["number", "null"] },
                        quantity_unit: { type: ["string", "null"] },
                        weight: { type: ["number", "null"] },
                        weight_unit: { type: ["string", "null"] },
                        price: { type: ["number", "null"] },
                        notes: { type: ["string", "null"] },
                      },
                      required: ["name", "quantity", "quantity_unit", "weight", "weight_unit", "price", "notes"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["store_name", "purchased_at", "items"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_receipt" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const text = await response.text();
      console.error("AI gateway error:", status, text);
      if (status === 429) {
        return jsonResponse({ error: "Rate limited. Please try again shortly." }, 429);
      }
      if (status === 402) {
        return jsonResponse({ error: "AI credits exhausted. Add funds in Settings." }, 402);
      }
      return jsonResponse({ error: "AI service unavailable" }, 500);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return jsonResponse(parsed);
    }

    return jsonResponse({ error: "Could not read the receipt" }, 500);
  } catch (e) {
    console.error("scan-receipt error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Could not read the receipt" }, 500);
  }
});
