import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useInviteByToken } from "@/hooks/useGroupInvites";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, CheckCircle, XCircle, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const AcceptInvite = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, session, loading: authLoading } = useAuth();
  const { data: invite, isLoading, error } = useInviteByToken(token);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-muted-foreground">Loading invite…</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-4">
        <Card className="max-w-md w-full rounded-2xl shadow-lg">
          <CardContent className="py-10 text-center space-y-4">
            <Users className="h-12 w-12 mx-auto text-primary" />
            <h2 className="text-xl font-display font-bold text-foreground">Sign in to accept</h2>
            <p className="text-sm text-muted-foreground">
              You need to sign in or create an account before joining this group.
            </p>
            <Button className="rounded-xl" onClick={() => navigate("/auth")}>
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-4">
        <Card className="max-w-md w-full rounded-2xl shadow-lg">
          <CardContent className="py-10 text-center space-y-4">
            <XCircle className="h-12 w-12 mx-auto text-destructive" />
            <h2 className="text-xl font-display font-bold text-foreground">Invalid Invite</h2>
            <p className="text-sm text-muted-foreground">
              This invite link is invalid or has been removed.
            </p>
            <Button variant="outline" className="rounded-xl" onClick={() => navigate("/")}>
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const group = (invite as any).groups as { name: string; type: string | null } | null;
  const isExpired = new Date(invite.expires_at) < new Date();
  const isRevoked = invite.status === "revoked";
  const isAlreadyAccepted = invite.status === "accepted";

  if (accepted || isAlreadyAccepted) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-4">
        <Card className="max-w-md w-full rounded-2xl shadow-lg">
          <CardContent className="py-10 text-center space-y-4">
            <CheckCircle className="h-12 w-12 mx-auto text-emerald-500" />
            <h2 className="text-xl font-display font-bold text-foreground">You're in!</h2>
            <p className="text-sm text-muted-foreground">
              You've joined <span className="font-semibold">{group?.name ?? "the group"}</span>.
            </p>
            <Button className="rounded-xl" onClick={() => navigate(`/groups/${invite.group_id}`)}>
              Open Group
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isExpired || isRevoked) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-4">
        <Card className="max-w-md w-full rounded-2xl shadow-lg">
          <CardContent className="py-10 text-center space-y-4">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground" />
            <h2 className="text-xl font-display font-bold text-foreground">
              {isRevoked ? "Invite Revoked" : "Invite Expired"}
            </h2>
            <p className="text-sm text-muted-foreground">
              This invite is no longer valid. Ask the group admin for a new one.
            </p>
            <Button variant="outline" className="rounded-xl" onClick={() => navigate("/")}>
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleAccept = async () => {
    if (!user) return;
    setAccepting(true);
    try {
      // Add user to group
      const { error: memberErr } = await supabase
        .from("group_members")
        .insert({ group_id: invite.group_id, user_id: user.id, role: "member" });

      if (memberErr) {
        // If already a member, treat as success
        if (!memberErr.message.includes("duplicate")) {
          throw new Error(memberErr.message);
        }
      }

      // Mark invite as accepted
      await supabase
        .from("group_invites")
        .update({ status: "accepted" })
        .eq("id", invite.id);

      setAccepted(true);
      toast({ title: "Welcome!", description: `You've joined ${group?.name ?? "the group"}.` });
    } catch (err: any) {
      toast({ title: "Failed to join", description: err.message, variant: "destructive" });
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <Card className="max-w-md w-full rounded-2xl shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-display font-bold">
            Join {group?.name ?? "Group"}
          </CardTitle>
          {group?.type && (
            <Badge variant="secondary" className="mx-auto mt-1 capitalize">{group.type}</Badge>
          )}
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            You've been invited to join this group. Accept to start collaborating.
          </p>
          <Button
            className="w-full rounded-xl gap-2"
            onClick={handleAccept}
            disabled={accepting}
          >
            <CheckCircle className="h-4 w-4" />
            {accepting ? "Joining…" : "Accept Invite"}
          </Button>
          <Button
            variant="ghost"
            className="w-full rounded-xl"
            onClick={() => navigate("/")}
          >
            Decline
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptInvite;
