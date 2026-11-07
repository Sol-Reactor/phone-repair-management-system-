import { Outlet } from "react-router-dom";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";

// Wraps the staff-facing screens (queue dashboard, registration, admin
// panel) with the internal app shell — kept separate from PublicLayout so
// the public marketing pages don't inherit the staff sidebar.
//
// Replaced the single crowded top NavBar with a sidebar + header shell:
// all navigation lives in the left sidebar (AdminSidebar), and the header
// holds only the current page title plus language/theme/logout controls.
export function InternalLayout() {
  return (
    <div className="staff-ui flex min-h-screen bg-slate-50 dark:bg-brand-dark transition-colors">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
