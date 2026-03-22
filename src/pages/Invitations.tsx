import { useMyInvites, MyInvite } from "@/hooks/useMyInvites";
import { useProfileNames } from "@/hooks/useProfileNames";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Users, CheckCircle, XCircle, Clock } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { useMemo } from "react";

const statusConfig: Record<string, { color: string; label: string; icon: React.ElementType }> = {
  pending: { color: "bg-amber-100 text-amber-800 border-amber-200", label: "Pending", icon: Clock },
  accepted: { color: "bg-emerald-100 text-emerald-800 border-emerald-200", label: "Accepted", icon: CheckCircle },
  declined: { color: "bg-red-100 text-red-800 border-red-200", label: "Declined", icon: XCircle },
  revoked: { color: "bg-muted text-muted-foreground", label: "Revoked", icon: XCircle },
  expired: { color: "bg-muted text-muted-foreground", label: "Expired", icon: Clock },
};

const Invitations = () => {
  const { invites, pendingInvites, isLoading, acceptInvite, declineInvite } = useMyInvites();

  const inviterIds = useMemo(() => invites.map((i) => i.invited_by), [invites]);
  const { data: nameMap } = useProfileNames(inviterIds);

  const getEffectiveStatus = (inv: MyInvite) => {
    if (inv.status === "pending" && new Date(inv.expires_at) < new Date()) return "expired";
    return inv.status;
  };

  const handleAccept = async (inv: MyInvite) => {
    try {
      await acceptInvite.mutateAsync(inv);
      toast({ title: "Joined!", description: `You're now a member of ${inv.groups?.name ?? "the group"}.` });
    } catch (err: any) {
      toast({ title: "Failed to join", description: err.message, variant: "destructive" });
    }
  };

  const handleDecline = async (inv: MyInvite) => {
    try {
      await declineInvite.mutateAsync(inv.id);
      toast({ title: "Invite declined" });
    } catch (err: any) {
      toast({ title: "Failed to decline", description: err.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">Invitations</h1>
          <p className="text-muted-foreground mt-1">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">Invitations</h1>
        <p className="text-muted-foreground mt-1">
          {pendingInvites.length > 0
            ? `You have ${pendingInvites.length} pending invite${pendingInvites.length > 1 ? "s" : ""}`
            : "No pending invitations"}
        </p>
      </div>

      {invites.length === 0 ? (
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="py-16 text-center space-y-3">
            <Mail className="h-12 w-12 mx-auto text-muted-foreground/40" />
            <h3 className="text-lg font-semibold text-foreground">No invitations yet</h3>
            <p className="text-sm text-muted-foreground">
              When someone invites you to a group, it will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {invites.map((inv) => {
            const status = getEffectiveStatus(inv);
            const config = statusConfig[status] ?? statusConfig.pending;
            const isPending = status === "pending";

            return (
              <Card
                key={inv.id}
                className={`rounded-2xl shadow-sm transition-all ${
                  isPending ? "border-primary/20 shadow-md" : "opacity-75"
                }`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-semibold text-foreground">
                          {inv.groups?.name ?? "Unknown Group"}
                        </h3>
                        {inv.groups?.type && (
                          <Badge variant="secondary" className="capitalize text-xs">
                            {inv.groups.type}
                          </Badge>
                        )}
                        <Badge variant="outline" className={`text-xs capitalize ${config.color}`}>
                          {config.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Invited by {nameMap?.get(inv.invited_by) ?? "a group member"} ·{" "}
                        {formatDistanceToNow(parseISO(inv.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    {isPending && (
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          className="rounded-xl gap-1.5"
                          onClick={() => handleAccept(inv)}
                          disabled={acceptInvite.isPending}
                        >
                          <CheckCircle className="h-4 w-4" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl gap-1.5"
                          onClick={() => handleDecline(inv)}
                          disabled={declineInvite.isPending}
                        >
                          <XCircle className="h-4 w-4" />
                          Decline
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Invitations;
