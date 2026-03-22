import { useState } from "react";
import { useGroups } from "@/hooks/useGroups";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const groupTypes = [
  { value: "household", label: "Household" },
  { value: "couple", label: "Couple" },
  { value: "roommates", label: "Roommates" },
  { value: "fitness", label: "Fitness Group" },
  { value: "other", label: "Other" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateGroupDialog = ({ open, onOpenChange }: Props) => {
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("");
  const { createGroup } = useGroups();

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error("Group name is required");
      return;
    }
    createGroup.mutate(
      { name: name.trim(), type: type || undefined },
      {
        onSuccess: () => {
          toast.success("Group created");
          setName("");
          setType("");
          onOpenChange(false);
        },
        onError: () => toast.error("Failed to create group"),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Group</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Group Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Our Household"
              className="mt-1 rounded-xl"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Type (optional)</label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="mt-1 rounded-xl">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {groupTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createGroup.isPending} className="rounded-xl">
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroupDialog;
