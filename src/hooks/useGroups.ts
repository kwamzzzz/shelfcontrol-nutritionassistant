import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Group {
  id: string;
  name: string;
  type: string | null;
  created_by: string;
  created_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: string;
  joined_at: string;
}

export interface GroupMemberWithProfile extends GroupMember {
  profile?: { full_name: string | null; email?: string } | null;
}

export const useGroups = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const groupsQuery = useQuery({
    queryKey: ["groups", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("groups")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Group[];
    },
    enabled: !!user,
  });

  const createGroup = useMutation({
    mutationFn: async ({ name, type }: { name: string; type?: string }) => {
      if (!user) throw new Error("Not authenticated");
      
      // Step 1: Create the group
      const { data: group, error: groupError } = await supabase
        .from("groups")
        .insert({ name, type: type || null, created_by: user.id })
        .select()
        .single();
      if (groupError) {
        console.error("Failed to insert group:", groupError);
        throw new Error(`Group creation failed: ${groupError.message}`);
      }

      // Step 2: Add creator as admin member
      const { error: memberError } = await supabase
        .from("group_members")
        .insert({ group_id: group.id, user_id: user.id, role: "admin" });
      if (memberError) {
        console.error("Failed to insert group_member:", memberError);
        // Clean up the orphaned group
        await supabase.from("groups").delete().eq("id", group.id);
        throw new Error(`Member creation failed: ${memberError.message}`);
      }

      return group as Group;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });

  const deleteGroup = useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase.from("groups").delete().eq("id", groupId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });

  return {
    groups: groupsQuery.data ?? [],
    isLoading: groupsQuery.isLoading,
    createGroup,
    deleteGroup,
  };
};

export const useGroupMembers = (groupId: string | null) => {
  return useQuery({
    queryKey: ["group_members", groupId],
    queryFn: async () => {
      if (!groupId) return [];
      // Fetch members
      const { data: members, error } = await supabase
        .from("group_members")
        .select("*")
        .eq("group_id", groupId);
      if (error) throw error;

      // Fetch profiles for all member user_ids
      const userIds = (members as GroupMember[]).map((m) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      const profileMap = new Map(
        (profiles ?? []).map((p) => [p.id, p])
      );

      return (members as GroupMember[]).map((m) => ({
        ...m,
        profile: profileMap.get(m.user_id) ?? null,
      })) as GroupMemberWithProfile[];
    },
    enabled: !!groupId,
  });
};
