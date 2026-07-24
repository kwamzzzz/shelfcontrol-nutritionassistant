import { useState } from "react";
import { BarChart3, Recycle, CalendarClock, type LucideIcon } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import PantryStatsDialog from "@/components/pantry/PantryStatsDialog";
import PantryCleanupDialog from "@/components/pantry/PantryCleanupDialog";
import ShelfLifeManager from "@/components/pantry/ShelfLifeManager";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Tool = "stats" | "cleanup" | "shelfLife";

const TOOLS: { key: Tool; label: string; desc: string; icon: LucideIcon }[] = [
  { key: "stats", label: "Statistics", desc: "Monthly spend, most-bought and totals", icon: BarChart3 },
  { key: "shelfLife", label: "Shelf-Life Manager", desc: "Set storage and estimate best-before dates", icon: CalendarClock },
  { key: "cleanup", label: "Bulk Cleanup", desc: "Archive old items from your active pantry", icon: Recycle },
];

/**
 * Phone-only progressive disclosure for the Pantry's secondary tools. These
 * three dialogs keep their own triggers on tablet/desktop, where the toolbar has
 * room; on a phone they would otherwise wrap into a second row of equally
 * prominent buttons competing with the primary task of finding an item.
 */
const PantryToolsSheet = ({ open, onOpenChange }: Props) => {
  const [active, setActive] = useState<Tool | null>(null);

  const launch = (tool: Tool) => {
    onOpenChange(false);
    setActive(tool);
  };

  const close = (o: boolean) => {
    if (!o) setActive(null);
  };

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader className="text-center">
            <DrawerTitle>Pantry tools</DrawerTitle>
            <DrawerDescription>Manage storage, tidy up, and review your history.</DrawerDescription>
          </DrawerHeader>
          <div className="grid gap-2 px-4 pb-4">
            {TOOLS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => launch(t.key)}
                className="flex min-h-[56px] items-center gap-4 rounded-2xl border border-border bg-card/60 p-4 text-left transition-colors hover:bg-accent active:bg-accent"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <t.icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[0.9375rem] font-medium text-foreground">{t.label}</span>
                  <span className="block text-sm text-muted-foreground">{t.desc}</span>
                </span>
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Controlled, trigger-less instances opened from the sheet. */}
      <PantryStatsDialog open={active === "stats"} onOpenChange={close} hideTrigger />
      <PantryCleanupDialog open={active === "cleanup"} onOpenChange={close} hideTrigger />
      <ShelfLifeManager open={active === "shelfLife"} onOpenChange={close} hideTrigger />
    </>
  );
};

export default PantryToolsSheet;
