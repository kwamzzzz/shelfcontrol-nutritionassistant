import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { image_base64, mime_type } = await req.json();
    if (!image_base64) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const mt = mime_type || "image/jpeg";
    const dataUrl = `data:${mt};base64,${image_base64}`;

    const systemPrompt = `You are a grocery-receipt OCR extractor. Read the receipt image and extract every purchased line item.

Rules:
- One entry per purchased product line. Skip totals, subtotals, tax, change, loyalty, and store header/footer text.
- name: the product name as printed, cleaned up (title case, no SKU codes).
- quantity + quantity_unit: the count if shown (e.g. 2, "piece"/"pack"/"bottle"). Use null if not shown.
- weight + weight_unit: the weight/volume if shown (e.g. 1.2 "kg", 500 "g", 1 "L"). Use null if not shown.
- price: the LINE total paid for that item as a number (not the unit price). Use null if unreadable.
- notes: anything extra printed on the line (e.g. "offer", "2 for 1"). Use null if none.
- Also return store_name (merchant name) and purchased_at (ISO date yyyy-mm-dd) if legible, else null.
- Never invent items. If the image is not a receipt, return an empty items array.`;

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
              { type: "text", text: "Extract the line items from this grocery receipt." },
              { type: "image_url", image_url: { url: dataUrl } },
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
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Settings." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Could not read the receipt" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("scan-receipt error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
