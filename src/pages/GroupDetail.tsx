import { useParams, useNavigate } from "react-router-dom";
import { useGroups, useGroupMembers } from "@/hooks/useGroups";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, UserPlus, Activity } from "lucide-react";

const GroupDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { groups } = useGroups();
  const { data: members = [], isLoading } = useGroupMembers(id ?? null);
  const group = groups.find((g) => g.id === id);

  if (!group) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <Button variant="ghost" onClick={() => navigate("/groups")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Groups
        </Button>
        <p className="text-muted-foreground">Group not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/groups")} className="rounded-xl">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{group.name}</h1>
          {group.type && (
            <Badge variant="secondary" className="mt-1 text-xs capitalize">{group.type}</Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Members ({members.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : members.length === 0 ? (
              <p className="text-sm text-muted-foreground">No members found.</p>
            ) : (
              members.map((m) => (
                <div key={m.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                      {(m.profile?.full_name ?? "?").charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium">
                      {m.profile?.full_name || `User ${m.user_id.slice(0, 8)}…`}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs capitalize">{m.role}</Badge>
                </div>
              ))
            )}
            <Button variant="outline" className="w-full rounded-xl gap-2 mt-2" disabled>
              <UserPlus className="h-4 w-4" />
              Invite Member (Coming Soon)
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Group Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Activity className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                Activity feed coming soon. Track shared purchases, pantry changes, and more.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GroupDetail;
