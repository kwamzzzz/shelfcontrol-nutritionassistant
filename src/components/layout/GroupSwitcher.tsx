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

const GroupSwitcher = () => {
  const { activeGroupId, setActiveGroupId, isPersonalMode } = useGroupContext();
  const { groups } = useGroups();

  const activeGroup = groups.find((g) => g.id === activeGroupId);
  const label = isPersonalMode ? "Personal" : activeGroup?.name ?? "Personal";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 glass-card glass-card-hover rounded-full px-4 py-2 text-sm font-medium text-foreground">
          {isPersonalMode ? (
            <User className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Users className="h-4 w-4 text-[#34D399]" />
          )}
          <span className="max-w-[120px] truncate">{label}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 glass-card border-white/[0.06] bg-card">
        <DropdownMenuItem
          onClick={() => setActiveGroupId(null)}
          className={isPersonalMode ? "bg-white/[0.08]" : ""}
        >
          <User className="mr-2 h-4 w-4" />
          Personal
        </DropdownMenuItem>
        {groups.length > 0 && <DropdownMenuSeparator className="bg-white/[0.06]" />}
        {groups.map((group) => (
          <DropdownMenuItem
            key={group.id}
            onClick={() => setActiveGroupId(group.id)}
            className={activeGroupId === group.id ? "bg-white/[0.08]" : ""}
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
