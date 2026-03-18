import { useState } from "react";
import { formatCurrency } from "@/lib/currency";
import { type PurchaseWithItems, useDeletePurchase } from "@/hooks/usePurchases";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ChevronDown, ChevronRight, Store, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface Props {
  purchase: PurchaseWithItems;
}

const PurchaseCard = ({ purchase }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const deletePurchase = useDeletePurchase();
  const { toast } = useToast();

  const handleDelete = async () => {
    try {
      await deletePurchase.mutateAsync(purchase.id);
      toast({ title: "Deleted", description: "Purchase removed." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const itemCount = purchase.purchase_items?.length ?? 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-xl border bg-card overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center gap-3 p-4 text-left hover:bg-accent/30 transition-colors">
            <div className="shrink-0">
              {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {purchase.store_name ? (
                  <p className="font-medium text-foreground truncate">{purchase.store_name}</p>
                ) : (
                  <p className="font-medium text-muted-foreground italic">No store</p>
                )}
                <Badge variant="secondary" className="text-xs font-normal shrink-0">
                  {itemCount} item{itemCount !== 1 ? "s" : ""}
                </Badge>
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                <span>{format(parseISO(purchase.purchased_at), "MMM d, yyyy")}</span>
                {purchase.notes && <span className="truncate">· {purchase.notes}</span>}
              </div>
            </div>
            <div className="ml-4 shrink-0 text-right">
              {purchase.total_cost != null && purchase.total_cost > 0 && (
                <span className="text-sm font-semibold text-foreground">{formatCurrency(Number(purchase.total_cost))}</span>
              )}
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t px-4 pb-3 pt-2">
            {purchase.purchase_items?.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground">
                    <th className="text-left py-1.5 font-medium">Item</th>
                    <th className="text-right py-1.5 font-medium">Qty</th>
                    <th className="text-right py-1.5 font-medium">Unit</th>
                    <th className="text-right py-1.5 font-medium">Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {purchase.purchase_items.map((pi) => (
                    <tr key={pi.id} className="border-t border-border/50">
                      <td className="py-1.5 text-foreground">{pi.items?.name ?? "Unknown"}</td>
                      <td className="py-1.5 text-right text-muted-foreground tabular-nums">{pi.quantity}</td>
                      <td className="py-1.5 text-right text-muted-foreground">{pi.unit}</td>
                      <td className="py-1.5 text-right text-foreground tabular-nums font-medium">
                        {pi.unit_price != null ? `$${Number(pi.unit_price).toFixed(2)}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="py-2 text-sm text-muted-foreground">No line items recorded.</p>
            )}

            <div className="mt-3 flex justify-end">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this purchase?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove the purchase and all its line items. Inventory entries created via restock will not be removed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

export default PurchaseCard;
