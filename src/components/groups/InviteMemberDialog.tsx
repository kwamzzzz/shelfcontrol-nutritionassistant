import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Mail } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useGroupInvites } from "@/hooks/useGroupInvites";

interface Props {
  groupId: string;
  groupName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const InviteMemberDialog = ({ groupId, groupName, open, onOpenChange }: Props) => {
  const [email, setEmail] = useState("");
  const { createInvite } = useGroupInvites(groupId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;

    try {
      const invite = await createInvite.mutateAsync({ groupId, email: trimmed });
      const inviteUrl = `${window.location.origin}/invite/${invite.invite_token}`;
      toast({
        title: "Invite created!",
        description: `Share this link with ${trimmed}: ${inviteUrl}`,
      });
      setEmail("");
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Failed to create invite",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <UserPlus className="h-5 w-5 text-primary" />
            Invite to {groupName}
          </DialogTitle>
          <DialogDescription>
            Enter an email address. They'll receive a link to join this group.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="invite-email"
                type="email"
                required
                placeholder="friend@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9 rounded-xl"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createInvite.isPending}
              className="rounded-xl gap-2"
            >
              <UserPlus className="h-4 w-4" />
              {createInvite.isPending ? "Sending…" : "Send Invite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InviteMemberDialog;
