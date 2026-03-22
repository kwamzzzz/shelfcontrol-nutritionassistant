import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGroupContext } from "@/contexts/GroupContext";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type ShoppingItem = Tables<"shopping_list"> & {
  completed_by?: string | null;
  completed_at?: string | null;
};

export const useShoppingList = () => {
  const { user } = useAuth();
  const { activeGroupId } = useGroupContext();
  return useQuery({
    queryKey: ["shopping_list", user?.id, activeGroupId],
    queryFn: async () => {
      let query = supabase
        .from("shopping_list")
        .select("*")
        .order("is_purchased")
        .order("created_at", { ascending: false });

      if (activeGroupId) {
        query = query.eq("group_id", activeGroupId);
      } else {
        query = query.is("group_id", null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ShoppingItem[];
    },
    enabled: !!user,
  });
};

export const useCreateShoppingItem = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { activeGroupId } = useGroupContext();
  return useMutation({
    mutationFn: async (item: Omit<TablesInsert<"shopping_list">, "user_id">) => {
      const { data, error } = await supabase
        .from("shopping_list")
        .insert({ ...item, user_id: user!.id, group_id: activeGroupId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shopping_list"] }),
  });
};

export const useUpdateShoppingItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ShoppingItem> & { id: string }) => {
      const { error } = await supabase.from("shopping_list").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shopping_list"] }),
  });
};

export const useToggleShoppingItem = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, is_purchased }: { id: string; is_purchased: boolean }) => {
      const updates: Record<string, any> = {
        is_purchased,
        completed_by: is_purchased ? user!.id : null,
        completed_at: is_purchased ? new Date().toISOString() : null,
      };
      const { error } = await supabase.from("shopping_list").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shopping_list"] }),
  });
};

export const useDeleteShoppingItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("shopping_list").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shopping_list"] }),
  });
};
