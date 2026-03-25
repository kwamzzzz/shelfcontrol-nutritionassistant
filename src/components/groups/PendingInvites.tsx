import { useGroupInvites } from "@/hooks/useGroupInvites";
import { useProfileNames } from "@/hooks/useProfileNames";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, X, Clock, Copy } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { useMemo } from "react";

interface Props {
  groupId: string;
}

const statusColor: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  accepted: "bg-emerald-100 text-emerald-800 border-emerald-200",
  revoked: "bg-red-100 text-red-800 border-red-200",
  expired: "bg-muted text-muted-foreground",
};

const PendingInvites = ({ groupId }: Props) => {
  const { invites, isLoading, revokeInvite } = useGroupInvites(groupId);

  const inviterIds = useMemo(
    () => invites.map((i) => i.invited_by),
    [invites]
  );
  const { data: nameMap } = useProfileNames(inviterIds);

  if (isLoading) return null;
  if (invites.length === 0) return null;

  const handleCopyLink = (token: string) => {
    const url = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied!", description: "Share it with the invitee." });
  };

  const handleRevoke = async (id: string) => {
    try {
      await revokeInvite.mutateAsync(id);
      toast({ title: "Invite revoked" });
    } catch (err: any) {
      toast({ title: "Failed to revoke", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Card className="rounded-2xl shadow-sm border-0">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-display flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          Pending Invites
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {invites.map((inv) => (
          <div
            key={inv.id}
            className="flex items-center justify-between py-2.5 border-b border-border/20 last:border-0 gap-3"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">{inv.email}</p>
              <p className="text-xs text-muted-foreground">
                Invited by {nameMap?.get(inv.invited_by) ?? "…"}{" "}
                · {formatDistanceToNow(parseISO(inv.created_at), { addSuffix: true })}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className={`text-xs capitalize ${statusColor[inv.status] ?? ""}`}>
                {inv.status}
              </Badge>
              {inv.status === "pending" && (
                <>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 rounded-lg"
                    onClick={() => handleCopyLink(inv.invite_token)}
                    title="Copy invite link"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 rounded-lg text-destructive hover:text-destructive"
                    onClick={() => handleRevoke(inv.id)}
                    title="Revoke invite"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default PendingInvites;
