import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Package, ShoppingCart, Receipt, UtensilsCrossed, Heart,
  BarChart3, LogOut, Menu, X, Users, Trophy, UserCircle, Settings,
  Apple, Mail, Lightbulb, Newspaper,
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
      <div className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center gap-3 border-b border-white/[0.06] bg-[hsl(252,45%,9%)] px-4 sm:hidden">
        <button onClick={() => setMobileOpen(!mobileOpen)} className="text-white/70">
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <span className="text-lg font-semibold tracking-tight text-white">
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
          "fixed left-0 top-0 z-40 flex h-screen w-[260px] flex-col border-r border-white/[0.06] transition-transform duration-200",
          "bg-[hsl(252,45%,9%)]",
          mobileOpen ? "translate-x-0" : "-translate-x-full sm:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-2.5 px-6">
          {/* Warm gradient logo icon */}
          <div className="h-7 w-7 rounded-lg gradient-warm flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            Shelf Control
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {navSections.map((section) => (
            <div key={section.label}>
              <p className="px-4 mb-2 text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30">
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
                        "flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-primary text-white shadow-[0_4px_20px_hsla(248,100%,56%,0.4)]"
                          : "text-[hsl(248,30%,75%)] hover:bg-white/[0.05] hover:text-white"
                      )
                    }
                  >
                    <item.icon className="h-[18px] w-[18px]" />
                    <span className="flex-1">{item.label}</span>
                    {item.hasBadge && pendingCount > 0 && (
                      <Badge className="text-[10px] px-1.5 py-0 h-4 font-bold bg-[#FF5A25] text-white border-0">
                        {pendingCount}
                      </Badge>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/[0.06] p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium text-[hsl(248,30%,75%)] transition-all duration-200 hover:bg-white/[0.05] hover:text-[#FF5A25]"
          >
            <LogOut className="h-[18px] w-[18px]" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
};

export default AppSidebar;
