import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGroupContext } from "@/contexts/GroupContext";
import { useInventory } from "@/hooks/usePantry";
import { usePurchases } from "@/hooks/usePurchases";
import { useConsumptionLogs } from "@/hooks/useConsumption";
import { useWasteLogs } from "@/hooks/useWasteLogs";
import { useShoppingList } from "@/hooks/useShoppingList";
import { useRecipes } from "@/hooks/useRecipes";
import { useGroups } from "@/hooks/useGroups";
import { buildKitchenStory, type KitchenStory, type StoryRange } from "@/lib/kitchen-story";

/**
 * Composes the existing group-scoped hooks into the Kitchen Story.
 *
 * Every source respects the active group scope exactly as the rest of the app
 * does, so a personal story never mixes in household data (and vice versa).
 * The scope is surfaced to the user via `scopeLabel` rather than left implicit.
 */
export function useKitchenStory(range: StoryRange) {
  const { user } = useAuth();
  const { activeGroupId, isPersonalMode } = useGroupContext();

  // Same key as the Profile page, so the two share one cached row.
  const profile = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const inventory = useInventory();
  const purchases = usePurchases();
  const consumption = useConsumptionLogs();
  const waste = useWasteLogs();
  const shopping = useShoppingList();
  const recipes = useRecipes();
  const groups = useGroups();

  const story: KitchenStory = useMemo(
    () =>
      buildKitchenStory(
        {
          now: new Date(),
          memberSince: profile.data?.created_at ?? user?.created_at ?? null,
          inventory: (inventory.data ?? []).map((row) => ({
            item_id: row.item_id,
            expiry_date: row.expiry_date,
            storage_location: row.storage_location,
            items: row.items ? { name: row.items.name, category: row.items.category } : null,
          })),
          purchases: (purchases.data ?? []).map((p) => ({
            purchased_at: p.purchased_at,
            total_cost: p.total_cost,
            store_name: p.store_name,
            purchase_items: (p.purchase_items ?? []).map((line) => ({
              item_id: line.item_id,
              quantity: Number(line.quantity) || 0,
              items: line.items ? { name: line.items.name, category: line.items.category } : null,
            })),
          })),
          consumption: (consumption.data ?? []).map((log) => ({ consumed_at: log.consumed_at })),
          waste: (waste.data ?? []).map((row) => ({
            item_id: row.item_id,
            discarded_at: row.discarded_at,
          })),
          shopping: (shopping.data ?? []).map((row) => ({
            created_at: row.created_at,
            is_purchased: row.is_purchased,
            completed_at: row.completed_at ?? null,
          })),
          recipes: (recipes.data ?? []).map((r) => ({
            created_at: r.created_at,
            tags: r.tags,
            ingredientItemIds: (r.recipe_ingredients ?? []).map((ri) => ri.item_id),
          })),
        },
        range,
      ),
    [
      range,
      profile.data,
      user?.created_at,
      inventory.data,
      purchases.data,
      consumption.data,
      waste.data,
      shopping.data,
      recipes.data,
    ],
  );

  const firstName = useMemo(() => {
    const full = profile.data?.full_name?.trim();
    return full ? full.split(/\s+/)[0] : null;
  }, [profile.data?.full_name]);

  const scopeLabel = useMemo(() => {
    if (isPersonalMode) return "Personal kitchen";
    const active = groups.groups?.find((g) => g.id === activeGroupId);
    return active?.name ?? "Shared kitchen";
  }, [isPersonalMode, groups.groups, activeGroupId]);

  const isLoading =
    inventory.isLoading ||
    purchases.isLoading ||
    consumption.isLoading ||
    waste.isLoading ||
    shopping.isLoading ||
    recipes.isLoading;

  const isError =
    inventory.isError ||
    purchases.isError ||
    consumption.isError ||
    waste.isError ||
    shopping.isError ||
    recipes.isError;

  return { story, firstName, scopeLabel, isLoading, isError };
}
