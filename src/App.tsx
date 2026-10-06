import { useEffect, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Outlet, Route, Routes, Navigate, useNavigate } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
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
import KitchenStory from "@/pages/KitchenStory";
import PricePassport from "@/pages/PricePassport";
import ItemCatalog from "@/pages/ItemCatalog";
import PantryAlert from "@/pages/PantryAlert";
import Feedback from "@/pages/Feedback";
import Admin from "@/pages/Admin";
import ResetPassword from "@/pages/ResetPassword";

const queryClient = new QueryClient();

const AuthGate = ({ children }: { children: ReactNode }) => {
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

  return <>{children}</>;
};

const ProtectedRoutes = () => (
  <AuthGate>
    <GroupProvider>
      <SidebarProvider>
        <AppLayout />
      </SidebarProvider>
    </GroupProvider>
  </AuthGate>
);

/**
 * Signed-in routes that deliberately render without the app chrome — no header,
 * no bottom navigation. Group scope still applies, so these screens read the
 * same personal/household data as the rest of the app.
 */
const ImmersiveRoutes = () => (
  <AuthGate>
    <GroupProvider>
      <Outlet />
    </GroupProvider>
  </AuthGate>
);

const AuthRoute = () => {
  const { session, loading } = useAuth();

  if (loading) return null;
  if (session) return <Navigate to="/" replace />;

  return <Auth />;
};

// A password-reset email link signs the user in with a "recovery" marker. Wherever the link
// lands, send them to set a new password first. Read the marker now, before it is cleared.
const arrivedFromRecoveryLink = window.location.hash.includes("type=recovery");

const RecoveryRedirect = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Wait until the link has signed the user in; moving earlier would drop it from the address.
    if (arrivedFromRecoveryLink) {
      supabase.auth.getSession().then(() => navigate("/reset-password", { replace: true }));
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") navigate("/reset-password", { replace: true });
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  return null;
};

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
        <RecoveryRedirect />
        <Routes>
          <Route path="/auth" element={<AuthRoute />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/invite/:token" element={<AcceptInvite />} />
          <Route element={<ProtectedRoutes />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/pantry" element={<Pantry />} />
            <Route path="/pantry/alerts/:kind" element={<PantryAlert />} />
            <Route path="/catalog" element={<ItemCatalog />} />
            <Route path="/pantry/:itemId/prices" element={<PricePassport />} />
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
            <Route path="/feedback" element={<Feedback />} />
            <Route path="/admin" element={<Admin />} />
          </Route>
          <Route element={<ImmersiveRoutes />}>
            <Route path="/kitchen-story" element={<KitchenStory />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
