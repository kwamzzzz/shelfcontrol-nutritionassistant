import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { insights, stats, mode } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are a smart food & pantry assistant. You analyze pantry, purchase, consumption, and waste data to give concise, helpful, human-like summaries.

Rules:
- Be conversational, warm, and practical
- Keep the overall summary to 2-3 sentences max
- Keep the weekly report sections to 1-2 sentences each
- Generate 2-4 actionable suggestions with specific paths
- If in group mode, highlight collaboration patterns
- Never invent data — only reference what's provided
- Use the person's actual item names and numbers`;

    const userPrompt = `Here is the user's current data snapshot:

MODE: ${mode === "group" ? "Group/Household" : "Personal"}

ACTIVE INSIGHTS (${insights.length} total):
${insights.map((i: any) => `- [${i.severity}] ${i.title}: ${i.description}`).join("\n")}

STATS:
- Pantry items: ${stats.pantryCount}
- Expired items: ${stats.expiredCount}
- Expiring soon: ${stats.expiringCount}
- Total purchases this month: ${stats.monthlyPurchaseCount} (${stats.monthlySpend})
- This week's waste count: ${stats.weekWasteCount}
- Total waste items: ${stats.totalWasteCount}
- Top wasted item: ${stats.topWastedItem || "none"}
- Food categories in pantry: ${stats.categoryCount}
- Items missing nutrition data: ${stats.missingNutritionCount}

Please respond with a JSON object using this exact structure:
{
  "summary": "2-3 sentence overview of their food situation right now",
  "weeklyReport": {
    "waste": "1-2 sentences on waste behavior",
    "spending": "1-2 sentences on spending",
    "nutrition": "1-2 sentences on nutrition gaps",
    "recommendation": "1 key recommendation"
  },
  "suggestions": [
    { "text": "actionable suggestion text", "actionPath": "/relevant-page" }
  ]
}`;

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
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "provide_intelligence_summary",
              description: "Return an AI-generated intelligence summary with weekly report and suggestions",
              parameters: {
                type: "object",
                properties: {
                  summary: { type: "string", description: "2-3 sentence overview" },
                  weeklyReport: {
                    type: "object",
                    properties: {
                      waste: { type: "string" },
                      spending: { type: "string" },
                      nutrition: { type: "string" },
                      recommendation: { type: "string" },
                    },
                    required: ["waste", "spending", "nutrition", "recommendation"],
                  },
                  suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        text: { type: "string" },
                        actionPath: { type: "string" },
                      },
                      required: ["text", "actionPath"],
                    },
                  },
                },
                required: ["summary", "weeklyReport", "suggestions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "provide_intelligence_summary" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", status, text);
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const result = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback: try parsing content directly
    const content = data.choices?.[0]?.message?.content ?? "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return new Response(jsonMatch[0], {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Could not parse AI response" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-intelligence error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
