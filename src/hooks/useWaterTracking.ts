import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { startOfDay, endOfDay, subDays, format } from "date-fns";

export const useWaterLogs = (date?: Date) => {
  const { user } = useAuth();
  const targetDate = date ?? new Date();

  return useQuery({
    queryKey: ["water_logs", user?.id, targetDate.toDateString()],
    queryFn: async () => {
      const start = startOfDay(targetDate).toISOString();
      const end = endOfDay(targetDate).toISOString();
      const { data, error } = await supabase
        .from("water_logs")
        .select("*")
        .eq("user_id", user!.id)
        .gte("logged_at", start)
        .lte("logged_at", end)
        .order("logged_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useAddWater = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (amount_ml: number) => {
      const { error } = await supabase.from("water_logs").insert({
        user_id: user!.id,
        amount_ml,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["water_logs"] }),
  });
};

export const useDeleteWaterLog = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("water_logs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["water_logs"] }),
  });
};

export const useWeeklyWater = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["water_weekly", user?.id],
    queryFn: async () => {
      const start = startOfDay(subDays(new Date(), 6)).toISOString();
      const { data, error } = await supabase
        .from("water_logs")
        .select("amount_ml, logged_at")
        .eq("user_id", user!.id)
        .gte("logged_at", start)
        .order("logged_at", { ascending: true });
      if (error) throw error;

      const result: { date: string; total: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = subDays(new Date(), i);
        const dayStr = format(d, "yyyy-MM-dd");
        const label = format(d, "EEE");
        const total = (data ?? [])
          .filter((w: any) => format(new Date(w.logged_at), "yyyy-MM-dd") === dayStr)
          .reduce((sum: number, w: any) => sum + w.amount_ml, 0);
        result.push({ date: label, total });
      }
      return result;
    },
    enabled: !!user,
  });
};
