import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import type { ItemOverrides } from "@/components/purchases/ItemDetailsSection";

export type Purchase = Tables<"purchases">;
export type PurchaseItem = Tables<"purchase_items"> & { items: Tables<"items"> };
export type PurchaseWithItems = Purchase & { purchase_items: PurchaseItem[] };

export const usePurchases = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["purchases", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchases")
        .select("*, purchase_items(*, items(*))")
        .order("purchased_at", { ascending: false });
      if (error) throw error;
      return data as PurchaseWithItems[];
    },
    enabled: !!user,
  });
};

export type NewPurchaseLineItem = {
  item_id: string;
  quantity: number;
  unit: string;
  line_total: number | null;
  restock: boolean;
  storage_location?: string;
  expiry_date?: string;
  sealed_status?: string;
  opened_date?: string;
  itemOverrides?: ItemOverrides;
};

export const useCreatePurchase = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      store_name: string | null;
      purchased_at: string;
      notes: string | null;
      total_cost: number | null;
      line_items: NewPurchaseLineItem[];
    }) => {
      const { data: purchase, error: pErr } = await supabase
        .from("purchases")
        .insert({
          user_id: user!.id,
          store_name: input.store_name,
          purchased_at: input.purchased_at,
          notes: input.notes,
          total_cost: input.total_cost,
        })
        .select()
        .single();
      if (pErr) throw pErr;

      if (input.line_items.length > 0) {
        const lineRows = input.line_items.map((li) => ({
          user_id: user!.id,
          purchase_id: purchase.id,
          item_id: li.item_id,
          quantity: li.quantity,
          unit: li.unit,
          unit_price: li.line_total,
          expiry_date: li.expiry_date || null,
          sealed_status: li.sealed_status || "sealed",
          opened_date: li.opened_date || null,
        }));
        const { error: liErr } = await supabase.from("purchase_items").insert(lineRows);
        if (liErr) throw liErr;

        // Restock — add to inventory with purchase_id for reconciliation
        const restockItems = input.line_items.filter((li) => li.restock);
        if (restockItems.length > 0) {
          const inventoryRows = restockItems.map((li) => ({
            user_id: user!.id,
            item_id: li.item_id,
            quantity: li.quantity,
            unit: li.unit,
            storage_location: li.storage_location || null,
            expiry_date: li.expiry_date || null,
            purchase_id: purchase.id,
          }));
          const { error: invErr } = await supabase.from("inventory").insert(inventoryRows);
          if (invErr) throw invErr;
        }
      }

      return purchase;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchases"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
};

export const useUpdatePurchase = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      store_name: string | null;
      purchased_at: string;
      notes: string | null;
      total_cost: number | null;
      line_items: NewPurchaseLineItem[];
    }) => {
      // 1. Update the purchase record
      const { error: pErr } = await supabase
        .from("purchases")
        .update({
          store_name: input.store_name,
          purchased_at: input.purchased_at,
          notes: input.notes,
          total_cost: input.total_cost,
        })
        .eq("id", input.id);
      if (pErr) throw pErr;

      // 2. Delete old line items and insert new ones
      const { error: dErr } = await supabase.from("purchase_items").delete().eq("purchase_id", input.id);
      if (dErr) throw dErr;

      // 3. Delete old inventory entries linked to this purchase (reconciliation)
      const { error: invDelErr } = await supabase.from("inventory").delete().eq("purchase_id", input.id);
      if (invDelErr) throw invDelErr;

      // 4. Insert updated line items
      if (input.line_items.length > 0) {
        const lineRows = input.line_items.map((li) => ({
          user_id: user!.id,
          purchase_id: input.id,
          item_id: li.item_id,
          quantity: li.quantity,
          unit: li.unit,
          unit_price: li.line_total,
          expiry_date: li.expiry_date || null,
          sealed_status: li.sealed_status || "sealed",
          opened_date: li.opened_date || null,
        }));
        const { error: liErr } = await supabase.from("purchase_items").insert(lineRows);
        if (liErr) throw liErr;

        // 5. Re-create inventory for restocked items
        const restockItems = input.line_items.filter((li) => li.restock);
        if (restockItems.length > 0) {
          const inventoryRows = restockItems.map((li) => ({
            user_id: user!.id,
            item_id: li.item_id,
            quantity: li.quantity,
            unit: li.unit,
            storage_location: li.storage_location || null,
            expiry_date: li.expiry_date || null,
            purchase_id: input.id,
          }));
          const { error: invErr } = await supabase.from("inventory").insert(inventoryRows);
          if (invErr) throw invErr;
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchases"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
};

export const useDeletePurchase = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error: liErr } = await supabase.from("purchase_items").delete().eq("purchase_id", id);
      if (liErr) throw liErr;
      const { error } = await supabase.from("purchases").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["purchases"] }),
  });
};
