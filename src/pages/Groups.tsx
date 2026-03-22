import { useState } from "react";
import { useGroups } from "@/hooks/useGroups";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, Trash2 } from "lucide-react";
import CreateGroupDialog from "@/components/groups/CreateGroupDialog";
import { toast } from "sonner";

const Groups = () => {
  const { groups, isLoading, deleteGroup } = useGroups();
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();

  const handleDelete = async (e: React.MouseEvent, groupId: string) => {
    e.stopPropagation();
    deleteGroup.mutate(groupId, {
      onSuccess: () => toast.success("Group deleted"),
      onError: () => toast.error("Failed to delete group"),
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Groups</h1>
          <p className="text-muted-foreground mt-1">
            {groups.length} group{groups.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2 rounded-xl">
          <Plus className="h-4 w-4" />
          Create Group
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : groups.length === 0 ? (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold mb-1">No groups yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create a group to share pantry, purchases, and shopping lists with others.
            </p>
            <Button onClick={() => setShowCreate(true)} variant="outline" className="rounded-xl gap-2">
              <Plus className="h-4 w-4" />
              Create your first group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <Card
              key={group.id}
              className="rounded-2xl shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => navigate(`/groups/${group.id}`)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, group.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </button>
                </div>
                <h3 className="font-semibold text-lg">{group.name}</h3>
                {group.type && (
                  <Badge variant="secondary" className="mt-2 text-xs capitalize">
                    {group.type}
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateGroupDialog open={showCreate} onOpenChange={setShowCreate} />
    </div>
  );
};

export default Groups;
