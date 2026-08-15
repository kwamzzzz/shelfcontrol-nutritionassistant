import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type FeedbackCategory = "bug" | "idea" | "general";
export type FeedbackStatus = "new" | "reviewed" | "resolved";

export interface FeedbackRow {
  id: string;
  user_id: string;
  category: string;
  rating: number | null;
  message: string;
  page_path: string | null;
  screenshot_path: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

export interface NewFeedback {
  category: FeedbackCategory;
  rating: number | null;
  message: string;
  page_path?: string | null;
  screenshot_path?: string | null;
}

/** The user's own submissions (admins see everything through the admin view). */
export const useMyFeedback = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["feedback", "mine", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feedback")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as FeedbackRow[];
    },
  });
};

export const useSubmitFeedback = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: NewFeedback) => {
      if (!user) throw new Error("Please sign in to send feedback.");
      const { error } = await supabase.from("feedback").insert({
        user_id: user.id,
        category: input.category,
        rating: input.rating,
        message: input.message.trim(),
        page_path: input.page_path ?? null,
        screenshot_path: input.screenshot_path ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback"] });
      queryClient.invalidateQueries({ queryKey: ["admin-feedback"] });
    },
  });
};

/** Admin-only: every submission. RLS keeps non-admins from reading others' rows. */
export const useAllFeedback = (enabled: boolean) =>
  useQuery({
    queryKey: ["admin-feedback"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feedback")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as FeedbackRow[];
    },
  });

export const useUpdateFeedback = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      admin_notes,
    }: { id: string; status?: FeedbackStatus; admin_notes?: string }) => {
      const patch: Record<string, unknown> = {};
      if (status) patch.status = status;
      if (admin_notes !== undefined) patch.admin_notes = admin_notes;
      const { error } = await supabase.from("feedback").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-feedback"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });
};

export const useDeleteFeedback = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("feedback").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-feedback"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });
};
