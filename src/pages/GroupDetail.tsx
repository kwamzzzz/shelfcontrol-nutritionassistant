import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGroups, useGroupMembers } from "@/hooks/useGroups";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Users, UserPlus, Package, ShoppingCart, Receipt,
  Activity, Plus,
} from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { useGroupContext } from "@/contexts/GroupContext";
import InviteMemberDialog from "@/components/groups/InviteMemberDialog";
import PendingInvites from "@/components/groups/PendingInvites";

/* ─── tiny helpers ─── */
const StatCard = ({ icon: Icon, label, value, accent }: {
  icon: React.ElementType; label: string; value: string | number; accent?: string;
}) => (
  <div className="rounded-2xl bg-card p-5 shadow-[0_2px_16px_-4px_hsl(var(--foreground)/0.06)] border border-border/40">
    <div className="flex items-center gap-2 mb-2">
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-secondary ${accent ?? "text-primary"}`}>
        <Icon className="h-4 w-4" />
      </div>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </div>
    <p className="text-2xl font-display font-bold tabular-nums text-foreground">{value}</p>
  </div>
);

/* ─── activity feed types ─── */
interface ActivityEntry {
  id: string;
  type: "pantry" | "purchase" | "shopping" | "consumption";
  userName: string;
  detail: string;
  time: string;
}

const GroupDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { groups } = useGroups();
  const { setActiveGroupId } = useGroupContext();
  const { data: members = [], isLoading: membersLoading } = useGroupMembers(id ?? null);
  const group = groups.find((g) => g.id === id);
  const [inviteOpen, setInviteOpen] = useState(false);

  /* ─── fetch group data for summary + activity ─── */
  const { data: groupData } = useQuery({
    queryKey: ["group_dashboard", id],
    queryFn: async () => {
      if (!id) return null;

      const [invRes, purchRes, shopRes, consRes] = await Promise.all([
        supabase.from("inventory").select("id, added_at, user_id, items(name)").eq("group_id", id).order("added_at", { ascending: false }).limit(10),
        supabase.from("purchases").select("id, purchased_at, user_id, store_name, total_cost").eq("group_id", id).order("purchased_at", { ascending: false }).limit(10),
        supabase.from("shopping_list").select("id, created_at, user_id, name, is_purchased").eq("group_id", id).order("created_at", { ascending: false }).limit(10),
        supabase.from("consumption_logs").select("id, consumed_at, user_id, items(name)").eq("group_id", id).order("consumed_at", { ascending: false }).limit(10),
      ]);

      // collect user_ids for profile lookup
      const allUserIds = new Set<string>();
      [invRes.data, purchRes.data, shopRes.data, consRes.data].forEach((arr) =>
        (arr ?? []).forEach((r: any) => allUserIds.add(r.user_id))
      );
      const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", [...allUserIds]);
      const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? "Someone"]));
      const getName = (uid: string) => nameMap.get(uid) ?? "Someone";

      return {
        inventoryCount: invRes.data?.length ?? 0,
        purchaseCount: purchRes.data?.length ?? 0,
        shoppingCount: shopRes.data?.length ?? 0,
        inventory: invRes.data ?? [],
        purchases: purchRes.data ?? [],
        shopping: shopRes.data ?? [],
        consumption: consRes.data ?? [],
        getName,
      };
    },
    enabled: !!id && !!user,
  });

  /* ─── build activity feed ─── */
  const activity: ActivityEntry[] = useMemo(() => {
    if (!groupData) return [];
    const entries: ActivityEntry[] = [];
    const getName = groupData.getName;

    groupData.inventory.forEach((r: any) => entries.push({
      id: `inv-${r.id}`, type: "pantry", userName: getName(r.user_id),
      detail: `added ${r.items?.name ?? "an item"} to pantry`, time: r.added_at,
    }));
    groupData.purchases.forEach((r: any) => entries.push({
      id: `pur-${r.id}`, type: "purchase", userName: getName(r.user_id),
      detail: `logged a purchase${r.store_name ? ` at ${r.store_name}` : ""}`, time: r.purchased_at,
    }));
    groupData.shopping.forEach((r: any) => entries.push({
      id: `shop-${r.id}`, type: "shopping", userName: getName(r.user_id),
      detail: r.is_purchased ? `completed "${r.name}"` : `added "${r.name}" to shopping list`, time: r.created_at,
    }));
    groupData.consumption.forEach((r: any) => entries.push({
      id: `con-${r.id}`, type: "consumption", userName: getName(r.user_id),
      detail: `consumed ${r.items?.name ?? "an item"}`, time: r.consumed_at,
    }));

    entries.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    return entries.slice(0, 15);
  }, [groupData]);

  const hasData = activity.length > 0;

  /* ─── navigate helpers ─── */
  const goToGroupPage = (path: string) => {
    if (id) setActiveGroupId(id);
    navigate(path);
  };

  if (!group) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <Button variant="ghost" onClick={() => navigate("/groups")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Groups
        </Button>
        <p className="text-muted-foreground">Group not found.</p>
      </div>
    );
  }

  const typeIcon = (t: string) => {
    switch (t) {
      case "pantry": return <Package className="h-3.5 w-3.5 text-emerald-500" />;
      case "purchase": return <Receipt className="h-3.5 w-3.5 text-blue-500" />;
      case "shopping": return <ShoppingCart className="h-3.5 w-3.5 text-amber-500" />;
      case "consumption": return <Activity className="h-3.5 w-3.5 text-violet-500" />;
      default: return null;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/groups")} className="rounded-xl shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-display font-bold tracking-tight text-foreground truncate">{group.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            {group.type && <Badge variant="secondary" className="text-xs capitalize">{group.type}</Badge>}
            <span className="text-sm text-muted-foreground">{members.length} member{members.length !== 1 ? "s" : ""}</span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Package} label="Pantry Items" value={groupData?.inventoryCount ?? 0} accent="text-emerald-600" />
        <StatCard icon={ShoppingCart} label="Shopping Items" value={groupData?.shoppingCount ?? 0} accent="text-amber-600" />
        <StatCard icon={Receipt} label="Purchases" value={groupData?.purchaseCount ?? 0} accent="text-blue-600" />
        <StatCard icon={Users} label="Members" value={members.length} accent="text-violet-600" />
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" className="rounded-xl gap-2" onClick={() => goToGroupPage("/pantry")}>
          <Package className="h-4 w-4" /> View Shared Pantry
        </Button>
        <Button variant="outline" className="rounded-xl gap-2" onClick={() => goToGroupPage("/shopping")}>
          <ShoppingCart className="h-4 w-4" /> Open Shopping List
        </Button>
        <Button variant="outline" className="rounded-xl gap-2" onClick={() => goToGroupPage("/purchases")}>
          <Receipt className="h-4 w-4" /> View Purchases
        </Button>
        <Button variant="outline" className="rounded-xl gap-2" onClick={() => setInviteOpen(true)}>
          <UserPlus className="h-4 w-4" /> Invite Member
        </Button>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Activity Feed */}
        <Card className="lg:col-span-7 rounded-2xl shadow-sm border-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!hasData ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Activity className="h-10 w-10 text-muted-foreground/20 mb-3" />
                <p className="text-sm text-muted-foreground mb-4">No shared activity yet</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <Button size="sm" variant="outline" className="gap-1.5 rounded-lg" onClick={() => goToGroupPage("/pantry")}>
                    <Plus className="h-3.5 w-3.5" /> Add Pantry Item
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5 rounded-lg" onClick={() => goToGroupPage("/shopping")}>
                    <Plus className="h-3.5 w-3.5" /> Add Shopping Item
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5 rounded-lg" onClick={() => goToGroupPage("/purchases")}>
                    <Plus className="h-3.5 w-3.5" /> Log Purchase
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                {activity.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 py-2.5 border-b border-border/40 last:border-0">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary">
                      {typeIcon(a.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground">
                        <span className="font-semibold">{a.userName}</span>{" "}
                        <span className="text-muted-foreground">{a.detail}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDistanceToNow(parseISO(a.time), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Members */}
        <Card className="lg:col-span-5 rounded-2xl shadow-sm border-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Members
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {membersLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : members.length === 0 ? (
              <p className="text-sm text-muted-foreground">No members found.</p>
            ) : (
              members.map((m) => (
                <div key={m.id} className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                      {(m.profile?.full_name ?? "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {m.profile?.full_name || "Unknown User"}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">{m.role}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs capitalize">{m.role}</Badge>
                </div>
              ))
            )}
            <Button variant="outline" className="w-full rounded-xl gap-2 mt-2" onClick={() => setInviteOpen(true)}>
              <UserPlus className="h-4 w-4" />
              Invite Member
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Pending Invites */}
      {id && <PendingInvites groupId={id} />}

      {/* Invite Dialog */}
      {id && group && (
        <InviteMemberDialog
          groupId={id}
          groupName={group.name}
          open={inviteOpen}
          onOpenChange={setInviteOpen}
        />
      )}
    </div>
  );
};

export default GroupDetail;
