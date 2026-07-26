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

const ACTIONS: {
  key: QuickAction;
  title: string;
  sub: string;
  icon: LucideIcon;
  tone: string;
}[] = [
  { key: "inventory", title: "Add item", sub: "To pantry", icon: PackagePlus, tone: "var(--bento-emerald)" },
  { key: "purchase", title: "Log purchase", sub: "Trip & receipt", icon: Receipt, tone: "var(--bento-cobalt)" },
  { key: "consumption", title: "Used or ate", sub: "Log food", icon: Heart, tone: "var(--bento-amber)" },
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
          <DrawerHeader className="px-5 pt-4 pb-2 text-left">
            <DrawerTitle className="font-serif text-2xl">Quick Add</DrawerTitle>
            <DrawerDescription>Pick what you want to capture.</DrawerDescription>
          </DrawerHeader>
          <div className="grid gap-3 px-5 pb-5">
            {ACTIONS.map((a) => (
              <button
                key={a.key}
                type="button"
                onClick={() => launch(a.key)}
                className="bento-action"
                style={{ ["--tone" as any]: a.tone }}
              >
                <span className="bento-well">
                  <a.icon className="h-5 w-5" strokeWidth={2.2} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-semibold text-foreground">{a.title}</span>
                  <span className="block text-sm text-muted-foreground">{a.sub}</span>
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
