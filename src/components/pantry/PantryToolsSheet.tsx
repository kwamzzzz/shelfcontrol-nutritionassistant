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

const TOOLS: { key: Tool; label: string; desc: string; icon: LucideIcon; tone: string }[] = [
  { key: "stats", label: "Pantry pulse", desc: "Monthly spend, most-bought and totals", icon: BarChart3, tone: "var(--bento-emerald)" },
  { key: "shelfLife", label: "Shelf life", desc: "Set storage and estimate best-before dates", icon: CalendarClock, tone: "var(--bento-cobalt)" },
  { key: "cleanup", label: "Tidy up", desc: "Archive old items from your active pantry", icon: Recycle, tone: "var(--bento-amber)" },
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
          <DrawerHeader className="px-5 pt-4 pb-2 text-left">
            <DrawerTitle className="font-serif text-2xl">Pantry tools</DrawerTitle>
            <DrawerDescription>Manage storage, tidy up, and review your history.</DrawerDescription>
          </DrawerHeader>
          <div className="grid gap-3 px-5 pb-5">
            {TOOLS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => launch(t.key)}
                className="bento-action"
                style={{ ["--tone" as any]: t.tone }}
              >
                <span className="bento-well">
                  <t.icon className="h-5 w-5" strokeWidth={2.2} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-semibold text-foreground">{t.label}</span>
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
