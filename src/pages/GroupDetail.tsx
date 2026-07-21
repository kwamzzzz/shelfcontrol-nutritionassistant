import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGroups, useGroupMembers } from "@/hooks/useGroups";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeft, Users, UserPlus, Package, ShoppingCart, Receipt,
} from "lucide-react";
import { useGroupContext } from "@/contexts/GroupContext";
import InviteMemberDialog from "@/components/groups/InviteMemberDialog";
import PendingInvites from "@/components/groups/PendingInvites";
import GroupActivityFeed, { useGroupActivity } from "@/components/groups/GroupActivityFeed";

/* ─── tiny helpers ─── */
const StatCard = ({ icon: Icon, label, value, accent }: {
  icon: React.ElementType; label: string; value: string | number; accent?: string;
}) => (
  <div className="rounded-2xl bg-card p-5 shadow-[0_2px_16px_-4px_hsl(var(--foreground)/0.06)]">
    <div className="flex items-center gap-2 mb-2">
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-secondary ${accent ?? "text-primary"}`}>
        <Icon className="h-4 w-4" />
      </div>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </div>
    <p className="text-2xl font-display font-bold tabular-nums text-foreground">{value}</p>
  </div>
);

const GroupDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { groups } = useGroups();
  const { setActiveGroupId } = useGroupContext();
  const { data: members = [], isLoading: membersLoading } = useGroupMembers(id ?? null);
  const group = groups.find((g) => g.id === id);
  const [inviteOpen, setInviteOpen] = useState(false);
  const { data: activityData } = useGroupActivity(id);

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
        <StatCard icon={Package} label="Pantry Items" value={activityData?.stats.inventory ?? 0} accent="text-emerald-600" />
        <StatCard icon={ShoppingCart} label="Shopping Items" value={activityData?.stats.shopping ?? 0} accent="text-amber-600" />
        <StatCard icon={Receipt} label="Purchases" value={activityData?.stats.purchases ?? 0} accent="text-blue-600" />
        <StatCard icon={Users} label="Members" value={members.length} accent="text-emerald-600" />
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
        <div className="lg:col-span-7">
          <GroupActivityFeed groupId={id!} onNavigate={goToGroupPage} />
        </div>

        {/* Members */}
        <Card className="lg:col-span-5 rounded-2xl shadow-sm border-0">
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
              members.map((m) => {
                const name = m.profile?.full_name || "Unknown User";
                return (
                  <div key={m.id} className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                          {name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-foreground">{name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{m.role}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs capitalize">{m.role}</Badge>
                  </div>
                );
              })
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
