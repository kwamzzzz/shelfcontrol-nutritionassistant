import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Resolves a list of user IDs into a Map<userId, displayName>.
 * Only fetches when userIds array is non-empty.
 */
export const useProfileNames = (userIds: string[]) => {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];

  return useQuery({
    queryKey: ["profile_names", uniqueIds.sort().join(",")],
    queryFn: async () => {
      if (!uniqueIds.length) return new Map<string, string>();
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", uniqueIds);
      return new Map(
        (data ?? []).map((p) => [p.id, p.full_name ?? "Unknown"])
      );
    },
    enabled: uniqueIds.length > 0,
    staleTime: 60_000,
  });
};
