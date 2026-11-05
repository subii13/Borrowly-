import { SiteHeader } from "./site-header";
import { DashboardNav, type NavItem } from "./dashboard-nav";

export function DashboardShell({ title, nav, children }: { title: string; nav: NavItem[]; children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <div className="container-page flex flex-col gap-6 py-6 lg:flex-row lg:gap-10 lg:py-10">
        <DashboardNav title={title} items={nav} />
        <main id="main" className="min-w-0 flex-1">{children}</main>
      </div>
    </>
  );
}
