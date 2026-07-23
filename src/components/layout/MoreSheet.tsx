import { useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { MORE_SECTIONS, moreItems, isNavItemActive } from "@/config/navigation";
import { useMyInvites } from "@/hooks/useMyInvites";
import { cn } from "@/lib/utils";

interface MoreSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * "More" bottom sheet: every route not pinned to a bottom-nav slot, grouped by
 * section. Keeps the full app reachable from the phone shell (one tap deep).
 */
const MoreSheet = ({ open, onOpenChange }: MoreSheetProps) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { pendingCount } = useMyInvites();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const go = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85dvh]">
        <DrawerHeader className="text-center">
          <DrawerTitle>More</DrawerTitle>
        </DrawerHeader>
        <div className="space-y-5 overflow-y-auto px-4 pb-4">
          {MORE_SECTIONS.map((section) => {
            const items = moreItems.filter((i) => i.section === section.key);
            if (!items.length) return null;
            return (
              <div key={section.key}>
                <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  {section.label}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {items.map((item) => {
                    const active = isNavItemActive(item, pathname);
                    return (
                      <button
                        key={item.path}
                        type="button"
                        onClick={() => go(item.path)}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex min-h-[52px] items-center gap-3 rounded-2xl border p-3 text-left transition-colors",
                          active
                            ? "border-primary/40 bg-primary/10 text-foreground"
                            : "border-border bg-card/60 hover:bg-accent",
                        )}
                      >
                        <item.icon className="h-5 w-5 shrink-0 text-primary" />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.label}</span>
                        {item.hasBadge && pendingCount > 0 && (
                          <Badge className="h-4 min-w-4 border-0 bg-[#FF5A25] px-1 text-[10px] font-bold text-white">
                            {pendingCount}
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Appearance — theme toggle (the phone shell has no sidebar) */}
          <div>
            <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              Appearance
            </p>
            <button
              type="button"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="flex min-h-[52px] w-full items-center gap-3 rounded-2xl border border-border bg-card/60 p-3 text-left transition-colors hover:bg-accent"
            >
              {isDark ? <Sun className="h-5 w-5 shrink-0 text-primary" /> : <Moon className="h-5 w-5 shrink-0 text-primary" />}
              <span className="min-w-0 flex-1 text-sm font-medium">{isDark ? "Light mode" : "Dark mode"}</span>
            </button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default MoreSheet;
