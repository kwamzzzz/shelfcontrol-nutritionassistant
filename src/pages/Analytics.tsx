import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAnalytics } from "@/hooks/useAnalytics";
import OverviewTab from "@/components/analytics/OverviewTab";
import FoodPantryTab from "@/components/analytics/FoodPantryTab";
import ConsumptionHealthTab from "@/components/analytics/ConsumptionHealthTab";
import SpendValueTab from "@/components/analytics/SpendValueTab";
import { useGroupContext } from "@/contexts/GroupContext";
import { useGroups } from "@/hooks/useGroups";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

const Analytics = () => {
  const data = useAnalytics();
  const { activeGroupId, isPersonalMode } = useGroupContext();
  const { groups } = useGroups();
  const activeGroup = groups.find((g) => g.id === activeGroupId);
  const contextLabel = isPersonalMode ? "Personal" : activeGroup?.name ?? "Group";

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-analytics font-semibold text-foreground tracking-tight">Analytics</h1>
          {!isPersonalMode && (
            <Badge variant="secondary" className="gap-1 text-xs">
              <Users className="h-3 w-3" />
              Shared
            </Badge>
          )}
        </div>
        <p className="mt-1 text-muted-foreground font-analytics font-medium">
          {contextLabel} intelligence workspace{!isPersonalMode ? " — shared data from all members" : ""}.
        </p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="mb-6 w-full sm:w-auto bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="overview" className="font-analytics rounded-lg text-xs font-semibold">Overview</TabsTrigger>
          <TabsTrigger value="food_pantry" className="font-analytics rounded-lg text-xs font-semibold">Food & Pantry</TabsTrigger>
          <TabsTrigger value="consumption" className="font-analytics rounded-lg text-xs font-semibold">Consumption</TabsTrigger>
          <TabsTrigger value="spend_value" className="font-analytics rounded-lg text-xs font-semibold">Spend & Value</TabsTrigger>
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
