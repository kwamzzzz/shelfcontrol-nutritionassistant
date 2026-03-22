import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface MyInvite {
  id: string;
  group_id: string;
  email: string;
  invited_by: string;
  status: string;
  invite_token: string;
  created_at: string;
  expires_at: string;
  groups: { name: string; type: string | null } | null;
}

export const useMyInvites = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const invitesQuery = useQuery({
    queryKey: ["my_invites", user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const { data, error } = await supabase
        .from("group_invites")
        .select("*, groups(name, type)")
        .eq("email", user.email)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MyInvite[];
    },
    enabled: !!user?.email,
  });

  const pendingInvites = (invitesQuery.data ?? []).filter(
    (i) => i.status === "pending" && new Date(i.expires_at) > new Date()
  );

  const acceptInvite = useMutation({
    mutationFn: async (invite: MyInvite) => {
      if (!user) throw new Error("Not authenticated");

      // Add to group
      const { error: memberErr } = await supabase
        .from("group_members")
        .insert({ group_id: invite.group_id, user_id: user.id, role: "member" });

      if (memberErr && !memberErr.message.includes("duplicate")) {
        throw new Error(memberErr.message);
      }

      // Mark accepted
      const { error: updateErr } = await supabase
        .from("group_invites")
        .update({ status: "accepted" })
        .eq("id", invite.id);

      if (updateErr) throw new Error(updateErr.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my_invites"] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });

  const declineInvite = useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase
        .from("group_invites")
        .update({ status: "declined" })
        .eq("id", inviteId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my_invites"] });
    },
  });

  return {
    invites: invitesQuery.data ?? [],
    pendingInvites,
    pendingCount: pendingInvites.length,
    isLoading: invitesQuery.isLoading,
    acceptInvite,
    declineInvite,
  };
};
