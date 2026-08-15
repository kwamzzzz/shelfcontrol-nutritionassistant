import { useState } from "react";
import { formatDistanceToNow, parseISO, format } from "date-fns";
import { toast } from "sonner";
import {
  ShieldCheck, Users, Package, UtensilsCrossed, Receipt, ShoppingCart,
  MessageSquare, Trash2, Star, ShieldOff, Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useIsAdmin, useAdminStats, useAdminUsers } from "@/hooks/useAdmin";
import {
  useAllFeedback, useUpdateFeedback, useDeleteFeedback, type FeedbackStatus,
} from "@/hooks/useFeedback";
import { useSignedImage } from "@/hooks/useSignedImage";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  new: "bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-500/20",
  reviewed: "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/20",
  resolved: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/20",
};

const Screenshot = ({ path }: { path: string }) => {
  const src = useSignedImage(path);
  if (!src) return null;
  return (
    <a href={src} target="_blank" rel="noreferrer" className="block w-fit">
      <img
        src={src}
        alt="Feedback screenshot"
        className="max-h-40 rounded-xl border border-border object-cover"
      />
    </a>
  );
};

const Admin = () => {
  const { isAdmin, isLoading: checkingRole } = useIsAdmin();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: stats } = useAdminStats(isAdmin);
  const { data: users = [] } = useAdminUsers(isAdmin);
  const { data: feedback = [] } = useAllFeedback(isAdmin);
  const updateFeedback = useUpdateFeedback();
  const deleteFeedback = useDeleteFeedback();

  const [notes, setNotes] = useState<Record<string, string>>({});
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [savingRole, setSavingRole] = useState<string | null>(null);

  if (checkingRole) {
    return <p className="text-sm text-muted-foreground">Checking access…</p>;
  }

  if (!isAdmin) {
    return (
      <Card className="mx-auto max-w-md rounded-2xl">
        <CardContent className="space-y-3 py-16 text-center">
          <ShieldOff className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <h1 className="text-lg font-semibold text-foreground">Admins only</h1>
          <p className="text-sm text-muted-foreground">
            This area is restricted to administrator accounts.
          </p>
        </CardContent>
      </Card>
    );
  }

  const setStatus = async (id: string, status: FeedbackStatus) => {
    try {
      await updateFeedback.mutateAsync({ id, status });
      toast.success(`Marked as ${status}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Couldn't update feedback.");
    }
  };

  const saveNote = async (id: string) => {
    try {
      await updateFeedback.mutateAsync({ id, admin_notes: notes[id] ?? "" });
      toast.success("Reply saved");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Couldn't save the reply.");
    }
  };

  const toggleAdmin = async (userId: string, grant: boolean) => {
    setSavingRole(userId);
    try {
      const { error } = await supabase.rpc("admin_set_role", {
        _user_id: userId,
        _role: "admin",
        _grant: grant,
      });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(grant ? "Admin access granted" : "Admin access removed");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Couldn't change admin access.");
    } finally {
      setSavingRole(null);
    }
  };

  const statCards = [
    { label: "Users", value: stats?.users, icon: Users },
    { label: "New users (30d)", value: stats?.new_users_30d, icon: Users },
    { label: "Catalog items", value: stats?.items, icon: Package },
    { label: "Pantry entries", value: stats?.inventory, icon: Package },
    { label: "Recipes", value: stats?.recipes, icon: UtensilsCrossed },
    { label: "Groups", value: stats?.groups, icon: Users },
    { label: "Purchases", value: stats?.purchases, icon: Receipt },
    { label: "Shopping items", value: stats?.shopping_items, icon: ShoppingCart },
    { label: "Feedback", value: stats?.feedback_total, icon: MessageSquare },
    { label: "New feedback", value: stats?.feedback_new, icon: MessageSquare },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
          <ShieldCheck className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Admin</h1>
          <p className="text-sm text-muted-foreground">Feedback, users and usage across the app.</p>
        </div>
      </div>

      <Tabs defaultValue="feedback">
        <TabsList>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="stats">Usage</TabsTrigger>
        </TabsList>

        <TabsContent value="feedback" className="mt-5 space-y-3">
          {feedback.length === 0 ? (
            <Card className="rounded-2xl">
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                No feedback submitted yet.
              </CardContent>
            </Card>
          ) : (
            feedback.map((f) => (
              <Card key={f.id} className="rounded-2xl shadow-sm">
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="capitalize">{f.category}</Badge>
                    <Badge variant="outline" className={cn(statusStyles[f.status])}>{f.status}</Badge>
                    {f.rating != null && (
                      <span className="flex items-center gap-0.5 text-xs text-amber-500">
                        {Array.from({ length: f.rating }).map((_, i) => (
                          <Star key={i} className="h-3.5 w-3.5 fill-current" />
                        ))}
                      </span>
                    )}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {formatDistanceToNow(parseISO(f.created_at), { addSuffix: true })}
                    </span>
                  </div>

                  <p className="whitespace-pre-wrap text-sm text-foreground">{f.message}</p>
                  {f.page_path && (
                    <p className="text-[11px] text-muted-foreground">Page: {f.page_path}</p>
                  )}
                  {f.screenshot_path && <Screenshot path={f.screenshot_path} />}

                  <Textarea
                    rows={2}
                    placeholder="Reply / internal note (visible to the submitter)"
                    value={notes[f.id] ?? f.admin_notes ?? ""}
                    onChange={(e) => setNotes((n) => ({ ...n, [f.id]: e.target.value }))}
                  />

                  <div className="flex flex-wrap items-center gap-2">
                    <Select value={f.status} onValueChange={(v) => setStatus(f.id, v as FeedbackStatus)}>
                      <SelectTrigger className="h-9 w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="reviewed">Reviewed</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="secondary" onClick={() => saveNote(f.id)}>
                      Save reply
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setPendingDelete(f.id)}
                    >
                      <Trash2 className="mr-1.5 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="users" className="mt-5">
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Registered users ({users.length})</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">User</th>
                    <th className="py-2 pr-3 font-medium">Joined</th>
                    <th className="py-2 pr-3 font-medium tabular-nums">Items</th>
                    <th className="py-2 pr-3 font-medium tabular-nums">Pantry</th>
                    <th className="py-2 pr-3 font-medium tabular-nums">Recipes</th>
                    <th className="py-2 pr-3 font-medium">Admin</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-t border-border/50">
                      <td className="py-2.5 pr-3">
                        <div className="font-medium text-foreground">{u.full_name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </td>
                      <td className="py-2.5 pr-3 text-muted-foreground">
                        {u.created_at ? format(parseISO(u.created_at), "d MMM yyyy") : "—"}
                      </td>
                      <td className="py-2.5 pr-3 tabular-nums">{u.item_count}</td>
                      <td className="py-2.5 pr-3 tabular-nums">{u.inventory_count}</td>
                      <td className="py-2.5 pr-3 tabular-nums">{u.recipe_count}</td>
                      <td className="py-2.5 pr-3">
                        {u.id === user?.id ? (
                          <Badge variant="outline">You</Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant={u.is_admin ? "secondary" : "outline"}
                            disabled={savingRole === u.id}
                            onClick={() => toggleAdmin(u.id, !u.is_admin)}
                          >
                            {savingRole === u.id && (
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            )}
                            {u.is_admin ? "Revoke admin" : "Make admin"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="mt-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {statCards.map((s) => (
              <Card key={s.label} className="rounded-2xl">
                <CardContent className="space-y-1 p-4">
                  <s.icon className="h-4 w-4 text-muted-foreground" />
                  <p className="font-display text-2xl font-bold tabular-nums text-foreground">
                    {s.value ?? "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!pendingDelete} onOpenChange={(v) => !v && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this feedback?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the submission. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!pendingDelete) return;
                try {
                  await deleteFeedback.mutateAsync(pendingDelete);
                  toast.success("Feedback deleted");
                } catch (err: unknown) {
                  toast.error(err instanceof Error ? err.message : "Couldn't delete feedback.");
                } finally {
                  setPendingDelete(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Admin;
