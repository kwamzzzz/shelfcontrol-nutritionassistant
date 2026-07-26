import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ArrowRight, BookOpen, Check, Copy, PackageCheck, Receipt, Send, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { InventoryRow } from "@/hooks/usePantry";
import type { PurchaseWithItems } from "@/hooks/usePurchases";
import type { RecipeWithIngredients } from "@/hooks/useRecipes";
import {
  type GroupShareMode,
  useShareInventoryToGroup,
  useSharePurchaseToGroup,
} from "@/hooks/usePantrySharing";
import { useShareRecipesToGroup } from "@/hooks/useRecipeSharing";
import { useGroups } from "@/hooks/useGroups";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type SharePayload =
  | { kind: "inventory"; entries: InventoryRow[] }
  | { kind: "purchase"; purchase: PurchaseWithItems }
  | { kind: "recipe"; entries: RecipeWithIngredients[] };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payload: SharePayload | null;
  onShared?: (mode: GroupShareMode) => void;
}

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Please try again.";

const ShareToGroupDialog = ({ open, onOpenChange, payload, onShared }: Props) => {
  const { groups, isLoading } = useGroups();
  const shareInventory = useShareInventoryToGroup();
  const sharePurchase = useSharePurchaseToGroup();
  const shareRecipes = useShareRecipesToGroup();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [groupId, setGroupId] = useState("");
  const [mode, setMode] = useState<GroupShareMode>("copy");

  useEffect(() => {
    if (!open) return;
    setMode("copy");
    setGroupId((current) =>
      groups.some((group) => group.id === current) ? current : groups[0]?.id ?? ""
    );
  }, [groups, open]);

  const destination = groups.find((group) => group.id === groupId);
  const isPending = shareInventory.isPending || sharePurchase.isPending || shareRecipes.isPending;

  const summary = useMemo(() => {
    if (!payload) return null;
    if (payload.kind === "purchase") {
      const count = payload.purchase.purchase_items?.length ?? 0;
      return {
        icon: Receipt,
        eyebrow: "Complete receipt",
        title: payload.purchase.store_name || "Store not recorded",
        detail: `${format(parseISO(payload.purchase.purchased_at), "MMM d, yyyy")} · ${count} item${count === 1 ? "" : "s"}`,
      };
    }

    if (payload.kind === "recipe") {
      const count = payload.entries.length;
      const names = payload.entries.slice(0, 3).map((recipe) => recipe.name);
      return {
        icon: BookOpen,
        eyebrow: count === 1 ? "Cookbook recipe" : `${count} cookbook recipes`,
        title: count === 1 ? names[0] : `${count} selected recipes`,
        detail: `${names.join(", ")}${count > names.length ? ` +${count - names.length}` : ""}`,
      };
    }

    const count = payload.entries.length;
    const names = payload.entries.slice(0, 3).map((entry) => entry.items.name);
    return {
      icon: PackageCheck,
      eyebrow: count === 1 ? "Pantry item" : `${count} pantry items`,
      title: count === 1 ? names[0] : `${count} selected items`,
      detail: `${names.join(", ")}${count > names.length ? ` +${count - names.length}` : ""}`,
    };
  }, [payload]);

  const handleShare = async () => {
    if (!payload || !groupId || !destination) return;

    try {
      if (payload.kind === "inventory") {
        await shareInventory.mutateAsync({
          inventoryIds: payload.entries.map((entry) => entry.id),
          groupId,
          mode,
        });
      } else if (payload.kind === "purchase") {
        await sharePurchase.mutateAsync({
          purchaseId: payload.purchase.id,
          groupId,
          mode,
        });
      } else {
        await shareRecipes.mutateAsync({
          recipeIds: payload.entries.map((recipe) => recipe.id),
          groupId,
          mode,
        });
      }

      toast({
        title: mode === "copy" ? `Shared with ${destination.name}` : `Moved to ${destination.name}`,
        description:
          payload.kind === "purchase"
            ? "The receipt, its line items, and linked pantry stock are now available to the group."
            : payload.kind === "recipe"
              ? `${payload.entries.length} recipe${payload.entries.length === 1 ? "" : "s"} ${
                  mode === "copy" ? "copied into" : "moved into"
                } the shared cookbook.`
              : `${payload.entries.length} pantry item${payload.entries.length === 1 ? "" : "s"} ${
                  mode === "copy" ? "copied" : "transferred"
                } safely.`,
      });
      onOpenChange(false);
      onShared?.(mode);
    } catch (error: unknown) {
      toast({
        title: "Couldn't share this yet",
        description: errorMessage(error),
        variant: "destructive",
      });
    }
  };

  if (!payload || !summary) return null;
  const SummaryIcon = summary.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg overflow-hidden p-0 sm:p-0">
        <div className="px-6 pt-6 sm:px-8 sm:pt-8">
          <DialogHeader className="pr-10">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Send className="h-5 w-5" />
            </div>
            <DialogTitle>Share to a group</DialogTitle>
            <DialogDescription>
              {payload.kind === "recipe"
                ? "Send recipes to a shared cookbook you already belong to."
                : "Send pantry stock to a shared kitchen you already belong to."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-5 px-6 pb-6 sm:px-8 sm:pb-8">
          <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-secondary/55 p-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-card text-primary shadow-sm">
              <SummaryIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-primary">
                {summary.eyebrow}
              </p>
              <p className="mt-0.5 truncate font-display font-semibold text-foreground">
                {summary.title}
              </p>
              <p className="truncate text-xs text-muted-foreground">{summary.detail}</p>
            </div>
          </div>

          {isLoading ? (
            <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Loading your groups…
            </div>
          ) : groups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-secondary/35 p-6 text-center">
              <Users className="mx-auto h-8 w-8 text-muted-foreground/55" />
              <h3 className="mt-3 font-display font-semibold text-foreground">You need a group first</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Create or join a group, then come back to share pantry stock.
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-4 rounded-xl"
                onClick={() => {
                  onOpenChange(false);
                  navigate("/groups");
                }}
              >
                Manage groups
              </Button>
            </div>
          ) : (
            <>
              <fieldset className="space-y-2">
                <legend className="mb-2 text-sm font-semibold text-foreground">Choose a group</legend>
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
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{group.name}</span>
                        {selected && <Check className="h-4 w-4 shrink-0 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset>
                <legend className="mb-2 text-sm font-semibold text-foreground">What happens to Personal?</legend>
                <div className="grid grid-cols-2 gap-2 rounded-2xl bg-secondary p-1.5">
                  {([
                    ["copy", Copy, "Keep a copy"],
                    ["move", ArrowRight, "Move it"],
                  ] as const).map(([value, Icon, label]) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={mode === value}
                      onClick={() => setMode(value)}
                      className={cn(
                        "flex min-h-12 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition",
                        mode === value
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {mode === "copy"
                    ? "The original stays in your personal kitchen and a group copy is created."
                    : "The original leaves your personal kitchen and becomes part of the selected group."}
                </p>
              </fieldset>

              <div className="rounded-2xl border border-primary/15 bg-primary/[0.05] p-3 text-xs leading-relaxed text-muted-foreground">
                Everyone in <strong className="text-foreground">{destination?.name}</strong> can see and
                update what you share. Direct sharing to a username is not enabled.
              </div>

              <Button
                type="button"
                className="min-h-12 w-full rounded-2xl"
                disabled={!groupId || isPending}
                onClick={handleShare}
              >
                <Send className="mr-2 h-4 w-4" />
                {isPending
                  ? "Sharing…"
                  : mode === "copy"
                    ? `Share with ${destination?.name ?? "group"}`
                    : `Move to ${destination?.name ?? "group"}`}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareToGroupDialog;
