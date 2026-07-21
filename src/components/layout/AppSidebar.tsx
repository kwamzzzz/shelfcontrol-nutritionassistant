import { NavLink, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Package, ShoppingCart, Receipt, UtensilsCrossed, Heart,
  BarChart3, LogOut, Menu, X, Users, Trophy, UserCircle, Settings,
  Apple, Mail, Lightbulb, Newspaper, PanelLeftClose, PanelLeftOpen, Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useMyInvites } from "@/hooks/useMyInvites";
import { useSidebar } from "@/contexts/SidebarContext";
import { ModeToggle } from "@/components/ModeToggle";

const navSections = [
  {
    label: "MAIN",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard },
      { to: "/pantry", label: "Pantry", icon: Package },
      { to: "/purchases", label: "Purchases", icon: Receipt },
      { to: "/consumption", label: "Consumption", icon: Heart },
      { to: "/shopping", label: "Shopping List", icon: ShoppingCart },
      { to: "/recipes", label: "My Cook Book", icon: UtensilsCrossed },
    ],
  },
  {
    label: "INTELLIGENCE",
    items: [
      { to: "/analytics", label: "Analytics", icon: BarChart3 },
      { to: "/intelligence", label: "Pantry Intelligence", icon: Lightbulb },
      { to: "/food-intelligence", label: "Food Intelligence", icon: Newspaper },
      { to: "/nutrition", label: "Nutrition", icon: Apple },
      { to: "/coach", label: "Shelf Coach", icon: Sparkles },
    ],
  },
  {
    label: "GROUP",
    items: [
      { to: "/groups", label: "Groups", icon: Users },
      { to: "/invitations", label: "Invitations", icon: Mail, hasBadge: true },
      { to: "/challenges", label: "Challenges", icon: Trophy },
    ],
  },
  {
    label: "SYSTEM",
    items: [
      { to: "/profile", label: "Profile", icon: UserCircle },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

const AppSidebar = () => {
  const navigate = useNavigate();
  const { collapsed, toggleCollapsed, mobileOpen, setMobileOpen } = useSidebar();
  const { pendingCount } = useMyInvites();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  // On mobile (mobileOpen overlay), always render expanded regardless of collapsed state.
  // collapsed only affects the persistent desktop sidebar (sm+).
  const isCompact = collapsed && !mobileOpen;

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center gap-3 border-b border-sidebar-border bg-sidebar px-4 sm:hidden">
        <button onClick={() => setMobileOpen(!mobileOpen)} className="text-sidebar-foreground hover:text-foreground" aria-label={mobileOpen ? "Close menu" : "Open menu"}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <span className="text-lg font-semibold tracking-tight text-foreground">
          Shelf Control
        </span>
      </div>

      {/* Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm sm:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-sidebar-border transition-all duration-200",
          "bg-sidebar",
          // Mobile always 260px; desktop respects collapsed state
          isCompact ? "w-[260px] sm:w-[68px]" : "w-[260px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full sm:translate-x-0"
        )}
      >
        {/* Header: Logo + collapse toggle */}
        <div className={cn(
          "flex h-16 items-center",
          isCompact ? "justify-center px-2" : "justify-between px-6"
        )}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-7 w-7 shrink-0 rounded-lg gradient-warm flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            {!isCompact && (
              <span className="text-xl font-bold tracking-tight text-foreground truncate">
                Shelf Control
              </span>
            )}
          </div>
          {/* Desktop collapse toggle */}
          <button
            onClick={toggleCollapsed}
            className={cn(
              "hidden sm:flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors",
              isCompact && "ml-0"
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        <nav className={cn("flex-1 overflow-y-auto py-4 space-y-5", isCompact ? "px-0" : "px-3")}>
          {navSections.map((section) => (
            <div key={section.label}>
              {!isCompact && (
                <p className="px-4 mb-2 text-[10px] font-semibold tracking-[0.15em] uppercase text-muted-foreground">
                  {section.label}
                </p>
              )}
              <div className={cn("space-y-0.5", isCompact && "flex flex-col items-center")}>
                {section.items.map((item) => {
                  const link = (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === "/"}
                      onClick={() => setMobileOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center rounded-full text-sm font-medium transition-all duration-200",
                          isCompact ? "justify-center px-0 py-2.5 mx-auto w-11 h-11" : "gap-3 px-4 py-2.5",
                          isActive
                            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-primary/25"
                            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        )
                      }
                    >
                      <item.icon className="h-[18px] w-[18px] shrink-0" />
                      {!isCompact && <span className="flex-1 truncate">{item.label}</span>}
                      {!isCompact && item.hasBadge && pendingCount > 0 && (
                        <Badge className="text-[10px] px-1.5 py-0 h-4 font-bold bg-[#FF5A25] text-white border-0">
                          {pendingCount}
                        </Badge>
                      )}
                    </NavLink>
                  );

                  if (isCompact) {
                    return (
                      <Tooltip key={item.to} delayDuration={0}>
                        <TooltipTrigger asChild>{link}</TooltipTrigger>
                        <TooltipContent side="right" className="flex items-center gap-2">
                          {item.label}
                          {item.hasBadge && pendingCount > 0 && (
                            <Badge className="text-[10px] px-1.5 py-0 h-4 font-bold bg-[#FF5A25] text-white border-0">
                              {pendingCount}
                            </Badge>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  return link;
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className={cn("border-t border-sidebar-border space-y-1", isCompact ? "p-1.5" : "p-3")}>
          <div className={cn("flex", isCompact ? "justify-center" : "justify-start")}>
            {isCompact ? (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <ModeToggle className="w-11 h-11 rounded-full text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" />
                </TooltipTrigger>
                <TooltipContent side="right">Toggle theme</TooltipContent>
              </Tooltip>
            ) : (
              <ModeToggle className="rounded-full text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" />
            )}
          </div>
          {isCompact ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={handleLogout}
                  className="flex w-11 h-11 mx-auto items-center justify-center rounded-full text-sm font-medium text-sidebar-foreground transition-all duration-200 hover:bg-sidebar-accent hover:text-destructive"
                >
                  <LogOut className="h-[18px] w-[18px]" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Sign Out</TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium text-sidebar-foreground transition-all duration-200 hover:bg-sidebar-accent hover:text-destructive"
            >
              <LogOut className="h-[18px] w-[18px]" />
              Sign Out
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

export default AppSidebar;
