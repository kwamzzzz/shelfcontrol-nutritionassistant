import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ContextSnapshot {
  cuisinePreferences?: string[];
  goal?: { calorie_goal?: number | null; protein_goal?: number | null; carbs_goal?: number | null; fat_goal?: number | null } | null;
  recentDays?: Array<{
    date: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    items: string[];
  }>;
  weighIns?: Array<{ date: string; weight_kg: number }>;
  symptoms?: Array<{ date: string; mood: number | null; energy: number | null; digestion: number | null; notes: string | null }>;
  pantryHighlights?: { totalItems: number; expiringSoon: string[]; expired: string[] };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const messages: ChatMessage[] = Array.isArray(body.messages) ? body.messages : [];
    const context: ContextSnapshot = body.context ?? {};

    if (messages.length === 0) {
      return new Response(JSON.stringify({ error: "No messages provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are Shelf Coach, a warm, practical nutrition and wellness coach.

Your role:
- Give concise, actionable advice grounded in the user's actual data below.
- Be conversational. Two to four sentences per reply unless the user asks for a plan.
- Connect dots: relate symptoms to recent meals, weight trends to calorie patterns, etc.
- Respect cuisine preferences when suggesting foods.
- Never invent data — only reference what's provided.

Boundaries:
- General wellness only. Frame observations as "patterns I notice" or "you might consider", never "you should treat" or "this is caused by".
- For anything that sounds medical (pain, persistent symptoms, medications), suggest the user check with a clinician.
- Avoid being preachy or lecturing.

USER CONTEXT:
${formatContext(context)}`;

    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: apiMessages,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const text = await response.text();
      console.error("AI gateway error:", status, text);
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
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const reply: string = data.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("chat-coach error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function formatContext(c: ContextSnapshot): string {
  const lines: string[] = [];

  if (c.cuisinePreferences?.length) {
    lines.push(`Cuisine preferences: ${c.cuisinePreferences.join(", ")}`);
  }

  if (c.goal) {
    const g = c.goal;
    const parts: string[] = [];
    if (g.calorie_goal) parts.push(`${g.calorie_goal} kcal`);
    if (g.protein_goal) parts.push(`${g.protein_goal}g protein`);
    if (g.carbs_goal) parts.push(`${g.carbs_goal}g carbs`);
    if (g.fat_goal) parts.push(`${g.fat_goal}g fat`);
    if (parts.length) lines.push(`Daily goal: ${parts.join(", ")}`);
  }

  if (c.recentDays?.length) {
    lines.push(`Recent days (most recent first):`);
    for (const d of c.recentDays.slice(0, 7)) {
      const items = d.items.slice(0, 6).join(", ");
      lines.push(
        `  - ${d.date}: ${Math.round(d.calories)} kcal, ${Math.round(d.protein)}g P / ${Math.round(d.carbs)}g C / ${Math.round(d.fat)}g F${items ? ` — ${items}` : ""}`,
      );
    }
  }

  if (c.weighIns?.length) {
    const w = c.weighIns.slice(0, 5);
    lines.push(`Recent weigh-ins: ${w.map((x) => `${x.date} ${x.weight_kg}kg`).join("; ")}`);
  }

  if (c.symptoms?.length) {
    lines.push(`Recent symptoms:`);
    for (const s of c.symptoms.slice(0, 8)) {
      const parts: string[] = [];
      if (s.mood != null) parts.push(`mood ${s.mood}/5`);
      if (s.energy != null) parts.push(`energy ${s.energy}/5`);
      if (s.digestion != null) parts.push(`digestion ${s.digestion}/5`);
      if (s.notes) parts.push(`"${s.notes}"`);
      lines.push(`  - ${s.date}: ${parts.join(", ") || "(no ratings)"}`);
    }
  }

  if (c.pantryHighlights) {
    const p = c.pantryHighlights;
    lines.push(
      `Pantry: ${p.totalItems} items` +
        (p.expiringSoon.length ? `, expiring soon: ${p.expiringSoon.slice(0, 5).join(", ")}` : "") +
        (p.expired.length ? `, expired: ${p.expired.slice(0, 5).join(", ")}` : ""),
    );
  }

  return lines.length ? lines.join("\n") : "(No data yet — encourage logging.)";
}
