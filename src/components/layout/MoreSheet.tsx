import { useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { MORE_SECTIONS, moreItems, isNavItemActive } from "@/config/navigation";
import { useMyInvites } from "@/hooks/useMyInvites";
import { useIsAdmin } from "@/hooks/useAdmin";
import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";

type ToneStyle = CSSProperties & { "--tone": string };

const SECTION_TONE: Record<string, string> = {
  activity: "var(--bento-emerald)",
  intelligence: "var(--bento-amber)",
  community: "var(--bento-cobalt)",
  account: "var(--bento-slate)",
};

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
  const { isAdmin } = useIsAdmin();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const go = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85dvh]">
        <DrawerHeader className="px-5 pt-4 pb-2 text-left">
          <DrawerTitle className="font-serif text-2xl">More</DrawerTitle>
        </DrawerHeader>
        <div className="space-y-5 overflow-y-auto px-5 pb-5">
          {MORE_SECTIONS.map((section) => {
            const items = moreItems.filter((i) => i.section === section.key && (!i.adminOnly || isAdmin));
            if (!items.length) return null;
            const tone = SECTION_TONE[section.key] ?? "var(--bento-emerald)";
            return (
              <div key={section.key}>
                <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  {section.label}
                </p>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] gap-2.5">
                  {items.map((item) => {
                    const active = isNavItemActive(item, pathname);
                    return (
                      <button
                        key={item.path}
                        type="button"
                        onClick={() => go(item.path)}
                        aria-current={active ? "page" : undefined}
                        className={cn("bento-action", active && "ring-2 ring-primary/30")}
                        style={{ "--tone": tone } as ToneStyle}
                      >
                        <span className="bento-well">
                          <item.icon className="h-5 w-5" strokeWidth={2.2} />
                        </span>
                        <span className="min-w-0 flex-1 text-sm font-medium leading-tight">{item.label}</span>
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

          <div>
            <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              Appearance
            </p>
            <button
              type="button"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="bento-action"
              style={{ "--tone": "var(--bento-amber)" } as ToneStyle}
            >
              <span className="bento-well">
                {isDark ? <Sun className="h-5 w-5" strokeWidth={2.2} /> : <Moon className="h-5 w-5" strokeWidth={2.2} />}
              </span>
              <span className="min-w-0 flex-1 text-sm font-medium">{isDark ? "Light mode" : "Dark mode"}</span>
            </button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default MoreSheet;
