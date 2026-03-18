import { usePurchases } from "@/hooks/usePurchases";
import { formatCurrency } from "@/lib/currency";
import AddPurchaseDialog from "@/components/purchases/AddPurchaseDialog";
import PurchaseCard from "@/components/purchases/PurchaseCard";
import { Receipt } from "lucide-react";

const Purchases = () => {
  const { data: purchases, isLoading } = usePurchases();

  const totalSpent = purchases?.reduce((sum, p) => sum + Number(p.total_cost ?? 0), 0) ?? 0;

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Purchases</h1>
          <p className="mt-1 text-muted-foreground">
            {purchases?.length ?? 0} purchase{(purchases?.length ?? 0) !== 1 ? "s" : ""} recorded
            {totalSpent > 0 && <span className="ml-1">· {formatCurrency(totalSpent)} total</span>}
          </p>
        </div>
        <AddPurchaseDialog />
      </div>

      <div className="mt-6 space-y-3">
        {isLoading ? (
          <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">Loading...</div>
        ) : !purchases?.length ? (
          <div className="rounded-xl border bg-card p-8 text-center">
            <Receipt className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-muted-foreground">
              No purchases yet. Log your first grocery trip to get started.
            </p>
          </div>
        ) : (
          purchases.map((purchase) => (
            <PurchaseCard key={purchase.id} purchase={purchase} />
          ))
        )}
      </div>
    </div>
  );
};

export default Purchases;
