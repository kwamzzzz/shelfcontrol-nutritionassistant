import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface GroupInvite {
  id: string;
  group_id: string;
  email: string;
  invited_by: string;
  status: string;
  invite_token: string;
  created_at: string;
  expires_at: string;
}

export const useGroupInvites = (groupId: string | null) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const invitesQuery = useQuery({
    queryKey: ["group_invites", groupId],
    queryFn: async () => {
      if (!groupId) return [];
      const { data, error } = await supabase
        .from("group_invites")
        .select("*")
        .eq("group_id", groupId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as GroupInvite[];
    },
    enabled: !!groupId && !!user,
  });

  const createInvite = useMutation({
    mutationFn: async ({ groupId, email }: { groupId: string; email: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("group_invites")
        .insert({ group_id: groupId, email, invited_by: user.id })
        .select()
        .single();
      if (error) {
        console.error("Failed to create invite:", error);
        throw new Error(error.message);
      }
      return data as GroupInvite;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group_invites", groupId] });
    },
  });

  const revokeInvite = useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase
        .from("group_invites")
        .update({ status: "revoked" })
        .eq("id", inviteId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group_invites", groupId] });
    },
  });

  return {
    invites: invitesQuery.data ?? [],
    isLoading: invitesQuery.isLoading,
    createInvite,
    revokeInvite,
  };
};

/** Hook for the /invite/:token acceptance page */
export const useInviteByToken = (token: string | undefined) => {
  return useQuery({
    queryKey: ["invite_token", token],
    queryFn: async () => {
      if (!token) return null;
      const { data, error } = await supabase
        .from("group_invites")
        .select("*, groups(name, type)")
        .eq("invite_token", token)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!token,
  });
};
