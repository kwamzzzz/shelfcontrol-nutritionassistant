import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/** True when the signed-in account holds the admin role (checked server-side). */
export const useIsAdmin = () => {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: user!.id,
        _role: "admin",
      });
      if (error) throw error;
      return !!data;
    },
  });

  return { isAdmin: query.data === true, isLoading: query.isLoading };
};

export interface AdminUsageStats {
  users: number;
  items: number;
  inventory: number;
  recipes: number;
  groups: number;
  purchases: number;
  shopping_items: number;
  feedback_total: number;
  feedback_new: number;
  new_users_30d: number;
}

export const useAdminStats = (enabled: boolean) =>
  useQuery({
    queryKey: ["admin-stats"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_usage_stats");
      if (error) throw error;
      return data as unknown as AdminUsageStats;
    },
  });

export const useAdminUsers = (enabled: boolean) =>
  useQuery({
    queryKey: ["admin-users"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_users");
      if (error) throw error;
      return data ?? [];
    },
  });
