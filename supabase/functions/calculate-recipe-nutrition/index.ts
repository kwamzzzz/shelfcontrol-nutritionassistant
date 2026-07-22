import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { recipe_id } = await req.json();
    if (!recipe_id) {
      return new Response(JSON.stringify({ error: "recipe_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: recipe, error: rErr } = await admin
      .from("recipes")
      .select("id, name, servings, user_id, recipe_ingredients(quantity, unit, items(name))")
      .eq("id", recipe_id)
      .single();
    if (rErr || !recipe) throw rErr ?? new Error("Recipe not found");
    if (recipe.user_id !== userData.user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const servings = recipe.servings ?? 1;
    const ingredientLines = (recipe.recipe_ingredients ?? [])
      .map((ing: any) => {
        const q = ing.quantity ?? "";
        const u = ing.unit ?? "";
        const n = ing.items?.name ?? "ingredient";
        return `- ${q} ${u} ${n}`.replace(/\s+/g, " ").trim();
      })
      .join("\n");

    if (!ingredientLines) {
      return new Response(
        JSON.stringify({ error: "Recipe has no ingredients to analyze" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const systemPrompt = `You are a careful nutrition estimator. Given a recipe's ingredient list and total servings, estimate the PER-SERVING nutrition (calories, macros, fiber, sugar, sodium). Use standard USDA-style reference values. Assume reasonable defaults for cooking oil and salt if not specified, and mention such assumptions in notes. Return strict JSON via the provided function.`;

    const userPrompt = `Recipe: ${recipe.name}\nTotal servings: ${servings}\nIngredients:\n${ingredientLines}\n\nCompute PER-SERVING nutrition (divide totals by servings).`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_recipe_nutrition",
              description: "Return per-serving nutrition estimate.",
              parameters: {
                type: "object",
                properties: {
                  calories: { type: "number", description: "kcal per serving" },
                  protein_g: { type: "number" },
                  carbs_g: { type: "number" },
                  fat_g: { type: "number" },
                  fiber_g: { type: "number" },
                  sugar_g: { type: "number" },
                  sodium_mg: { type: "number" },
                  notes: { type: "string" },
                },
                required: [
                  "calories",
                  "protein_g",
                  "carbs_g",
                  "fat_g",
                  "fiber_g",
                  "sugar_g",
                  "sodium_mg",
                  "notes",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_recipe_nutrition" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const text = await response.text();
      console.error("AI gateway error:", status, text);
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "Could not parse AI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const result = JSON.parse(toolCall.function.arguments);

    const { error: uErr } = await admin
      .from("recipes")
      .update({
        calories_per_serving: result.calories,
        protein_g_per_serving: result.protein_g,
        carbs_g_per_serving: result.carbs_g,
        fat_g_per_serving: result.fat_g,
        fiber_g_per_serving: result.fiber_g,
        sugar_g_per_serving: result.sugar_g,
        sodium_mg_per_serving: result.sodium_mg,
        nutrition_notes: result.notes ?? null,
        nutrition_calculated_at: new Date().toISOString(),
      })
      .eq("id", recipe_id);
    if (uErr) throw uErr;

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("calculate-recipe-nutrition error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});