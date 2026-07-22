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
        .eq("status", "active") // archived/consumed/discarded items leave the active pantry view
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

/**
 * Archive a set of active inventory rows (bulk pantry cleanup). Items are marked
 * with a status + a shared cleanup_batch (so the whole batch can be undone) and
 * disappear from the active pantry — but rows, images, catalogue and purchase
 * history are preserved.
 */
export const useArchiveInventory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      ids, batch, status = "archived", reason = "pantry cleanup",
    }: { ids: string[]; batch: string; status?: string; reason?: string }) => {
      if (ids.length === 0) return;
      const { error } = await supabase
        .from("inventory")
        .update({ status, archived_at: new Date().toISOString(), archive_reason: reason, cleanup_batch: batch })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["inventory-all"] });
    },
  });
};

/** Restore every item archived in a given cleanup batch back to the active pantry. */
export const useUndoCleanup = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (batch: string) => {
      const { error } = await supabase
        .from("inventory")
        .update({ status: "active", archived_at: null, archive_reason: null, cleanup_batch: null })
        .eq("cleanup_batch", batch);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["inventory-all"] });
    },
  });
};

/** All inventory rows incl. archived/consumed/discarded (with purchase date) — for statistics. */
export const useAllInventory = () => {
  const { user } = useAuth();
  const { activeGroupId } = useGroupContext();
  return useQuery({
    queryKey: ["inventory-all", user?.id, activeGroupId],
    queryFn: async () => {
      let query = supabase.from("inventory").select("*, items(*), purchases(purchased_at)");
      query = activeGroupId ? query.eq("group_id", activeGroupId) : query.is("group_id", null);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as (InventoryRow & { purchases: { purchased_at: string } | null })[];
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
