import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ParsedRecipe {
  name: string;
  servings: number | null;
  instructions: string | null;
  ingredients: Array<{ name: string; quantity: number | null; unit: string | null }>;
  source?: { url?: string; method: "json-ld" | "ai" };
}

const fetchHtml = async (url: string): Promise<string> => {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; ShelfControlBot/1.0; +https://shelf-control.app)",
      Accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
  });
  if (!response.ok) throw new Error(`Failed to fetch URL (${response.status})`);
  return await response.text();
};

const tryParseJsonLd = (html: string): ParsedRecipe | null => {
  const matches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const m of matches) {
    try {
      const raw = m[1].trim();
      const parsed = JSON.parse(raw);
      const candidates = Array.isArray(parsed) ? parsed : parsed?.["@graph"] ?? [parsed];
      for (const c of candidates) {
        const types = Array.isArray(c?.["@type"]) ? c["@type"] : [c?.["@type"]];
        if (!types.includes("Recipe")) continue;
        const ingredients: ParsedRecipe["ingredients"] = (c.recipeIngredient ?? []).map((line: string) => {
          const trimmed = String(line).trim();
          // crude parse: leading number(s) + unit + rest
          const match = trimmed.match(/^([\d./\s,]+)?\s*([a-zA-Z]+)?\s*(.+)$/);
          if (match) {
            const qtyRaw = match[1]?.trim();
            const unit = match[2]?.trim() || null;
            const name = match[3]?.trim() || trimmed;
            const quantity = qtyRaw ? parseQuantity(qtyRaw) : null;
            return { name, quantity, unit };
          }
          return { name: trimmed, quantity: null, unit: null };
        });
        const yieldRaw = c.recipeYield;
        const servings =
          typeof yieldRaw === "number"
            ? yieldRaw
            : Array.isArray(yieldRaw)
            ? Number(String(yieldRaw[0]).match(/\d+/)?.[0]) || null
            : Number(String(yieldRaw ?? "").match(/\d+/)?.[0]) || null;
        const instructions = formatInstructions(c.recipeInstructions);
        return {
          name: String(c.name ?? "Imported recipe"),
          servings,
          instructions,
          ingredients,
          source: { method: "json-ld" },
        };
      }
    } catch {
      // ignore parse errors and continue
    }
  }
  return null;
};

const parseQuantity = (s: string): number | null => {
  const cleaned = s.replace(/,/g, ".").trim();
  // simple fraction "1/2"
  const fracMatch = cleaned.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fracMatch) return Number(fracMatch[1]) / Number(fracMatch[2]);
  // mixed "1 1/2"
  const mixedMatch = cleaned.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixedMatch) return Number(mixedMatch[1]) + Number(mixedMatch[2]) / Number(mixedMatch[3]);
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
};

const formatInstructions = (raw: any): string | null => {
  if (!raw) return null;
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) {
    return raw
      .map((step) => (typeof step === "string" ? step : step?.text ?? step?.name ?? ""))
      .filter(Boolean)
      .join("\n\n");
  }
  if (raw?.text) return raw.text;
  return null;
};

const stripToText = (html: string): string => {
  // Quick text extraction for AI fallback. Removes scripts/styles, then strips tags.
  const noScript = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "");
  const text = noScript.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  return text.slice(0, 8000);
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url, text } = await req.json();
    if (!url && !text) {
      return new Response(JSON.stringify({ error: "Provide a url or text" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let html: string | null = null;
    let plain: string | null = text ?? null;

    if (url) {
      try {
        html = await fetchHtml(url);
        const fromJsonLd = tryParseJsonLd(html);
        if (fromJsonLd) {
          fromJsonLd.source = { ...(fromJsonLd.source ?? { method: "json-ld" }), url };
          return new Response(JSON.stringify(fromJsonLd), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        plain = stripToText(html);
      } catch (err) {
        if (!plain) throw err;
      }
    }

    if (!plain) {
      return new Response(JSON.stringify({ error: "No content to parse" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are a recipe extractor. From the text the user provides (which may be a recipe page, social post, or plain text), extract a structured recipe.

Rules:
- If multiple recipes are present, pick the most complete one.
- Ingredients should each have a name, a numeric quantity if stated, and a unit if stated. Use null when not stated.
- Servings: integer if stated, else null.
- Instructions: a single string with steps separated by blank lines (preserve numbering if present).
- Do not invent ingredients. If the text isn't a recipe, return an empty ingredients array and explain in the name field with prefix "[NOT A RECIPE]".`;

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
          { role: "user", content: plain },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_recipe",
              description: "Return the structured recipe extracted from the text.",
              parameters: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  servings: { type: ["integer", "null"] },
                  instructions: { type: ["string", "null"] },
                  ingredients: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        quantity: { type: ["number", "null"] },
                        unit: { type: ["string", "null"] },
                      },
                      required: ["name", "quantity", "unit"],
                    },
                  },
                },
                required: ["name", "servings", "instructions", "ingredients"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_recipe" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const errBody = await response.text();
      console.error("AI gateway error:", status, errBody);
      return new Response(
        JSON.stringify({ error: status === 429 ? "Rate limited." : status === 402 ? "AI credits exhausted." : "AI service unavailable" }),
        { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments) as ParsedRecipe;
      parsed.source = { method: "ai", url: url || undefined };
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Could not parse AI response" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("import-recipe error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
