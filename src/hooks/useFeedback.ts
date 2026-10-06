import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import type { FeedbackContext, FeedbackTarget } from "@/lib/feedback-capture";
import type { FeedbackStatus } from "@/lib/feedback-status";

export type FeedbackCategory = "bug" | "idea" | "general";
export {
  FEEDBACK_STATUSES, statusLabel, statusStyles, type FeedbackStatus,
} from "@/lib/feedback-status";

export interface FeedbackRow {
  id: string;
  user_id: string;
  category: string;
  rating: number | null;
  message: string;
  page_path: string | null;
  screen: string;
  target: FeedbackTarget | null;
  context: Partial<FeedbackContext>;
  screenshot_path: string | null;
  status: string;
  admin_notes: string | null;
  status_changed_at: string | null;
  replied_at: string | null;
  created_at: string;
}

export interface NewFeedback {
  category: FeedbackCategory;
  rating: number | null;
  message: string;
  page_path?: string | null;
  screen?: string;
  target?: FeedbackTarget | null;
  context?: FeedbackContext;
  /**
   * The screen as a JPEG data URL, possibly still being drawn. The feedback is
   * saved without waiting for it; the picture is uploaded once it is ready.
   */
  screenshot?: Promise<string | null> | null;
}

/** Stores the picture in the private item-images bucket under the sender's folder. */
async function uploadScreenshot(path: string, dataUrl: string) {
  const blob = await (await fetch(dataUrl)).blob();
  const { error } = await supabase.storage
    .from("item-images")
    .upload(path, blob, { contentType: "image/jpeg", upsert: false });
  if (error) throw error;
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
      return (data ?? []) as unknown as FeedbackRow[];
    },
  });
};

export const useSubmitFeedback = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: NewFeedback) => {
      if (!user) throw new Error("Please sign in to send feedback.");
      // The picture's place is fixed now so the row can point at it before
      // the picture exists; a picture that never arrives just shows nothing.
      const shotPath = input.screenshot ? `${user.id}/feedback/${crypto.randomUUID()}.jpg` : null;
      const screenshot_path = shotPath
        ? supabase.storage.from("item-images").getPublicUrl(shotPath).data.publicUrl
        : null;
      const { error } = await supabase.from("feedback").insert({
        user_id: user.id,
        category: input.category,
        rating: input.rating,
        message: input.message.trim(),
        page_path: input.page_path ?? null,
        screen: input.screen ?? "",
        target: (input.target ?? null) as unknown as Json,
        context: (input.context ?? {}) as unknown as Json,
        screenshot_path,
      });
      if (error) throw error;
      if (shotPath && input.screenshot) {
        void input.screenshot
          .then((url) => url && uploadScreenshot(shotPath, url))
          .catch((err) => console.warn("Feedback picture was not saved:", err));
      }
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
      return (data ?? []) as unknown as FeedbackRow[];
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
