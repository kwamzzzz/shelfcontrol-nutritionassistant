import { Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import AppSidebar from "./AppSidebar";
import GroupSwitcher from "./GroupSwitcher";
import PhoneHeader from "./PhoneHeader";
import MobileBottomNav from "./MobileBottomNav";
import QuickAddSheet from "./QuickAddSheet";
import MoreSheet from "./MoreSheet";
import { useMyInvites } from "@/hooks/useMyInvites";
import { Mail, Bell, Search } from "lucide-react";
import { useSidebar } from "@/contexts/SidebarContext";
import { useShellMode } from "@/hooks/use-shell-mode";
import { cn } from "@/lib/utils";

const AppLayout = () => {
  const navigate = useNavigate();
  const { pendingCount } = useMyInvites();
  const { collapsed } = useSidebar();
  const mode = useShellMode();
  const isPhone = mode === "phone";

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  // Content offset matches the sidebar/rail width; phone has no persistent sidebar.
  const contentMargin = isPhone
    ? "0px"
    : mode === "tablet"
      ? "var(--tablet-rail-width)"
      : collapsed
        ? "var(--desktop-sidebar-collapsed-width)"
        : "var(--desktop-sidebar-width)";

  return (
    <div className="flex min-h-dvh">
      {!isPhone && <AppSidebar mode={mode} />}

      <div
        className="flex min-w-0 flex-1 flex-col transition-[margin] duration-200"
        style={{ marginLeft: contentMargin }}
      >
        {isPhone ? (
          <PhoneHeader />
        ) : (
          /* Desktop / tablet topbar */
          <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-border bg-background/60 px-8 backdrop-blur-md">
            <div>
              <h2 className="text-xl font-medium text-foreground">{getGreeting()}</h2>
              <span className="text-sm text-muted-foreground">
                Your pantry health is <strong className="text-foreground">Optimal</strong>
              </span>
            </div>

            {/* Search bar */}
            <div className="flex w-[300px] items-center gap-2 rounded-full glass-card px-4 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search items, recipes, or logs..."
                className="w-full border-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>

            {/* User actions */}
            <div className="flex items-center gap-3">
              {pendingCount > 0 && (
                <button
                  onClick={() => navigate("/invitations")}
                  className="relative flex h-10 w-10 items-center justify-center rounded-full glass-card glass-card-hover"
                >
                  <Mail className="h-4 w-4 text-foreground" />
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#FF5A25] text-[9px] font-bold text-white">
                    {pendingCount}
                  </span>
                </button>
              )}
              <button className="flex h-10 w-10 items-center justify-center rounded-full glass-card glass-card-hover">
                <Bell className="h-4 w-4 text-foreground" />
              </button>
              <GroupSwitcher />
              <div className="h-10 w-10 cursor-pointer rounded-full border-2 border-background gradient-warm" />
            </div>
          </header>
        )}

        <main className={cn("flex-1", isPhone ? "px-4 pt-phone-header pb-phone-nav" : "p-6 lg:p-8")}>
          <Outlet />
        </main>
      </div>

      {isPhone && (
        <>
          <MobileBottomNav
            onAdd={() => setQuickAddOpen(true)}
            onMore={() => setMoreOpen(true)}
            moreBadge={pendingCount}
          />
          <QuickAddSheet open={quickAddOpen} onOpenChange={setQuickAddOpen} />
          <MoreSheet open={moreOpen} onOpenChange={setMoreOpen} />
        </>
      )}
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
