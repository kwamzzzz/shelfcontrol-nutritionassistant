import { useState, useMemo } from "react";
import { useItems, useInventory, type Item } from "@/hooks/usePantry";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, BookOpen, Pencil } from "lucide-react";
import EditItemDialog from "./EditItemDialog";
import AddItemDialog from "./AddItemDialog";

const ItemCatalogSection = () => {
  const { data: items, isLoading } = useItems();
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-8">
        <div className="flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <BookOpen className="h-4 w-4" />
              Item Catalog
              {items && (
                <Badge variant="secondary" className="text-xs font-normal ml-1">
                  {items.length}
                </Badge>
              )}
            </button>
          </CollapsibleTrigger>
          <AddItemDialog />
        </div>

        <CollapsibleContent className="mt-3">
          {isLoading ? (
            <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
              Loading catalog...
            </div>
          ) : !items?.length ? (
            <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
              No catalog items yet. Create one to get started.
            </div>
          ) : (
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Name</th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Category</th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Unit</th>
                      <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Cal</th>
                      <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">P</th>
                      <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">C</th>
                      <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">F</th>
                      <th className="px-4 py-2.5 w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b last:border-b-0 hover:bg-accent/30 transition-colors"
                      >
                        <td className="px-4 py-2.5 font-medium text-foreground">{item.name}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {item.category ?? <span className="text-muted-foreground/40">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">{item.default_unit ?? "unit"}</td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground tabular-nums">
                          {item.calories_per_unit ?? 0}
                        </td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground tabular-nums">
                          {item.protein_g ?? 0}g
                        </td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground tabular-nums">
                          {item.carbs_g ?? 0}g
                        </td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground tabular-nums">
                          {item.fat_g ?? 0}g
                        </td>
                        <td className="px-4 py-2.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setEditingItem(item)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      {editingItem && (
        <EditItemDialog item={editingItem} open={!!editingItem} onClose={() => setEditingItem(null)} />
      )}
    </>
  );
};

export default ItemCatalogSection;
