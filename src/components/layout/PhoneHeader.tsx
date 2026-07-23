import { useLocation } from "react-router-dom";
import GroupSwitcher from "./GroupSwitcher";
import { NAV_ITEMS } from "@/config/navigation";

function titleForPath(pathname: string): string {
  const exact = NAV_ITEMS.find((i) => i.path === pathname);
  if (exact) return exact.label;
  if (pathname.startsWith("/recipes/")) return "Recipe";
  if (pathname.startsWith("/groups/")) return "Group";
  if (pathname.startsWith("/invite/")) return "Invitation";
  return "Shelf Control";
}

/**
 * Compact phone header: contextual title + group switching. Fixed to the top and
 * padded for the safe-area/notch. Search and secondary actions live within the
 * relevant screens, not here (brief → Headers).
 */
const PhoneHeader = () => {
  const { pathname } = useLocation();

  return (
    <header className="fixed inset-x-0 top-0 z-40 h-phone-header border-b border-border bg-background/90 px-4 pt-safe backdrop-blur-xl">
      <div className="flex h-14 items-center justify-between gap-3">
        <h1 className="truncate text-lg font-semibold tracking-tight text-foreground">
          {titleForPath(pathname)}
        </h1>
        <GroupSwitcher />
      </div>
    </header>
  );
};

export default PhoneHeader;
