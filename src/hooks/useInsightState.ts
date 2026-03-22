import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGroupContext } from "@/contexts/GroupContext";

export type InsightStatus = "active" | "dismissed" | "resolved";

interface InsightStateRow {
  id: string;
  user_id: string;
  group_id: string | null;
  insight_id: string;
  status: InsightStatus;
  created_at: string;
  resolved_at: string | null;
}

export const useInsightStates = () => {
  const { user } = useAuth();
  const { activeGroupId } = useGroupContext();

  return useQuery({
    queryKey: ["insight_state", user?.id, activeGroupId],
    queryFn: async () => {
      let query = supabase
        .from("insight_state")
        .select("*")
        .eq("user_id", user!.id);

      if (activeGroupId) {
        query = query.eq("group_id", activeGroupId);
      } else {
        query = query.is("group_id", null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return new Map((data as InsightStateRow[]).map((r) => [r.insight_id, r]));
    },
    enabled: !!user,
  });
};

export const useDismissInsight = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { activeGroupId } = useGroupContext();

  return useMutation({
    mutationFn: async (insightId: string) => {
      const { error } = await supabase.from("insight_state").upsert(
        {
          user_id: user!.id,
          group_id: activeGroupId,
          insight_id: insightId,
          status: "dismissed",
        },
        { onConflict: "user_id,insight_id,group_id" }
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["insight_state"] }),
  });
};

export const useTrackInsightAction = () => {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ insightId, action }: { insightId: string; action: string }) => {
      const { error } = await supabase.from("insight_actions").insert({
        user_id: user!.id,
        insight_id: insightId,
        action_taken: action,
      });
      if (error) throw error;
    },
  });
};
