import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTitle } from "@/components/admin/admin-title";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen bg-bg-page flex overflow-hidden">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* The previous header component was never rendered here, so the page
            name only ever existed inside each page's own markup — and five
            pages had none. This puts it in the frame where it belongs. */}
        <AdminTitle />
        <main className="flex-1 overflow-y-auto px-6 pb-8">{children}</main>
      </div>
    </div>
  );
}
