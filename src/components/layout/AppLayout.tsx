import { Outlet, useNavigate } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import GroupSwitcher from "./GroupSwitcher";
import { useMyInvites } from "@/hooks/useMyInvites";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const AppLayout = () => {
  const navigate = useNavigate();
  const { pendingCount } = useMyInvites();

  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex-1 ml-0 sm:ml-64 flex flex-col">
        {/* Header bar with group switcher */}
        <header className="hidden sm:flex h-14 items-center justify-end border-b border-border bg-background/80 backdrop-blur-sm px-6 sticky top-0 z-30 gap-3">
          {pendingCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="relative rounded-xl gap-2"
              onClick={() => navigate("/invitations")}
            >
              <Mail className="h-4 w-4" />
              <Badge className="text-[10px] px-1.5 py-0 h-4 font-bold bg-destructive text-destructive-foreground">
                {pendingCount}
              </Badge>
            </Button>
          )}
          <GroupSwitcher />
        </header>
        <main className="flex-1 p-4 pt-20 sm:p-8 sm:pt-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
