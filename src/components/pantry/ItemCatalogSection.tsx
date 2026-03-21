import { useState, useMemo } from "react";
import { useItems, useInventory, useUpdateItem, type Item } from "@/hooks/usePantry";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronRight, BookOpen, Pencil } from "lucide-react";
import EditItemDialog from "./EditItemDialog";
import AddItemDialog from "./AddItemDialog";
import { useToast } from "@/hooks/use-toast";

const ItemCatalogSection = () => {
  const { data: items, isLoading } = useItems();
  const { data: inventory } = useInventory();
  const updateItem = useUpdateItem();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [inlineEdit, setInlineEdit] = useState<{ id: string; field: string; value: string } | null>(null);

  const inventoryCountByItem = useMemo(() => {
    const counts: Record<string, number> = {};
    inventory?.forEach((inv) => {
      counts[inv.item_id] = (counts[inv.item_id] ?? 0) + 1;
    });
    return counts;
  }, [inventory]);

  const handleInlineBlur = async () => {
    if (!inlineEdit) return;
    const { id, field, value } = inlineEdit;
    try {
      await updateItem.mutateAsync({ id, [field]: value ? Number(value) : 0 });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setInlineEdit(null);
  };

  const renderNutritionCell = (item: Item, field: "calories_per_unit" | "protein_g" | "carbs_g" | "fat_g", suffix: string = "") => {
    const val = item[field] ?? 0;
    const isEditing = inlineEdit?.id === item.id && inlineEdit?.field === field;

    if (isEditing) {
      return (
        <Input
          type="number"
          min={0}
          step="any"
          className="h-7 w-16 text-xs text-right tabular-nums"
          value={inlineEdit.value}
          onChange={(e) => setInlineEdit({ ...inlineEdit, value: e.target.value })}
          onBlur={handleInlineBlur}
          onKeyDown={(e) => { if (e.key === "Enter") handleInlineBlur(); if (e.key === "Escape") setInlineEdit(null); }}
          autoFocus
        />
      );
    }

    return (
      <span
        className="cursor-pointer hover:text-foreground hover:underline underline-offset-2 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          setInlineEdit({ id: item.id, field, value: String(val) });
        }}
      >
        {val}{suffix}
      </span>
    );
  };

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
                      <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">In Use</th>
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
                        <td className="px-4 py-2.5 text-muted-foreground">{item.default_unit ?? "Unit"}</td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground tabular-nums">
                          {renderNutritionCell(item, "calories_per_unit")}
                        </td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground tabular-nums">
                          {renderNutritionCell(item, "protein_g", "g")}
                        </td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground tabular-nums">
                          {renderNutritionCell(item, "carbs_g", "g")}
                        </td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground tabular-nums">
                          {renderNutritionCell(item, "fat_g", "g")}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {inventoryCountByItem[item.id] ? (
                            <Badge variant="secondary" className="text-xs font-normal">
                              {inventoryCountByItem[item.id]}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground/40 text-xs">—</span>
                          )}
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
