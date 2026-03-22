import { useGroupContext } from "@/contexts/GroupContext";
import { useGroups } from "@/hooks/useGroups";
import { Users, ChevronDown, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const GroupSwitcher = () => {
  const { activeGroupId, setActiveGroupId, isPersonalMode } = useGroupContext();
  const { groups, isLoading } = useGroups();

  const activeGroup = groups.find((g) => g.id === activeGroupId);
  const label = isPersonalMode ? "Personal" : activeGroup?.name ?? "Personal";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 rounded-xl font-medium">
          {isPersonalMode ? (
            <User className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Users className="h-4 w-4 text-primary" />
          )}
          <span className="max-w-[120px] truncate">{label}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onClick={() => setActiveGroupId(null)}
          className={isPersonalMode ? "bg-accent" : ""}
        >
          <User className="mr-2 h-4 w-4" />
          Personal
        </DropdownMenuItem>
        {groups.length > 0 && <DropdownMenuSeparator />}
        {groups.map((group) => (
          <DropdownMenuItem
            key={group.id}
            onClick={() => setActiveGroupId(group.id)}
            className={activeGroupId === group.id ? "bg-accent" : ""}
          >
            <Users className="mr-2 h-4 w-4" />
            <span className="truncate">{group.name}</span>
            {group.type && (
              <span className="ml-auto text-xs text-muted-foreground">{group.type}</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default GroupSwitcher;
