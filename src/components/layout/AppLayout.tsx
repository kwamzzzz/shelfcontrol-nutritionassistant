import { Outlet, useNavigate } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import GroupSwitcher from "./GroupSwitcher";
import { useMyInvites } from "@/hooks/useMyInvites";
import { Button } from "@/components/ui/button";
import { Mail, Bell, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const AppLayout = () => {
  const navigate = useNavigate();
  const { pendingCount } = useMyInvites();

  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex-1 ml-0 sm:ml-[260px] flex flex-col">
        {/* Topbar */}
        <header className="hidden sm:flex h-20 items-center justify-between border-b border-white/[0.06] bg-transparent backdrop-blur-md px-8 sticky top-0 z-30">
          <div>
            <h2 className="text-xl font-medium text-foreground">
              {getGreeting()}
            </h2>
            <span className="text-sm text-muted-foreground">
              Your pantry health is <strong className="text-foreground">Optimal</strong>
            </span>
          </div>

          {/* Search bar */}
          <div className="flex items-center gap-2 glass-card rounded-full px-4 py-2 w-[300px]">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search items, recipes, or logs..."
              className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground w-full"
            />
          </div>

          {/* User actions */}
          <div className="flex items-center gap-3">
            {pendingCount > 0 && (
              <button
                onClick={() => navigate("/invitations")}
                className="relative h-10 w-10 rounded-full glass-card glass-card-hover flex items-center justify-center"
              >
                <Mail className="h-4 w-4 text-foreground" />
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-[#FF5A25] text-[9px] font-bold text-white flex items-center justify-center">
                  {pendingCount}
                </span>
              </button>
            )}
            <button className="h-10 w-10 rounded-full glass-card glass-card-hover flex items-center justify-center">
              <Bell className="h-4 w-4 text-foreground" />
            </button>
            <GroupSwitcher />
            <div className="h-10 w-10 rounded-full gradient-warm cursor-pointer border-2 border-background" />
          </div>
        </header>

        <main className="flex-1 p-4 pt-20 sm:p-8 sm:pt-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning.";
  if (hour < 17) return "Good afternoon.";
  return "Good evening.";
}

export default AppLayout;
