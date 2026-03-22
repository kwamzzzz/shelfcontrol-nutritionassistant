import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Receipt,
  UtensilsCrossed,
  Heart,
  BarChart3,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Users,
  Trophy,
  UserCircle,
  Settings,
  Apple,
  Mail,
  Lightbulb,
  Newspaper,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useMyInvites } from "@/hooks/useMyInvites";

const navSections = [
  {
    label: "MAIN",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard },
      { to: "/pantry", label: "Pantry", icon: Package },
      { to: "/purchases", label: "Purchases", icon: Receipt },
      { to: "/consumption", label: "Consumption", icon: Heart },
      { to: "/shopping", label: "Shopping List", icon: ShoppingCart },
      { to: "/recipes", label: "Recipes", icon: UtensilsCrossed },
    ],
  },
  {
    label: "INTELLIGENCE",
    items: [
      { to: "/analytics", label: "Analytics", icon: BarChart3 },
      { to: "/intelligence", label: "Pantry Intelligence", icon: Lightbulb },
      { to: "/food-intelligence", label: "Food Intelligence", icon: Newspaper },
      { to: "/nutrition", label: "Nutrition", icon: Apple },
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pendingCount } = useMyInvites();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center gap-3 border-b border-sidebar-border bg-sidebar px-4 sm:hidden">
        <button onClick={() => setMobileOpen(!mobileOpen)} className="text-sidebar-foreground">
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <ShieldCheck className="h-5 w-5 text-sidebar-primary" />
        <span className="text-lg font-display font-bold tracking-tight text-sidebar-primary-foreground">
          Shelf Control
        </span>
      </div>

      {/* Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 sm:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-transform duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full sm:translate-x-0"
        )}
      >
        <div className="flex h-16 items-center gap-2 px-6 border-b border-sidebar-border">
          <ShieldCheck className="h-7 w-7 text-sidebar-primary" />
          <span className="text-xl font-display font-bold tracking-tight text-sidebar-primary-foreground">
            Shelf Control
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {navSections.map((section) => (
            <div key={section.label}>
              <p className="px-3 mb-1.5 text-[10px] font-bold tracking-widest uppercase text-sidebar-foreground/40">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/"}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-primary"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )
                    }
                  >
                    <item.icon className="h-4.5 w-4.5" />
                    <span className="flex-1">{item.label}</span>
                    {item.hasBadge && pendingCount > 0 && (
                      <Badge className="text-[10px] px-1.5 py-0 h-4 font-bold bg-destructive text-destructive-foreground">
                        {pendingCount}
                      </Badge>
                    )}
                  </NavLink>
                    {item.hasBadge && pendingCount > 0 && (
                      <Badge className="text-[10px] px-1.5 py-0 h-4 font-bold bg-destructive text-destructive-foreground">
                        {pendingCount}
                      </Badge>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-destructive"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
};

export default AppSidebar;
