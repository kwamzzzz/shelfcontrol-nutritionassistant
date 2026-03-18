import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";

const AppLayout = () => {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <main className="flex-1 ml-0 p-4 pt-20 sm:ml-64 sm:p-8 sm:pt-8">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
