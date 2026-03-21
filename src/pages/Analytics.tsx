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
      <h1 className="text-3xl font-display font-bold text-foreground">Analytics</h1>
      <p className="mt-1 text-muted-foreground">Intelligence workspace for your household.</p>

      <Tabs defaultValue="overview" className="mt-6">
        <TabsList className="mb-6 w-full sm:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="food_pantry">Food & Pantry</TabsTrigger>
          <TabsTrigger value="consumption">Consumption</TabsTrigger>
          <TabsTrigger value="spend_value">Spend & Value</TabsTrigger>
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
