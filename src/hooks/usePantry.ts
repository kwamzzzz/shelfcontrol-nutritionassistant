import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGroupContext } from "@/contexts/GroupContext";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type Item = Tables<"items">;
export type InventoryRow = Tables<"inventory"> & { items: Item };

export const useItems = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["items", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Item[];
    },
    enabled: !!user,
  });
};

export const useCreateItem = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (item: Omit<TablesInsert<"items">, "user_id">) => {
      const { data, error } = await supabase
        .from("items")
        .insert({ ...item, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["items"] }),
  });
};

export const useUpdateItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Item> & { id: string }) => {
      const { error } = await supabase.from("items").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["items"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
};

export const useDeleteItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["items"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
};

export const useInventory = () => {
  const { user } = useAuth();
  const { activeGroupId } = useGroupContext();
  return useQuery({
    queryKey: ["inventory", user?.id, activeGroupId],
    queryFn: async () => {
      let query = supabase
        .from("inventory")
        .select("*, items(*)")
        .order("added_at", { ascending: false });

      if (activeGroupId) {
        query = query.eq("group_id", activeGroupId);
      } else {
        query = query.is("group_id", null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as InventoryRow[];
    },
    enabled: !!user,
  });
};

export const useCreateInventory = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { activeGroupId } = useGroupContext();
  return useMutation({
    mutationFn: async (entry: Omit<TablesInsert<"inventory">, "user_id">) => {
      const { data, error } = await supabase
        .from("inventory")
        .insert({ ...entry, user_id: user!.id, group_id: activeGroupId })
        .select("*, items(*)")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventory"] }),
  });
};

export const useUpdateInventory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Tables<"inventory">> & { id: string }) => {
      const { error } = await supabase.from("inventory").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventory"] }),
  });
};

export const useDeleteInventory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("inventory").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventory"] }),
  });
};
