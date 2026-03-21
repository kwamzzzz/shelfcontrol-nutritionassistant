import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAnalytics } from "@/hooks/useAnalytics";
import OverviewTab from "@/components/analytics/OverviewTab";
import FoodPantryTab from "@/components/analytics/FoodPantryTab";
import ConsumptionHealthTab from "@/components/analytics/ConsumptionHealthTab";
import SpendValueTab from "@/components/analytics/SpendValueTab";

const Analytics = () => {
  const data = useAnalytics();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-analytics font-light text-foreground tracking-tight">Analytics</h1>
        <p className="mt-1 text-muted-foreground font-analytics">Intelligence workspace for your household.</p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="mb-6 w-full sm:w-auto bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="overview" className="font-analytics rounded-lg text-xs">Overview</TabsTrigger>
          <TabsTrigger value="food_pantry" className="font-analytics rounded-lg text-xs">Food & Pantry</TabsTrigger>
          <TabsTrigger value="consumption" className="font-analytics rounded-lg text-xs">Consumption</TabsTrigger>
          <TabsTrigger value="spend_value" className="font-analytics rounded-lg text-xs">Spend & Value</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab data={data} />
        </TabsContent>
        <TabsContent value="food_pantry">
          <FoodPantryTab data={data} />
        </TabsContent>
        <TabsContent value="consumption">
          <ConsumptionHealthTab data={data} />
        </TabsContent>
        <TabsContent value="spend_value">
          <SpendValueTab data={data} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analytics;
