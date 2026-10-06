import { useState } from "react";
import { parseISO, format } from "date-fns";
import { toast } from "sonner";
import {
  ShieldCheck, Users, Package, UtensilsCrossed, Receipt, ShoppingCart,
  MessageSquare, ShieldOff, Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useIsAdmin, useAdminStats, useAdminUsers } from "@/hooks/useAdmin";
import { useAllFeedback, useDeleteFeedback } from "@/hooks/useFeedback";
import FeedbackInbox from "@/components/feedback/FeedbackInbox";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

const Admin = () => {
  const { isAdmin, isLoading: checkingRole } = useIsAdmin();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: stats } = useAdminStats(isAdmin);
  const { data: users = [] } = useAdminUsers(isAdmin);
  const { data: feedback = [] } = useAllFeedback(isAdmin);
  const deleteFeedback = useDeleteFeedback();

  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [savingRole, setSavingRole] = useState<string | null>(null);
  const emails = Object.fromEntries(users.map((u) => [u.id, u.email ?? ""]));

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

        <TabsContent value="feedback" className="mt-5">
          <FeedbackInbox feedback={feedback} emails={emails} onDelete={setPendingDelete} />
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
