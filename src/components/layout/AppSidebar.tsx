import { NavLink, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Package, ShoppingCart, Receipt, UtensilsCrossed, Heart,
  BarChart3, LogOut, Users, Trophy, UserCircle, Settings,
  Apple, Mail, Lightbulb, Newspaper, PanelLeftClose, PanelLeftOpen, Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useMyInvites } from "@/hooks/useMyInvites";
import { useSidebar } from "@/contexts/SidebarContext";
import { type ShellMode } from "@/hooks/use-shell-mode";
import { ModeToggle } from "@/components/ModeToggle";
import { BrandLogo } from "@/components/brand/BrandLogo";
import appIcon from "@/assets/brand/ShelfControl_AppIcon_Transparent_1024.png.asset.json";

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

const AppSidebar = ({ mode = "desktop" }: { mode?: ShellMode }) => {
  const navigate = useNavigate();
  const { collapsed, toggleCollapsed } = useSidebar();
  const { pendingCount } = useMyInvites();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  // Tablet always shows the compact rail; desktop respects the collapsed state.
  // (Phone does not render the sidebar — it uses the bottom-nav shell instead.)
  const isCompact = mode === "tablet" ? true : collapsed;

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-dvh flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200",
        isCompact ? "w-[68px]" : "w-[260px]",
      )}
    >
        {/* Header: Logo + collapse toggle */}
        <div className={cn(
          "flex h-16 items-center",
          isCompact ? "justify-center px-2" : "justify-between px-6"
        )}>
          {isCompact ? (
            <img
              src={appIcon.url}
              alt="Shelf Control"
              className="h-8 w-8 shrink-0 object-contain"
            />
          ) : (
            <BrandLogo
              variant="auto"
              alt="Shelf Control"
              className="h-8 w-auto object-contain"
            />
          )}
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
  );
};

export default AppSidebar;
