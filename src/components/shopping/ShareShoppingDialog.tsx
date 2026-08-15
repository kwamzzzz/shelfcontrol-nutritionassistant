import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Send, Share2, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useGroups } from "@/hooks/useGroups";
import { useShareShoppingToGroup } from "@/hooks/useShoppingSharing";
import { useToast } from "@/hooks/use-toast";
import type { ShoppingItem } from "@/hooks/useShoppingList";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  items: ShoppingItem[];
  title?: string;
  canShareToGroup?: boolean;
  onShared?: () => void;
}

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Please try again.";

export const buildShoppingText = (items: ShoppingItem[], title?: string) => {
  const lines = items.map((item) => {
    const qty = item.quantity ? `${item.quantity}${item.unit ? ` ${item.unit}` : ""} ` : "";
    const price = item.estimated_cost ? ` — ${formatCurrency(Number(item.estimated_cost))}` : "";
    const note = item.notes?.trim() ? ` (${item.notes.trim()})` : "";
    return `${item.is_purchased ? "[x]" : "[ ]"} ${qty}${item.name}${price}${note}`;
  });
  const total = items.reduce((sum, item) => sum + Number(item.estimated_cost ?? 0), 0);
  const heading = title ? `Shopping list — ${title}` : "Shopping list";
  return [heading, ...lines, total > 0 ? `Total: ${formatCurrency(total)}` : ""]
    .filter(Boolean)
    .join("\n");
};

const ShareShoppingDialog = ({
  open,
  onClose,
  items,
  title,
  canShareToGroup = true,
  onShared,
}: Props) => {
  const { groups, isLoading } = useGroups();
  const shareToGroup = useShareShoppingToGroup();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [groupId, setGroupId] = useState("");
  const [copied, setCopied] = useState(false);

  const text = useMemo(() => buildShoppingText(items, title), [items, title]);

  useEffect(() => {
    if (!open) return;
    setCopied(false);
    setGroupId((current) =>
      groups.some((group) => group.id === current) ? current : groups[0]?.id ?? ""
    );
  }, [groups, open]);

  const destination = groups.find((group) => group.id === groupId);

  const handleGroupShare = async () => {
    if (!groupId || !destination || !items.length) return;
    try {
      const result = await shareToGroup.mutateAsync({
        shoppingIds: items.map((item) => item.id),
        groupId,
      });
      toast({
        title: `Shared with ${destination.name}`,
        description: `${result.shared_count} item${result.shared_count === 1 ? "" : "s"} copied into the group list. Your personal list is unchanged.`,
      });
      onClose();
      onShared?.();
    } catch (error: unknown) {
      toast({
        title: "Couldn't share this yet",
        description: errorMessage(error),
        variant: "destructive",
      });
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({ title: "List copied", description: "Paste it anywhere you like." });
    } catch {
      toast({
        title: "Couldn't copy",
        description: "Select the text and copy it manually.",
        variant: "destructive",
      });
    }
  };

  const handleNativeShare = async () => {
    if (!navigator.share) {
      await handleCopy();
      return;
    }
    try {
      await navigator.share({ title: title ?? "Shopping list", text });
    } catch {
      // user dismissed the share sheet
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Share2 className="h-5 w-5" />
          </div>
          <DialogTitle>Share this list</DialogTitle>
          <DialogDescription>
            {items.length} item{items.length === 1 ? "" : "s"} selected — send them to a group or to
            someone outside the app.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={canShareToGroup ? "group" : "person"}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="group">To a group</TabsTrigger>
            <TabsTrigger value="person">To a person</TabsTrigger>
          </TabsList>

          <TabsContent value="group" className="space-y-4 pt-4">
            {!canShareToGroup ? (
              <p className="rounded-2xl border border-dashed border-border bg-[hsl(var(--surface-subtle))] p-5 text-sm text-muted-foreground">
                You're already viewing a shared list. Switch to your personal list to copy items into
                another group.
              </p>
            ) : isLoading ? (
              <p className="rounded-2xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
                Loading your groups…
              </p>
            ) : groups.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-[hsl(var(--surface-subtle))] p-6 text-center">
                <Users className="mx-auto h-8 w-8 text-muted-foreground/55" />
                <h3 className="mt-3 font-display font-semibold text-foreground">
                  You need a group first
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create or join a group, then come back to share this list.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4 rounded-xl"
                  onClick={() => {
                    onClose();
                    navigate("/groups");
                  }}
                >
                  Manage groups
                </Button>
              </div>
            ) : (
              <>
                <div className="grid gap-2 sm:grid-cols-2">
                  {groups.map((group) => {
                    const selected = group.id === groupId;
                    return (
                      <button
                        key={group.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setGroupId(group.id)}
                        className={cn(
                          "flex min-h-14 items-center gap-3 rounded-2xl border px-3.5 text-left transition",
                          selected
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border bg-card text-foreground hover:border-primary/35"
                        )}
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-primary">
                          <Users className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                          {group.name}
                        </span>
                        {selected && <Check className="h-4 w-4 shrink-0 text-primary" />}
                      </button>
                    );
                  })}
                </div>

                <p className="rounded-2xl border border-primary/15 bg-primary/[0.05] p-3 text-xs leading-relaxed text-muted-foreground">
                  Everyone in <strong className="text-foreground">{destination?.name}</strong> can see
                  and tick off these items. Your personal copy stays where it is.
                </p>

                <Button
                  type="button"
                  className="min-h-12 w-full rounded-2xl"
                  disabled={!groupId || !items.length || shareToGroup.isPending}
                  onClick={handleGroupShare}
                >
                  <Send className="mr-2 h-4 w-4" />
                  {shareToGroup.isPending
                    ? "Sharing…"
                    : `Share with ${destination?.name ?? "group"}`}
                </Button>
              </>
            )}
          </TabsContent>

          <TabsContent value="person" className="space-y-3 pt-4">
            <Textarea
              readOnly
              value={text}
              className="min-h-[190px] resize-y rounded-2xl text-sm leading-relaxed"
              aria-label="Shopping list text"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="min-h-12 flex-1 rounded-2xl"
                onClick={handleCopy}
              >
                {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                {copied ? "Copied" : "Copy list"}
              </Button>
              <Button type="button" className="min-h-12 flex-1 rounded-2xl" onClick={handleNativeShare}>
                <Share2 className="mr-2 h-4 w-4" />
                Share…
              </Button>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Sends a plain-text list via your device share sheet (WhatsApp, Messages, email) — no
              account needed on their side.
            </p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ShareShoppingDialog;
