import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Apple, BookOpen, GlassWater, Target, Brain, HeartPulse, Wallet } from "lucide-react";
import NutritionDashboard from "@/components/nutrition/NutritionDashboard";
import FoodDiary from "@/components/nutrition/FoodDiary";
import WaterTracker from "@/components/nutrition/WaterTracker";
import GoalsProgress from "@/components/nutrition/GoalsProgress";
import NutritionInsights from "@/components/nutrition/NutritionInsights";
import SymptomLog from "@/components/nutrition/SymptomLog";
import CalorieBudget from "@/components/nutrition/CalorieBudget";

const Nutrition = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-2">
          <Apple className="h-7 w-7 text-primary" />
          Nutrition
        </h1>
        <p className="mt-1 text-muted-foreground">Track, understand, and improve your nutrition</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start mb-6 bg-muted/50 rounded-xl p-1 h-auto flex-wrap">
          <TabsTrigger value="dashboard" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm gap-1.5 text-xs sm:text-sm">
            <Apple className="h-3.5 w-3.5" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="diary" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm gap-1.5 text-xs sm:text-sm">
            <BookOpen className="h-3.5 w-3.5" />
            Diary
          </TabsTrigger>
          <TabsTrigger value="water" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm gap-1.5 text-xs sm:text-sm">
            <GlassWater className="h-3.5 w-3.5" />
            Water
          </TabsTrigger>
          <TabsTrigger value="goals" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm gap-1.5 text-xs sm:text-sm">
            <Target className="h-3.5 w-3.5" />
            Goals
          </TabsTrigger>
          <TabsTrigger value="budget" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm gap-1.5 text-xs sm:text-sm">
            <Wallet className="h-3.5 w-3.5" />
            Budget
          </TabsTrigger>
          <TabsTrigger value="symptoms" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm gap-1.5 text-xs sm:text-sm">
            <HeartPulse className="h-3.5 w-3.5" />
            Symptoms
          </TabsTrigger>
          <TabsTrigger value="insights" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm gap-1.5 text-xs sm:text-sm">
            <Brain className="h-3.5 w-3.5" />
            Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <NutritionDashboard onNavigate={setActiveTab} />
        </TabsContent>
        <TabsContent value="diary">
          <FoodDiary />
        </TabsContent>
        <TabsContent value="water">
          <WaterTracker />
        </TabsContent>
        <TabsContent value="goals">
          <GoalsProgress />
        </TabsContent>
        <TabsContent value="budget">
          <CalorieBudget />
        </TabsContent>
        <TabsContent value="symptoms">
          <SymptomLog />
        </TabsContent>
        <TabsContent value="insights">
          <NutritionInsights />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Nutrition;
