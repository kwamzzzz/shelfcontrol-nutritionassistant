import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow, parseISO } from "date-fns";
import {
  Package, ShoppingCart, Receipt, Activity, Trash2, UtensilsCrossed, Plus,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/currency";

interface ActivityEntry {
  id: string;
  type: "pantry" | "purchase" | "shopping" | "consumption" | "waste";
  userName: string;
  action: string;
  itemName?: string;
  meta?: string;
  time: string;
}

interface GroupActivityFeedProps {
  groupId: string;
  onNavigate: (path: string) => void;
}

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  pantry:      { icon: Package,           color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
  purchase:    { icon: Receipt,           color: "text-blue-600",    bg: "bg-blue-100 dark:bg-blue-900/30" },
  shopping:    { icon: ShoppingCart,       color: "text-amber-600",   bg: "bg-amber-100 dark:bg-amber-900/30" },
  consumption: { icon: UtensilsCrossed,   color: "text-violet-600",  bg: "bg-violet-100 dark:bg-violet-900/30" },
  waste:       { icon: Trash2,            color: "text-red-600",     bg: "bg-red-100 dark:bg-red-900/30" },
};

export const useGroupActivity = (groupId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["group_activity", groupId],
    queryFn: async () => {
      if (!groupId) return { entries: [], stats: { inventory: 0, shopping: 0, purchases: 0 } };

      const [invRes, purchRes, shopRes, consRes, wasteRes] = await Promise.all([
        supabase.from("inventory").select("id, added_at, user_id, quantity, unit, items(name)").eq("group_id", groupId).order("added_at", { ascending: false }).limit(20),
        supabase.from("purchases").select("id, purchased_at, user_id, store_name, total_cost").eq("group_id", groupId).order("purchased_at", { ascending: false }).limit(20),
        supabase.from("shopping_list").select("id, created_at, user_id, name, is_purchased, quantity, completed_by, completed_at").eq("group_id", groupId).order("created_at", { ascending: false }).limit(20),
        supabase.from("consumption_logs").select("id, consumed_at, user_id, quantity, unit, items(name)").eq("group_id", groupId).order("consumed_at", { ascending: false }).limit(20),
        supabase.from("waste_logs").select("id, discarded_at, user_id, quantity, unit, reason, items(name)").eq("group_id", groupId).order("discarded_at", { ascending: false }).limit(20),
      ]);

      // Collect all user IDs
      const allUserIds = new Set<string>();
      [invRes.data, purchRes.data, shopRes.data, consRes.data, wasteRes.data].forEach((arr) =>
        (arr ?? []).forEach((r: any) => {
          if (r.user_id) allUserIds.add(r.user_id);
          if (r.completed_by) allUserIds.add(r.completed_by);
        })
      );
      const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", [...allUserIds]);
      const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? "Someone"]));
      const getName = (uid: string) => nameMap.get(uid) ?? "Someone";

      const entries: ActivityEntry[] = [];

      // Inventory
      (invRes.data ?? []).forEach((r: any) => entries.push({
        id: `inv-${r.id}`, type: "pantry", userName: getName(r.user_id),
        action: "added to pantry",
        itemName: r.items?.name,
        meta: r.quantity && r.unit ? `${r.quantity} ${r.unit}` : undefined,
        time: r.added_at,
      }));

      // Purchases
      (purchRes.data ?? []).forEach((r: any) => entries.push({
        id: `pur-${r.id}`, type: "purchase", userName: getName(r.user_id),
        action: `logged a purchase${r.store_name ? ` at ${r.store_name}` : ""}`,
        meta: r.total_cost ? formatCurrency(r.total_cost) : undefined,
        time: r.purchased_at,
      }));

      // Shopping — split completed items into their own entries
      (shopRes.data ?? []).forEach((r: any) => {
        entries.push({
          id: `shop-${r.id}`, type: "shopping", userName: getName(r.user_id),
          action: "added to shopping list",
          itemName: r.name,
          meta: r.quantity ? `×${r.quantity}` : undefined,
          time: r.created_at,
        });
        if (r.is_purchased && r.completed_by && r.completed_at) {
          entries.push({
            id: `shop-done-${r.id}`, type: "shopping", userName: getName(r.completed_by),
            action: "completed from shopping list",
            itemName: r.name,
            time: r.completed_at,
          });
        }
      });

      // Consumption
      (consRes.data ?? []).forEach((r: any) => entries.push({
        id: `con-${r.id}`, type: "consumption", userName: getName(r.user_id),
        action: "consumed",
        itemName: r.items?.name,
        meta: r.quantity && r.unit ? `${r.quantity} ${r.unit}` : undefined,
        time: r.consumed_at,
      }));

      // Waste
      (wasteRes.data ?? []).forEach((r: any) => entries.push({
        id: `waste-${r.id}`, type: "waste", userName: getName(r.user_id),
        action: "discarded",
        itemName: r.items?.name,
        meta: [
          r.quantity && r.unit ? `${r.quantity} ${r.unit}` : null,
          r.reason ? `(${r.reason})` : null,
        ].filter(Boolean).join(" ") || undefined,
        time: r.discarded_at,
      }));

      entries.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

      return {
        entries: entries.slice(0, 30),
        stats: {
          inventory: invRes.data?.length ?? 0,
          shopping: shopRes.data?.length ?? 0,
          purchases: purchRes.data?.length ?? 0,
        },
      };
    },
    enabled: !!groupId && !!user,
  });
};

const GroupActivityFeed = ({ groupId, onNavigate }: GroupActivityFeedProps) => {
  const { data } = useGroupActivity(groupId);
  const entries = data?.entries ?? [];

  if (entries.length === 0) {
    return (
      <Card className="rounded-2xl shadow-sm border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Activity className="h-10 w-10 text-muted-foreground/20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground mb-1">No shared activity yet</p>
            <p className="text-xs text-muted-foreground/70 mb-4">Start collaborating to see activity here</p>
            <div className="flex flex-wrap gap-2 justify-center">
              <Button size="sm" variant="outline" className="gap-1.5 rounded-lg" onClick={() => onNavigate("/pantry")}>
                <Plus className="h-3.5 w-3.5" /> Add Pantry Item
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 rounded-lg" onClick={() => onNavigate("/shopping")}>
                <Plus className="h-3.5 w-3.5" /> Add Shopping Item
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 rounded-lg" onClick={() => onNavigate("/purchases")}>
                <Plus className="h-3.5 w-3.5" /> Log Purchase
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl shadow-sm border-border/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-display flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Recent Activity
          <Badge variant="secondary" className="ml-auto text-xs font-normal">{entries.length} events</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border/40">
          {entries.map((a) => {
            const cfg = TYPE_CONFIG[a.type] ?? TYPE_CONFIG.pantry;
            const Icon = cfg.icon;
            const initial = a.userName.charAt(0).toUpperCase();

            return (
              <div key={a.id} className="flex items-start gap-3 px-6 py-3 hover:bg-muted/30 transition-colors">
                <Avatar className="h-8 w-8 mt-0.5 shrink-0">
                  <AvatarFallback className={`${cfg.bg} ${cfg.color} text-xs font-semibold`}>
                    {initial}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground leading-snug">
                    <span className="font-semibold">{a.userName}</span>{" "}
                    <span className="text-muted-foreground">{a.action}</span>
                    {a.itemName && (
                      <span className="font-medium text-foreground"> {a.itemName}</span>
                    )}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(parseISO(a.time), { addSuffix: true })}
                    </span>
                    {a.meta && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                        {a.meta}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${cfg.bg}`}>
                  <Icon className={`h-3 w-3 ${cfg.color}`} />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default GroupActivityFeed;
