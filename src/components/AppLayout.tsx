import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, FileText, CheckSquare, Package, Wallet,
  Coins, BarChart3, History, Users, Settings, LogOut, Menu, Plus, X
} from "lucide-react";
import { useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { useAuth, can } from "@/stores/authStore";
import { cn } from "@/lib/utils";
import { departments } from "@/data/mockData";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, perm: "" },
  { to: "/requests", label: "Pengajuan", icon: FileText, perm: "" },
  { to: "/approvals", label: "Approval", icon: CheckSquare, perm: "request.approve" },
  { to: "/inventory", label: "Stok Barang", icon: Package, perm: "" },
  { to: "/finance", label: "Realisasi Finance", icon: Wallet, perm: "finance.realize" },
  { to: "/petty-cash", label: "Petty Cash", icon: Coins, perm: "" },
  { to: "/reports", label: "Laporan", icon: BarChart3, perm: "reports.view" },
  { to: "/audit", label: "Audit Trail", icon: History, perm: "audit.view" },
  { to: "/users", label: "Pengguna", icon: Users, perm: "users.manage" },
  { to: "/settings", label: "Pengaturan", icon: Settings, perm: "" },
];

const mobileNav = nav.slice(0, 5);

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const nav2 = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const dept = departments.find(d => d.id === user?.department)?.name;

  const items = nav.filter(n => !n.perm || can(user?.role, n.perm));

  const handleLogout = () => { logout(); nav2("/login"); };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border fixed inset-y-0 left-0 z-30">
        <div className="h-16 flex items-center gap-3 px-5 border-b border-sidebar-border">
          <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center font-bold text-primary-foreground shadow-glow">F</div>
          <div>
            <div className="font-bold text-sm tracking-tight">FinanceFlow</div>
            <div className="text-[10px] text-sidebar-foreground/60 uppercase tracking-wider">Internal Finance</div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 overflow-y-auto scrollbar-thin">
          {items.map(item => (
            <NavLink key={item.to} to={item.to} end={item.to === "/"}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors mb-0.5",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary font-medium"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              )}>
              <item.icon className="h-4 w-4 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-2 py-2 rounded-md mb-2">
            <div className="w-8 h-8 rounded-full gradient-accent flex items-center justify-center text-xs font-bold text-accent-foreground">
              {user?.name.split(" ").map(s => s[0]).slice(0, 2).join("")}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium truncate">{user?.name}</div>
              <div className="text-[10px] text-sidebar-foreground/60 truncate capitalize">{user?.role} • {dept}</div>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />Keluar
          </Button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="relative w-72 bg-sidebar text-sidebar-foreground flex flex-col animate-fade-in">
            <div className="h-16 flex items-center justify-between px-5 border-b border-sidebar-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center font-bold text-primary-foreground">F</div>
                <span className="font-bold text-sm">FinanceFlow</span>
              </div>
              <Button variant="ghost" size="icon" className="text-sidebar-foreground" onClick={() => setOpen(false)}><X className="h-4 w-4" /></Button>
            </div>
            <nav className="flex-1 px-3 py-4 overflow-y-auto">
              {items.map(item => (
                <NavLink key={item.to} to={item.to} end={item.to === "/"} onClick={() => setOpen(false)}
                  className={({ isActive }) => cn(
                    "flex items-center gap-3 px-3 py-3 rounded-md text-sm mb-1",
                    isActive ? "bg-sidebar-accent text-sidebar-primary font-medium" : "text-sidebar-foreground/80"
                  )}>
                  <item.icon className="h-4 w-4" />{item.label}
                </NavLink>
              ))}
            </nav>
            <div className="p-3 border-t border-sidebar-border">
              <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground/80" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />Keluar
              </Button>
            </div>
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 bg-card/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 lg:px-6 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></Button>
            <div>
              <h1 className="text-sm lg:text-base font-semibold tracking-tight">
                {nav.find(n => n.to === loc.pathname || (n.to !== "/" && loc.pathname.startsWith(n.to)))?.label || "Dashboard"}
              </h1>
              <p className="text-[11px] text-muted-foreground hidden sm:block">Sistem kontrol keuangan internal</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <div className="hidden sm:flex items-center gap-2 ml-2 pl-3 border-l border-border">
              <div className="w-8 h-8 rounded-full gradient-accent flex items-center justify-center text-xs font-bold text-accent-foreground">
                {user?.name.split(" ").map(s => s[0]).slice(0, 2).join("")}
              </div>
              <div className="text-right">
                <div className="text-xs font-medium leading-tight">{user?.name.split(" ")[0]}</div>
                <div className="text-[10px] text-muted-foreground capitalize">{user?.role}</div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 pb-20 lg:pb-8 animate-fade-in">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-card border-t border-border z-30">
          <div className="grid grid-cols-5">
            {mobileNav.map(item => (
              <NavLink key={item.to} to={item.to} end={item.to === "/"}
                className={({ isActive }) => cn(
                  "flex flex-col items-center justify-center py-2.5 gap-1 text-[10px]",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}>
                <item.icon className="h-4 w-4" />
                <span className="truncate max-w-full px-1">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Floating action button (mobile) */}
        {can(user?.role, "request.create") && loc.pathname !== "/requests/new" && (
          <button
            onClick={() => nav2("/requests/new")}
            className="lg:hidden fixed bottom-20 right-4 w-14 h-14 rounded-full gradient-primary text-primary-foreground shadow-elevated flex items-center justify-center z-30 active:scale-95 transition-transform"
            aria-label="Buat pengajuan">
            <Plus className="h-6 w-6" />
          </button>
        )}
      </div>
    </div>
  );
}
