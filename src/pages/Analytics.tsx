import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAnalytics } from "@/hooks/useAnalytics";
import OverviewTab from "@/components/analytics/OverviewTab";
import FoodPantryTab from "@/components/analytics/FoodPantryTab";
import ConsumptionHealthTab from "@/components/analytics/ConsumptionHealthTab";
import SpendValueTab from "@/components/analytics/SpendValueTab";
import { useGroupContext } from "@/contexts/GroupContext";
import { useGroups } from "@/hooks/useGroups";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { StoryArt } from "@/components/story/StoryArt";

const Analytics = () => {
  const data = useAnalytics();
  const { activeGroupId, isPersonalMode } = useGroupContext();
  const { groups } = useGroups();
  const navigate = useNavigate();
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

      <button
        type="button"
        onClick={() => navigate("/kitchen-story")}
        className="relative mb-6 flex w-full items-center gap-4 overflow-hidden rounded-2xl border border-border bg-card/60 p-4 text-left transition-colors hover:bg-accent active:scale-[0.99]"
      >
        <StoryArt name="badge" className="absolute -bottom-5 -right-2 h-24 w-auto opacity-60" />
        <span className="relative z-10 min-w-0 flex-1">
          <span className="block font-[Outfit,sans-serif] text-base font-semibold text-foreground">
            Your Kitchen Story
          </span>
          <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
            The same data, told warmly — what you rescued, how you shop, your streaks.
          </span>
        </span>
        <ChevronRight className="relative z-10 h-5 w-5 shrink-0 text-muted-foreground" />
      </button>

      <Tabs defaultValue="overview">
        <TabsList className="mb-6 flex w-full overflow-x-auto bg-muted/50 p-1 rounded-xl sm:w-auto">
          <TabsTrigger value="overview" className="shrink-0 font-analytics rounded-lg text-xs font-semibold">Overview</TabsTrigger>
          <TabsTrigger value="food_pantry" className="shrink-0 font-analytics rounded-lg text-xs font-semibold">Food & Pantry</TabsTrigger>
          <TabsTrigger value="consumption" className="shrink-0 font-analytics rounded-lg text-xs font-semibold">Consumption</TabsTrigger>
          <TabsTrigger value="spend_value" className="shrink-0 font-analytics rounded-lg text-xs font-semibold">Spend & Value</TabsTrigger>
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
