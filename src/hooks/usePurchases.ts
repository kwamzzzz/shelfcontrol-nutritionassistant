import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGroupContext } from "@/contexts/GroupContext";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import type { ItemOverrides } from "@/components/purchases/ItemDetailsSection";

export type Purchase = Tables<"purchases">;
export type PurchaseItem = Tables<"purchase_items"> & { items: Tables<"items"> };
export type PurchaseWithItems = Purchase & { purchase_items: PurchaseItem[] };

export const usePurchases = () => {
  const { user } = useAuth();
  const { activeGroupId } = useGroupContext();
  return useQuery({
    queryKey: ["purchases", user?.id, activeGroupId],
    queryFn: async () => {
      let query = supabase
        .from("purchases")
        .select("*, purchase_items(*, items(*))")
        .order("purchased_at", { ascending: false });

      if (activeGroupId) {
        query = query.eq("group_id", activeGroupId);
      } else {
        query = query.is("group_id", null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PurchaseWithItems[];
    },
    enabled: !!user,
  });
};

export type NewPurchaseLineItem = {
  /** Existing catalog item id. Optional for bulk lines — resolved from `name`. */
  item_id?: string;
  /** Item name used to find-or-create a catalog item when item_id is absent. */
  name?: string;
  quantity: number;
  unit: string;
  line_total: number | null;
  restock: boolean;
  storage_location?: string;
  expiry_date?: string;
  sealed_status?: string;
  opened_date?: string;
  weight?: number | null;
  weight_unit?: string | null;
  notes?: string | null;
  itemOverrides?: ItemOverrides;
};

/**
 * Resolve each line to a catalog item_id. Lines that already carry an item_id
 * are left as-is; lines with only a `name` are matched (case-insensitive) to an
 * existing catalog item, or a new item is created. This is what makes pasting
 * 60+ named items viable — no combobox picking required.
 */
const resolveItemIds = async (
  lineItems: NewPurchaseLineItem[],
  userId: string,
): Promise<NewPurchaseLineItem[]> => {
  const needsResolve = lineItems.filter((li) => !li.item_id && (li.name ?? "").trim());
  if (needsResolve.length === 0) return lineItems;

  const { data: existing, error } = await supabase
    .from("items")
    .select("id, name")
    .eq("user_id", userId);
  if (error) throw error;

  const byName = new Map<string, string>();
  for (const it of existing ?? []) byName.set(it.name.trim().toLowerCase(), it.id);

  // Names not already in the catalog (deduped within this batch).
  const toCreate = new Map<string, { name: string; unit: string }>();
  for (const li of needsResolve) {
    const key = li.name!.trim().toLowerCase();
    if (!byName.has(key) && !toCreate.has(key)) {
      toCreate.set(key, { name: li.name!.trim(), unit: li.unit || "unit" });
    }
  }

  if (toCreate.size > 0) {
    const rows = Array.from(toCreate.values()).map((c) => ({
      user_id: userId,
      name: c.name,
      default_unit: c.unit,
    }));
    const { data: created, error: cErr } = await supabase
      .from("items")
      .insert(rows)
      .select("id, name");
    if (cErr) throw cErr;
    for (const it of created ?? []) byName.set(it.name.trim().toLowerCase(), it.id);
  }

  return lineItems.map((li) => {
    if (li.item_id) return li;
    const key = (li.name ?? "").trim().toLowerCase();
    const id = key ? byName.get(key) : undefined;
    return id ? { ...li, item_id: id } : li;
  });
};

/**
 * Build a purchase_items insert row. The bulk fields (weight/weight_unit/notes)
 * are only included when present, so the insert stays valid on databases where
 * the columns don't exist yet (before the migration is applied) — existing
 * manual purchases keep working, and the new fields activate post-migration.
 */
const buildLineRow = (
  li: NewPurchaseLineItem,
  userId: string,
  purchaseId: string,
): TablesInsert<"purchase_items"> => {
  const row: TablesInsert<"purchase_items"> = {
    user_id: userId,
    purchase_id: purchaseId,
    item_id: li.item_id!,
    quantity: li.quantity,
    unit: li.unit,
    unit_price: li.line_total,
    expiry_date: li.expiry_date || null,
    sealed_status: li.sealed_status || "sealed",
    opened_date: li.opened_date || null,
  };
  if (li.weight != null) row.weight = li.weight;
  if (li.weight_unit) row.weight_unit = li.weight_unit;
  if (li.notes) row.notes = li.notes;
  return row;
};

const updateItemOverrides = async (lineItems: NewPurchaseLineItem[]) => {
  const itemsWithOverrides = lineItems.filter(
    (li) => li.itemOverrides && Object.values(li.itemOverrides).some((v) => v !== undefined)
  );
  for (const li of itemsWithOverrides) {
    if (!li.item_id) continue;
    const o = li.itemOverrides!;
    const update: Record<string, unknown> = {};
    if (o.brand !== undefined) update.brand = o.brand || null;
    if (o.category !== undefined) update.category = o.category || null;
    if (o.calories_per_unit !== undefined) update.calories_per_unit = o.calories_per_unit ?? 0;
    if (o.protein_g !== undefined) update.protein_g = o.protein_g ?? 0;
    if (o.carbs_g !== undefined) update.carbs_g = o.carbs_g ?? 0;
    if (o.fat_g !== undefined) update.fat_g = o.fat_g ?? 0;
    if (Object.keys(update).length > 0) {
      await supabase.from("items").update(update).eq("id", li.item_id);
    }
  }
};

export const useCreatePurchase = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { activeGroupId } = useGroupContext();
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
          group_id: activeGroupId,
          store_name: input.store_name,
          purchased_at: input.purchased_at,
          notes: input.notes,
          total_cost: input.total_cost,
        })
        .select()
        .single();
      if (pErr) throw pErr;

      const resolved = (await resolveItemIds(input.line_items, user!.id)).filter((li) => li.item_id);
      if (resolved.length > 0) {
        const lineRows = resolved.map((li) => buildLineRow(li, user!.id, purchase.id));
        const { error: liErr } = await supabase.from("purchase_items").insert(lineRows);
        if (liErr) throw liErr;

        const restockItems = resolved.filter((li) => li.restock);
        if (restockItems.length > 0) {
          const inventoryRows = restockItems.map((li) => ({
            user_id: user!.id,
            item_id: li.item_id!,
            quantity: li.quantity,
            unit: li.unit,
            storage_location: li.storage_location || null,
            expiry_date: li.expiry_date || null,
            purchase_id: purchase.id,
            group_id: activeGroupId,
          }));
          const { error: invErr } = await supabase.from("inventory").insert(inventoryRows);
          if (invErr) throw invErr;
        }
        await updateItemOverrides(resolved);
      }

      return purchase;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchases"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["items"] });
    },
  });
};

export const useUpdatePurchase = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { activeGroupId } = useGroupContext();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      store_name: string | null;
      purchased_at: string;
      notes: string | null;
      total_cost: number | null;
      line_items: NewPurchaseLineItem[];
    }) => {
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

      const { error: dErr } = await supabase.from("purchase_items").delete().eq("purchase_id", input.id);
      if (dErr) throw dErr;

      const { error: invDelErr } = await supabase.from("inventory").delete().eq("purchase_id", input.id);
      if (invDelErr) throw invDelErr;

      const resolved = (await resolveItemIds(input.line_items, user!.id)).filter((li) => li.item_id);
      if (resolved.length > 0) {
        const lineRows = resolved.map((li) => buildLineRow(li, user!.id, input.id));
        const { error: liErr } = await supabase.from("purchase_items").insert(lineRows);
        if (liErr) throw liErr;

        const restockItems = resolved.filter((li) => li.restock);
        if (restockItems.length > 0) {
          const inventoryRows = restockItems.map((li) => ({
            user_id: user!.id,
            item_id: li.item_id!,
            quantity: li.quantity,
            unit: li.unit,
            storage_location: li.storage_location || null,
            expiry_date: li.expiry_date || null,
            purchase_id: input.id,
            group_id: activeGroupId,
          }));
          const { error: invErr } = await supabase.from("inventory").insert(inventoryRows);
          if (invErr) throw invErr;
        }

        await updateItemOverrides(resolved);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchases"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["items"] });
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
