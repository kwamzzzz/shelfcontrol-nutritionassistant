import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNutritionData } from "@/hooks/useNutrition";
import { useNutritionGoals } from "@/hooks/useNutritionGoals";
import { useWeighIns } from "@/hooks/useWeighIns";
import { useSymptoms } from "@/hooks/useSymptoms";
import { useInventory } from "@/hooks/usePantry";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, startOfDay } from "date-fns";
import { getExpiryStatus } from "@/lib/pantry-utils";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export const useChatCoach = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { allLogs, computeNutrients } = useNutritionData();
  const { data: goals } = useNutritionGoals();
  const { data: weighIns } = useWeighIns();
  const { data: symptoms } = useSymptoms(20);
  const { data: inventory } = useInventory();

  const { data: profile } = useQuery({
    queryKey: ["profile-for-coach", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("cuisine_preferences")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const buildContext = useCallback(() => {
    const dayMap = new Map<string, { calories: number; protein: number; carbs: number; fat: number; items: Set<string> }>();
    for (const log of allLogs ?? []) {
      const day = format(startOfDay(parseISO(log.consumed_at)), "yyyy-MM-dd");
      const n = computeNutrients(log.items, Number(log.quantity));
      const entry = dayMap.get(day) ?? { calories: 0, protein: 0, carbs: 0, fat: 0, items: new Set<string>() };
      entry.calories += n.calories;
      entry.protein += n.protein;
      entry.carbs += n.carbs;
      entry.fat += n.fat;
      if (log.items?.name) entry.items.add(log.items.name);
      dayMap.set(day, entry);
    }
    const recentDays = Array.from(dayMap.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .slice(0, 7)
      .map(([date, e]) => ({
        date,
        calories: e.calories,
        protein: e.protein,
        carbs: e.carbs,
        fat: e.fat,
        items: Array.from(e.items),
      }));

    const expiringSoon = (inventory ?? [])
      .filter((r) => getExpiryStatus(r.expiry_date) === "expiring")
      .map((r) => r.items?.name ?? "Unknown");
    const expired = (inventory ?? [])
      .filter((r) => getExpiryStatus(r.expiry_date) === "expired")
      .map((r) => r.items?.name ?? "Unknown");

    return {
      cuisinePreferences: profile?.cuisine_preferences ?? [],
      goal: goals
        ? {
            calorie_goal: goals.calorie_goal,
            protein_goal: goals.protein_goal,
            carbs_goal: goals.carbs_goal,
            fat_goal: goals.fat_goal,
          }
        : null,
      recentDays,
      weighIns: (weighIns ?? []).slice(0, 5).map((w) => ({
        date: format(parseISO(w.recorded_at), "yyyy-MM-dd"),
        weight_kg: Number(w.weight_kg),
      })),
      symptoms: (symptoms ?? []).slice(0, 8).map((s) => ({
        date: format(parseISO(s.recorded_at), "yyyy-MM-dd"),
        mood: s.mood,
        energy: s.energy,
        digestion: s.digestion,
        notes: s.notes,
      })),
      pantryHighlights: {
        totalItems: inventory?.length ?? 0,
        expiringSoon,
        expired,
      },
    };
  }, [allLogs, computeNutrients, goals, weighIns, symptoms, inventory, profile]);

  const send = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;
      const trimmed = content.trim();
      const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
      setMessages(nextMessages);
      setIsLoading(true);
      setError(null);
      try {
        const { data, error: fnError } = await supabase.functions.invoke("chat-coach", {
          body: {
            messages: nextMessages,
            context: buildContext(),
          },
        });
        if (fnError) throw fnError;
        if (data?.error) throw new Error(data.error);
        const reply: string = (data as any)?.reply ?? "";
        setMessages((prev) => [...prev, { role: "assistant", content: reply || "(no reply)" }]);
      } catch (err: any) {
        setError(err?.message ?? "Failed to reach the coach");
        setMessages((prev) => [...prev, { role: "assistant", content: `Sorry — I couldn't reach the coach right now. (${err?.message ?? "unknown error"})` }]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading, buildContext],
  );

  const reset = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, isLoading, error, send, reset };
};
