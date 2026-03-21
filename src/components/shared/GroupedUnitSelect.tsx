import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UNIT_GROUPS } from "@/lib/pantry-utils";

interface Props {
  value: string;
  onValueChange: (v: string) => void;
  className?: string;
  triggerClassName?: string;
  placeholder?: string;
}

const GroupedUnitSelect = ({ value, onValueChange, className, triggerClassName, placeholder }: Props) => (
  <Select value={value} onValueChange={onValueChange}>
    <SelectTrigger className={triggerClassName ?? className}>
      <SelectValue placeholder={placeholder ?? "Unit"} />
    </SelectTrigger>
    <SelectContent className="max-h-60">
      {UNIT_GROUPS.map((group) => (
        <SelectGroup key={group.label}>
          <SelectLabel className="text-xs text-muted-foreground font-semibold">{group.label}</SelectLabel>
          {group.units.map((u) => (
            <SelectItem key={u} value={u}>{u}</SelectItem>
          ))}
        </SelectGroup>
      ))}
    </SelectContent>
  </Select>
);

export default GroupedUnitSelect;
