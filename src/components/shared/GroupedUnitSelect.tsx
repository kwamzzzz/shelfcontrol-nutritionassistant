import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UNIT_GROUPS } from "@/lib/pantry-utils";

interface Props {
  value: string;
  onValueChange: (v: string) => void;
  className?: string;
  triggerClassName?: string;
  placeholder?: string;
}

const GroupedUnitSelect = ({ value, onValueChange, className, triggerClassName, placeholder }: Props) => {
  // Keep a stored unit visible even when it isn't in the curated list (e.g. legacy "unit").
  const known = UNIT_GROUPS.some((group) => group.units.includes(value));
  return (
  <Select value={value} onValueChange={onValueChange}>
    <SelectTrigger className={triggerClassName ?? className}>
      <SelectValue placeholder={placeholder ?? "Unit"} />
    </SelectTrigger>
    <SelectContent className="max-h-60">
      {value && !known && (
        <SelectGroup>
          <SelectLabel className="text-xs text-muted-foreground font-semibold">Current</SelectLabel>
          <SelectItem value={value}>{value}</SelectItem>
        </SelectGroup>
      )}
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
};

export default GroupedUnitSelect;
