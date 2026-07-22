import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { GroupProvider } from "@/contexts/GroupContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import AppLayout from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Pantry from "@/pages/Pantry";
import ShoppingList from "@/pages/ShoppingList";
import Recipes from "@/pages/Recipes";
import RecipeDetail from "@/pages/RecipeDetail";
import Consumption from "@/pages/Consumption";
import Analytics from "@/pages/Analytics";
import Purchases from "@/pages/Purchases";
import Groups from "@/pages/Groups";
import GroupDetail from "@/pages/GroupDetail";
import Challenges from "@/pages/Challenges";
import Profile from "@/pages/Profile";
import Settings from "@/pages/Settings";
import Auth from "@/pages/Auth";
import NotFound from "@/pages/NotFound";
import AcceptInvite from "@/pages/AcceptInvite";
import Invitations from "@/pages/Invitations";
import Intelligence from "@/pages/Intelligence";
import Nutrition from "@/pages/Nutrition";
import FoodIntelligence from "@/pages/FoodIntelligence";
import Coach from "@/pages/Coach";

const queryClient = new QueryClient();

const ProtectedRoutes = () => {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <GroupProvider>
      <SidebarProvider>
        <AppLayout />
      </SidebarProvider>
    </GroupProvider>
  );
};

const AuthRoute = () => {
  const { session, loading } = useAuth();

  if (loading) return null;
  if (session) return <Navigate to="/" replace />;

  return <Auth />;
};

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AuthRoute />} />
          <Route path="/invite/:token" element={<AcceptInvite />} />
          <Route element={<ProtectedRoutes />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/pantry" element={<Pantry />} />
            <Route path="/shopping" element={<ShoppingList />} />
            <Route path="/purchases" element={<Purchases />} />
            <Route path="/recipes" element={<Recipes />} />
            <Route path="/recipes/:id" element={<RecipeDetail />} />
            <Route path="/consumption" element={<Consumption />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/intelligence" element={<Intelligence />} />
            <Route path="/food-intelligence" element={<FoodIntelligence />} />
            <Route path="/nutrition" element={<Nutrition />} />
            <Route path="/coach" element={<Coach />} />
            <Route path="/groups" element={<Groups />} />
            <Route path="/groups/:id" element={<GroupDetail />} />
            <Route path="/invitations" element={<Invitations />} />
            <Route path="/challenges" element={<Challenges />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
