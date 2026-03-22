import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import GroupSwitcher from "./GroupSwitcher";

const AppLayout = () => {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex-1 ml-0 sm:ml-64 flex flex-col">
        {/* Header bar with group switcher */}
        <header className="hidden sm:flex h-14 items-center justify-end border-b border-border bg-background/80 backdrop-blur-sm px-6 sticky top-0 z-30">
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
