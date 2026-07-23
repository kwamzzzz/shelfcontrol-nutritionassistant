import { useState } from "react";
import { Receipt, Heart, PackagePlus, type LucideIcon } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import AddPurchaseDialog from "@/components/purchases/AddPurchaseDialog";
import AddConsumptionDialog from "@/components/consumption/AddConsumptionDialog";
import AddInventoryDialog from "@/components/pantry/AddInventoryDialog";

interface QuickAddSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type QuickAction = "purchase" | "consumption" | "inventory";

const ACTIONS: { key: QuickAction; label: string; desc: string; icon: LucideIcon }[] = [
  { key: "purchase", label: "Log Purchase", desc: "Add a shopping trip and its items", icon: Receipt },
  { key: "consumption", label: "Log Consumption", desc: "Record what you used or ate", icon: Heart },
  { key: "inventory", label: "Add Pantry Item", desc: "Add stock to your pantry", icon: PackagePlus },
];

/**
 * Quick Add bottom sheet launched from the bottom-nav Add button. Reuses the
 * existing dialogs (driven controlled) so there is no duplicated business logic.
 */
const QuickAddSheet = ({ open, onOpenChange }: QuickAddSheetProps) => {
  const [active, setActive] = useState<QuickAction | null>(null);

  const launch = (action: QuickAction) => {
    onOpenChange(false);
    setActive(action);
  };

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader className="text-center">
            <DrawerTitle>Quick Add</DrawerTitle>
            <DrawerDescription>Log an activity or add to your pantry.</DrawerDescription>
          </DrawerHeader>
          <div className="grid gap-2 px-4 pb-4">
            {ACTIONS.map((a) => (
              <button
                key={a.key}
                type="button"
                onClick={() => launch(a.key)}
                className="flex items-center gap-4 rounded-2xl border border-border bg-card/60 p-4 text-left transition-colors hover:bg-accent active:bg-accent"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <a.icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block font-medium text-foreground">{a.label}</span>
                  <span className="block text-sm text-muted-foreground">{a.desc}</span>
                </span>
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Controlled dialogs — no built-in trigger; opened from the sheet. */}
      <AddPurchaseDialog open={active === "purchase"} onOpenChange={(o) => !o && setActive(null)} hideTrigger />
      <AddConsumptionDialog open={active === "consumption"} onOpenChange={(o) => !o && setActive(null)} hideTrigger />
      <AddInventoryDialog open={active === "inventory"} onOpenChange={(o) => !o && setActive(null)} hideTrigger />
    </>
  );
};

export default QuickAddSheet;
