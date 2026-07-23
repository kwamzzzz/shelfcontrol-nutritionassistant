import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Apple, BookOpen, GlassWater, Target, Brain, HeartPulse, Wallet } from "lucide-react";
import NutritionDashboard from "@/components/nutrition/NutritionDashboard";
import FoodDiary from "@/components/nutrition/FoodDiary";
import WaterTracker from "@/components/nutrition/WaterTracker";
import GoalsProgress from "@/components/nutrition/GoalsProgress";
import NutritionInsights from "@/components/nutrition/NutritionInsights";
import SymptomLog from "@/components/nutrition/SymptomLog";
import CalorieBudget from "@/components/nutrition/CalorieBudget";

const SECTIONS = [
  { value: "dashboard", label: "Dashboard", icon: Apple },
  { value: "diary", label: "Diary", icon: BookOpen },
  { value: "water", label: "Water", icon: GlassWater },
  { value: "goals", label: "Goals", icon: Target },
  { value: "budget", label: "Budget", icon: Wallet },
  { value: "symptoms", label: "Symptoms", icon: HeartPulse },
  { value: "insights", label: "Insights", icon: Brain },
];

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
        {/* Phone: labeled section selector */}
        <div className="mb-4 md:hidden">
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SECTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  <span className="flex items-center gap-2">
                    <s.icon className="h-4 w-4" />
                    {s.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* Tablet / desktop: visible tabs */}
        <TabsList className="mb-6 hidden h-auto w-full flex-wrap justify-start rounded-xl bg-muted/50 p-1 md:flex">
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
