import { AlertTriangle, BookOpen, LayoutDashboard } from "lucide-react";
import { Link, Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";

const navItems = [
  { to: "/", label: "Home", icon: LayoutDashboard },
  { to: "/alerts", label: "PO Alerts", icon: AlertTriangle },
  { to: "/data-dictionary", label: "Reference", icon: BookOpen },
];

function NotFoundComponent() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-black text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">The page you’re looking for doesn’t exist or has been moved.</p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Project Delivery Dashboard" },
      { name: "description", content: "Project operations dashboard with PO risk, reporting, and reference views." },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:h-full md:z-50 border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        <div className="p-6 border-b border-sidebar-border">
          <h1 className="text-xl font-black text-foreground tracking-tight">Flexi Pulse</h1>
          <p className="text-xs text-muted-foreground mt-1">Project Operations</p>
        </div>

        <nav className="flex-1 p-3 space-y-1" aria-label="Main navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className="sidebar-link"
                activeProps={{ className: "sidebar-link sidebar-link-active" }}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-primary">PP</span>
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-foreground truncate">Project Pulse</div>
              <div className="text-[11px] text-muted-foreground">Command center</div>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 md:ml-64 pb-20 md:pb-0 overflow-y-auto min-h-screen transition-all" role="main">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border flex px-2 pb-4 pt-2 gap-1 backdrop-blur-xl z-50 md:hidden" aria-label="Mobile navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className="mobile-tab text-muted-foreground"
              activeProps={{ className: "mobile-tab mobile-tab-active text-primary" }}
            >
              <Icon size={20} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
