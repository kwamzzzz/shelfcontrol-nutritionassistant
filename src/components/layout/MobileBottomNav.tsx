import { useLocation, useNavigate } from "react-router-dom";
import { Plus, MoreHorizontal } from "lucide-react";
import { navItemBySlot, activeSlotForPath } from "@/config/navigation";
import { cn } from "@/lib/utils";

interface MobileBottomNavProps {
  onAdd: () => void;
  onMore: () => void;
  /** Pending count surfaced as a dot on the More tab. */
  moreBadge?: number;
}

/**
 * Phone bottom navigation: Home · Pantry · Add · Shopping · More.
 * Add is a prominent action (opens Quick Add), never a selected route.
 * Rendered only in phone shell mode by AppLayout.
 */
const MobileBottomNav = ({ onAdd, onMore, moreBadge = 0 }: MobileBottomNavProps) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const activeSlot = activeSlotForPath(pathname);

  const slots = (["home", "pantry", "shopping"] as const).map((slot) => ({
    slot,
    item: navItemBySlot(slot)!,
  }));

  const tabClass = (active: boolean) =>
    cn(
      "flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-0.5",
      active ? "text-primary" : "text-muted-foreground",
    );

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 backdrop-blur-xl pb-safe pl-safe pr-safe"
    >
      <div className="mx-auto flex h-16 max-w-md items-stretch px-1">
        {/* Home + Pantry */}
        {slots.slice(0, 2).map(({ slot, item }) => (
          <button
            key={slot}
            type="button"
            onClick={() => navigate(item.path)}
            aria-current={activeSlot === slot ? "page" : undefined}
            className={tabClass(activeSlot === slot)}
          >
            <item.icon className={cn("h-5 w-5", activeSlot === slot && "scale-110")} />
            <span className="text-[10px] font-medium leading-none">{item.shortLabel ?? item.label}</span>
          </button>
        ))}

        {/* Add (prominent, not a route) */}
        <div className="flex flex-1 items-center justify-center">
          <button
            type="button"
            onClick={onAdd}
            aria-label="Quick add"
            className="flex h-14 w-14 -mt-6 items-center justify-center rounded-full gradient-cool text-white shadow-lg shadow-primary/30 ring-4 ring-background transition-transform active:scale-95"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>

        {/* Shopping */}
        {slots.slice(2).map(({ slot, item }) => (
          <button
            key={slot}
            type="button"
            onClick={() => navigate(item.path)}
            aria-current={activeSlot === slot ? "page" : undefined}
            className={tabClass(activeSlot === slot)}
          >
            <item.icon className={cn("h-5 w-5", activeSlot === slot && "scale-110")} />
            <span className="text-[10px] font-medium leading-none">{item.shortLabel ?? item.label}</span>
          </button>
        ))}

        {/* More */}
        <button
          type="button"
          onClick={onMore}
          aria-current={activeSlot === "more" ? "page" : undefined}
          className={cn("relative", tabClass(activeSlot === "more"))}
        >
          <MoreHorizontal className="h-5 w-5" />
          <span className="text-[10px] font-medium leading-none">More</span>
          {moreBadge > 0 && (
            <span className="absolute right-[26%] top-2 h-2 w-2 rounded-full bg-[#FF5A25]" />
          )}
        </button>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
