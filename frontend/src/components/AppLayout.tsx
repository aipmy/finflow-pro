import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, FileText, CheckSquare, Package, Wallet,
  Coins, BarChart3, History, Users, Settings, LogOut, Menu, Plus, X,
  Eye, EyeOff, Check, Loader2, Lock, ChevronsLeft, ChevronsRight, Radar, ChevronDown, RefreshCw, Bell, Smartphone
} from "lucide-react";
import { useState, useEffect } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { useAuth, can } from "@/stores/authStore";
import { cn } from "@/lib/utils";
import { departments } from "@/data/mockData";
import { apiClient } from "@/services/apiClient";
import { toast } from "sonner";

const navGroups = [
  {
    title: "Utama",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard, perm: "" },
      { to: "/requests", label: "Pengajuan", icon: FileText, perm: "" },
      { to: "/recurring-requests", label: "Pengajuan Rutin", icon: RefreshCw, perm: "" },
      { to: "/approvals", label: "Approval", icon: CheckSquare, perm: "request.approve" },
    ]
  },
  {
    title: "Keuangan & Transaksi",
    items: [
      { to: "/finance", label: "Realisasi Finance", icon: Wallet, perm: "finance.realize" },
      { to: "/petty-cash", label: "Petty Cash", icon: Coins, perm: "" },
    ]
  },
  {
    title: "Gudang & Logistik",
    items: [
      { to: "/inventory", label: "Stok Barang", icon: Package, perm: "" },
    ]
  },
  {
    title: "Analisis & Audit",
    items: [
      { to: "/reports", label: "Laporan", icon: BarChart3, perm: "reports.view" },
      { to: "/audit", label: "Audit Trail", icon: History, perm: "audit.view" },
    ]
  },
  {
    title: "Manajemen & Sistem",
    items: [
      { to: "/users", label: "Pengguna", icon: Users, perm: "users.manage" },
      { to: "/simcard-usage", label: "Penggunaan Kartu", icon: Smartphone, perm: "" },
      { to: "/settings", label: "Pengaturan", icon: Settings, perm: "" },
    ]
  }
];

const SIDEBAR_KEY = "finflow:sidebar_collapsed";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const nav2 = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [changePassOpen, setChangePassOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(SIDEBAR_KEY) === "true"; } catch { return false; }
  });
  const dept = departments.find(d => d.id === user?.department)?.name;

  const [badgeCounts, setBadgeCounts] = useState<{ approvals: number; lowStock: number; revisions: number }>({ approvals: 0, lowStock: 0, revisions: 0 });
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    async function fetchBadgeCountsAndNotifications() {
      try {
        const [reqs, items, notifs] = await Promise.all([
          apiClient.requests.list().catch(() => []),
          apiClient.inventory.list().catch(() => []),
          apiClient.notifications.list().catch(() => [])
        ]);

        const role = user?.role?.toLowerCase() || "";
        
        // Approvals count
        const approvals = reqs.filter((r: any) => {
          if (r.status === "SUBMITTED") {
            return ["supervisor", "manager", "finance", "admin"].includes(role);
          }
          if (r.status === "APPROVED_BY_SUPERVISOR") {
            return ["finance", "admin"].includes(role);
          }
          return false;
        }).length;

        // Low stock count
        const lowStock = items.filter((item: any) => item.stock <= item.minStock).length;

        // Revisions count (revisions waiting action)
        const revisions = reqs.filter((r: any) => {
          if (r.status !== "NEED_REVISION") return false;
          if (role === "staff") return r.requesterId === user?.id || r.requesterId === user?.userId;
          return true;
        }).length;

        setBadgeCounts({ approvals, lowStock, revisions });
        setNotifications(notifs || []);
        setUnreadCount((notifs || []).filter((n: any) => !n.read).length);
      } catch (err) {
        // Suppress errors for background fetch
      }
    }

    if (user) {
      fetchBadgeCountsAndNotifications();
      const interval = setInterval(fetchBadgeCountsAndNotifications, 15000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleNotificationClick = async (notif: any) => {
    setNotificationsOpen(false);
    
    // Mark as read in UI instantly
    setNotifications(prev => 
      prev.map(n => n.id === notif.id ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - (notif.read ? 0 : 1)));

    // Send API request in background
    if (!notif.read) {
      try {
        await apiClient.notifications.markRead(notif.id);
      } catch (err) {
        // Suppress
      }
    }

    // Determine target page based on notification title/message or code
    const requestMatch = notif.message.match(/REQ-\d{4}-\d{3}/);
    if (requestMatch) {
      const code = requestMatch[0];
      try {
        const reqs = await apiClient.requests.list();
        const matchedReq = reqs.find((r: any) => r.code === code);
        if (matchedReq) {
          nav2(`/requests/${matchedReq.id}`);
        } else {
          nav2("/requests");
        }
      } catch (err) {
        nav2("/requests");
      }
    } else if (notif.title.includes("Stok")) {
      nav2("/inventory");
    } else if (notif.title.includes("Approval") || notif.title.includes("Verifikasi")) {
      nav2("/approvals");
    } else {
      nav2("/requests");
    }
  };

  const handleMarkAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await apiClient.notifications.markAllRead();
      toast.success("Semua notifikasi ditandai dibaca");
    } catch (err: any) {
      toast.error(err.message || "Gagal memperbarui notifikasi");
    }
  };

  const getBadgeForPath = (to: string) => {
    if (to === "/approvals") return badgeCounts.approvals;
    if (to === "/inventory") return badgeCounts.lowStock;
    if (to === "/requests") return badgeCounts.revisions;
    return 0;
  };

  // Change Password Modal States
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmNewPw, setConfirmNewPw] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmNewPw, setShowConfirmNewPw] = useState(false);
  const [loadingChangePw, setLoadingChangePw] = useState(false);

  // New Password Validations
  const hasMinLength = newPw.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPw);
  const hasLowercase = /[a-z]/.test(newPw);
  const hasNumber = /[0-9]/.test(newPw);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPw);
  const passwordsMatch = newPw === confirmNewPw && newPw.length > 0;
  const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar;
  const canSubmitChangePw = isPasswordValid && passwordsMatch && currentPw;

  const groups = navGroups.map(group => ({
    ...group,
    items: group.items.filter(n => !n.perm || can(user?.role, n.perm))
  })).filter(group => group.items.length > 0);

  const flatItems = groups.flatMap(g => g.items);
  const mobileBottomNavItems = flatItems.slice(0, 5);

  const handleLogout = () => { logout(); nav2("/login"); };

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem(SIDEBAR_KEY, String(next)); } catch {}
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmitChangePw) return;

    setLoadingChangePw(true);
    try {
      await apiClient.auth.changePassword(currentPw, newPw);
      toast.success("Password berhasil diubah!");
      setChangePassOpen(false);
      // Reset fields
      setCurrentPw("");
      setNewPw("");
      setConfirmNewPw("");
    } catch (err: any) {
      toast.error(err.message || "Gagal mengubah password");
    } finally {
      setLoadingChangePw(false);
    }
  };

  const sidebarWidth = collapsed ? "w-[68px]" : "w-64";
  const mainPadding = collapsed ? "lg:pl-[68px]" : "lg:pl-64";

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden lg:flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border fixed inset-y-0 left-0 z-30 transition-all duration-200 ease-in-out",
        sidebarWidth
      )}>
        {/* Floating minimize toggle button */}
        <button
          onClick={toggleCollapsed}
          className="absolute -right-3 top-[20px] z-50 flex h-6 w-6 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sm hover:bg-sidebar-accent hover:text-sidebar-primary transition-all duration-200"
          title={collapsed ? "Perluas sidebar" : "Kecilkan sidebar"}
        >
          {collapsed ? <ChevronsRight className="h-3.5 w-3.5" /> : <ChevronsLeft className="h-3.5 w-3.5" />}
        </button>

        <div className={cn("h-16 flex items-center border-b border-sidebar-border", collapsed ? "justify-center px-2" : "gap-3 px-5")}>
          <div className="relative w-10 h-10 rounded-xl bg-white dark:bg-slate-950/90 overflow-hidden flex items-center justify-center border border-primary/20 shadow-[0_4px_16px_rgba(var(--primary),0.06)] flex-shrink-0 group cursor-pointer transition-all duration-300 hover:scale-105">
            <style>{`
              @keyframes float-up-sm {
                0% { transform: translateY(6px) scale(0.6); opacity: 0; }
                20% { opacity: 1; }
                80% { opacity: 0.8; }
                100% { transform: translateY(-16px) scale(1.1); opacity: 0; }
              }
              .animate-float-up-sm-1 {
                animation: float-up-sm 2.5s infinite linear;
              }
              .animate-float-up-sm-2 {
                animation: float-up-sm 3.5s infinite linear;
              }
            `}</style>
            {/* Radar Grid Background */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--primary)/0.06)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--primary)/0.06)_1px,transparent_1px)] bg-[size:6px_6px] opacity-50" />
            {/* Radar Circles */}
            <div className="absolute w-8 h-8 rounded-full border border-primary/10 animate-ping [animation-duration:3s]" />
            {/* Radar Sweep Line */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-primary/20 to-transparent rounded-full animate-spin [animation-duration:3s]" />
            {/* Floating Money symbols */}
            <span className="absolute text-[8px] text-emerald-600 dark:text-emerald-400 z-10 select-none animate-float-up-sm-1" style={{ left: '15%', bottom: '2px' }}>$</span>
            <span className="absolute text-[7px] text-amber-500 dark:text-yellow-400 z-10 select-none animate-float-up-sm-2" style={{ right: '15%', bottom: '2px', animationDelay: '1.2s' }}>🪙</span>
            
            <Radar className="h-5 w-5 text-primary relative z-10 transition-transform duration-500 group-hover:scale-110" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="font-bold text-sm tracking-tight">Finance Radar</div>
              <div className="text-[10px] text-sidebar-foreground/60 uppercase tracking-wider">Internal Finance</div>
            </div>
          )}
        </div>
        <nav className={cn("flex-1 py-4 overflow-y-auto scrollbar-thin", collapsed ? "px-2" : "px-3")}>
          {groups.map((group, groupIdx) => (
            <div key={group.title} className={cn("mb-4", groupIdx > 0 && "mt-2")}>
              {!collapsed ? (
                <div className="px-3 mb-1.5 text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-wider">
                  {group.title}
                </div>
              ) : (
                groupIdx > 0 && <div className="h-px bg-sidebar-border/60 my-2 mx-1" />
              )}
              <div className="space-y-0.5">
                {group.items.map(item => {
                  const badge = getBadgeForPath(item.to);
                  return (
                    <NavLink key={item.to} to={item.to} end={item.to === "/"}
                      title={collapsed ? item.label : undefined}
                      className={({ isActive }) => cn(
                        "flex items-center rounded-md text-sm mb-0.5 group transition-all duration-300 hover:scale-[1.03] hover:-translate-y-[1px] active:scale-[0.98]",
                        collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-primary font-medium"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                      )}>
                      <div className="relative flex items-center justify-center">
                        <item.icon className="h-4 w-4 flex-shrink-0 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
                        {collapsed && badge > 0 && (
                          <span className={cn(
                            "absolute -top-2 -right-2 min-w-4 h-4 rounded-full border border-sidebar flex items-center justify-center text-[7px] font-bold px-0.5 shadow-sm",
                            item.to === "/approvals" ? "bg-destructive text-destructive-foreground" :
                            item.to === "/inventory" ? "bg-warning text-warning-foreground" : "bg-amber-500 text-white"
                          )}>
                            {badge}
                          </span>
                        )}
                      </div>
                      {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
                      {!collapsed && badge > 0 && (
                        <span className={cn(
                          "ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center justify-center min-w-5 h-5",
                          item.to === "/approvals" ? "bg-destructive text-destructive-foreground" :
                          item.to === "/inventory" ? "bg-warning text-warning-foreground" : "bg-amber-500 text-white"
                        )}>
                          {badge}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="relative w-72 bg-sidebar text-sidebar-foreground flex flex-col animate-fade-in">
            <div className="h-16 flex items-center justify-between px-5 border-b border-sidebar-border">
              <div className="flex items-center gap-2">
                <div className="relative w-8 h-8 rounded-lg bg-white dark:bg-slate-950/90 overflow-hidden flex items-center justify-center border border-primary/20 shadow-[0_4px_12px_rgba(var(--primary),0.04)] flex-shrink-0">
                  {/* Radar Grid Background */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--primary)/0.04)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--primary)/0.04)_1px,transparent_1px)] bg-[size:4px_4px] opacity-40" />
                  {/* Radar Sweep Line */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-primary/20 to-transparent rounded-full animate-spin [animation-duration:3s]" />
                  {/* Floating Money symbols */}
                  <span className="absolute text-[7px] text-emerald-600 dark:text-emerald-400 z-10 select-none animate-float-up-sm-1" style={{ left: '15%', bottom: '1px' }}>$</span>
                  
                  <Radar className="h-4 w-4 text-primary relative z-10" />
                </div>
                <span className="font-bold text-sm">Finance Radar</span>
              </div>
              <Button variant="ghost" size="icon" className="text-sidebar-foreground" onClick={() => setOpen(false)}><X className="h-4 w-4" /></Button>
            </div>
            <nav className="flex-1 px-3 py-4 overflow-y-auto">
              {groups.map((group, groupIdx) => (
                <div key={group.title} className={cn("mb-4", groupIdx > 0 && "mt-2")}>
                  <div className="px-3 mb-1.5 text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-wider">
                    {group.title}
                  </div>
                  <div className="space-y-0.5">
                    {group.items.map(item => {
                      const badge = getBadgeForPath(item.to);
                      return (
                        <NavLink key={item.to} to={item.to} end={item.to === "/"} onClick={() => setOpen(false)}
                          className={({ isActive }) => cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm mb-0.5 group transition-all duration-300 hover:scale-[1.03] hover:-translate-y-[1px] active:scale-[0.98]",
                            isActive ? "bg-sidebar-accent text-sidebar-primary font-medium" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                          )}>
                          <item.icon className="h-4 w-4 flex-shrink-0 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
                          <span className="flex-1 text-left">{item.label}</span>
                          {badge > 0 && (
                            <span className={cn(
                              "text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center justify-center min-w-5 h-5",
                              item.to === "/approvals" ? "bg-destructive text-destructive-foreground" :
                              item.to === "/inventory" ? "bg-warning text-warning-foreground" : "bg-amber-500 text-white"
                            )}>
                              {badge}
                            </span>
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* Main */}
      <div className={cn("flex-1 flex flex-col min-w-0 transition-all duration-200 ease-in-out", mainPadding)}>
        {/* Topbar */}
        <header className="h-16 bg-card/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 lg:px-6 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></Button>
            <div>
              <h1 className="text-sm lg:text-base font-semibold tracking-tight">
                {flatItems.find(n => n.to === loc.pathname || (n.to !== "/" && loc.pathname.startsWith(n.to)))?.label || "Dashboard"}
              </h1>
              <p className="text-[11px] text-muted-foreground hidden sm:block">Sistem kontrol keuangan internal</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            
            {/* Notification Bell Dropdown */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="relative text-foreground/80 hover:text-foreground"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-white text-[8px] font-extrabold flex items-center justify-center border border-card shadow-sm animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </Button>

              {notificationsOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setNotificationsOpen(false)} />
                  <div className="absolute right-0 mt-2 w-80 max-h-[420px] rounded-xl border border-border bg-popover text-popover-foreground shadow-lg flex flex-col z-40 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="p-3 border-b border-border flex items-center justify-between flex-shrink-0">
                      <span className="font-semibold text-xs text-foreground">Aktivitas Terbaru</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-[10px] text-primary hover:underline font-semibold"
                        >
                          Tandai semua dibaca
                        </button>
                      )}
                    </div>
                    <div className="flex-1 overflow-y-auto divide-y divide-border/60 max-h-[320px] scrollbar-thin">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-xs text-muted-foreground">
                          Tidak ada aktivitas atau notifikasi terbaru.
                        </div>
                      ) : (
                        notifications.map(n => (
                          <div
                            key={n.id}
                            onClick={() => handleNotificationClick(n)}
                            className={cn(
                              "p-3.5 text-left cursor-pointer hover:bg-accent/40 transition-colors flex items-start gap-3",
                              !n.read && "bg-primary/5 hover:bg-primary/10"
                            )}
                          >
                            <span className={cn(
                              "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                              n.read ? "bg-muted-foreground/30" : "bg-primary"
                            )} />
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-xs text-foreground leading-snug">{n.title}</div>
                              <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">{n.message}</div>
                              <div className="text-[9px] text-muted-foreground/60 mt-1 font-medium">
                                {new Date(n.createdAt).toLocaleDateString("id-ID", {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="p-2.5 text-center border-t border-border flex-shrink-0">
                      <span className="text-[10px] text-muted-foreground font-medium">
                        Menampilkan hingga 20 notifikasi terbaru
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="relative">
              <button 
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 ml-1 pl-2.5 border-l border-border hover:opacity-80 transition-opacity focus:outline-none"
              >
                <div className="w-8 h-8 rounded-full gradient-accent flex items-center justify-center text-xs font-bold text-accent-foreground">
                  {user?.name?.split(" ").map((s: string) => s[0]).slice(0, 2).join("") || "U"}
                </div>
                <div className="text-right sm:block hidden">
                  <div className="text-xs font-medium leading-tight">{user?.name?.split(" ")[0]}</div>
                  <div className="text-[10px] text-muted-foreground capitalize text-left">{user?.role}</div>
                </div>
                <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform duration-200", profileOpen && "rotate-180")} />
              </button>

              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setProfileOpen(false)} />
                  <div className="absolute right-0 mt-2 w-48 rounded-md border border-border bg-popover text-popover-foreground shadow-lg py-1 z-40 animate-in fade-in slide-in-from-top-2 duration-100">
                    <div className="px-3 py-2 border-b border-border text-xs text-muted-foreground truncate">
                      Halo, {user?.name}
                    </div>
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        setChangePassOpen(true);
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-accent hover:text-accent-foreground flex items-center gap-2"
                    >
                      <Lock className="h-3.5 w-3.5" /> Ganti Password
                    </button>
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        setLogoutConfirmOpen(true);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-destructive hover:bg-destructive/10 flex items-center gap-2"
                    >
                      <LogOut className="h-3.5 w-3.5" /> Keluar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 pb-20 lg:pb-8 animate-fade-in">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-card border-t border-border z-30">
          <div className="grid grid-cols-5">
            {mobileBottomNavItems.map(item => (
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

      {/* Change Password Modal */}
      {changePassOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setChangePassOpen(false)} />
          <div className="relative bg-card text-card-foreground border border-border w-full max-w-md rounded-xl shadow-elevated p-6 animate-in zoom-in-95 duration-150 z-10">
            <button
              onClick={() => setChangePassOpen(false)}
              className="absolute top-4 right-4 hover:opacity-85 text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <Lock className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold tracking-tight">Ganti Password</h2>
            </div>

            <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Password Sekarang</label>
                <div className="relative">
                  <input
                    type={showCurrentPw ? "text" : "password"}
                    className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary pr-10"
                    placeholder="Masukkan password saat ini"
                    value={currentPw}
                    onChange={e => setCurrentPw(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw(!showCurrentPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium">Password Baru</label>
                <div className="relative">
                  <input
                    type={showNewPw ? "text" : "password"}
                    className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary pr-10"
                    placeholder="Minimal 8 karakter"
                    value={newPw}
                    onChange={e => setNewPw(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium">Konfirmasi Password Baru</label>
                <div className="relative">
                  <input
                    type={showConfirmNewPw ? "text" : "password"}
                    className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary pr-10"
                    placeholder="Ulangi password baru"
                    value={confirmNewPw}
                    onChange={e => setConfirmNewPw(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmNewPw(!showConfirmNewPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Password strength criteria */}
              {newPw.length > 0 && (
                <div className="bg-muted/40 p-3 rounded-lg border border-border text-xs space-y-1.5 animate-in fade-in duration-200">
                  <div className="font-semibold text-muted-foreground mb-1">Kriteria Password Baru:</div>
                  <div className="flex items-center gap-2">
                    {hasMinLength ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <X className="h-3.5 w-3.5 text-destructive" />}
                    <span className={hasMinLength ? "text-emerald-500 font-medium" : "text-muted-foreground"}>Minimal 8 karakter</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasUppercase ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <X className="h-3.5 w-3.5 text-destructive" />}
                    <span className={hasUppercase ? "text-emerald-500 font-medium" : "text-muted-foreground"}>Minimal satu huruf besar (A-Z)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasLowercase ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <X className="h-3.5 w-3.5 text-destructive" />}
                    <span className={hasLowercase ? "text-emerald-500 font-medium" : "text-muted-foreground"}>Minimal satu huruf kecil (a-z)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasNumber ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <X className="h-3.5 w-3.5 text-destructive" />}
                    <span className={hasNumber ? "text-emerald-500 font-medium" : "text-muted-foreground"}>Minimal satu angka (0-9)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasSpecialChar ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <X className="h-3.5 w-3.5 text-destructive" />}
                    <span className={hasSpecialChar ? "text-emerald-500 font-medium" : "text-muted-foreground"}>Minimal satu karakter spesial (@, #, $, dll.)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {passwordsMatch ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <X className="h-3.5 w-3.5 text-destructive" />}
                    <span className={passwordsMatch ? "text-emerald-500 font-medium" : "text-muted-foreground"}>Konfirmasi password cocok</span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setChangePassOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" size="sm" disabled={!canSubmitChangePw || loadingChangePw}>
                  {loadingChangePw && <Loader2 className="h-3 w-3 mr-2 animate-spin" />}
                  Simpan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {logoutConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setLogoutConfirmOpen(false)} />
          <div className="relative bg-card text-card-foreground border border-border w-full max-w-sm rounded-xl shadow-elevated p-6 animate-in zoom-in-95 duration-150 z-10">
            <h2 className="text-base font-semibold tracking-tight mb-2">Konfirmasi Keluar</h2>
            <p className="text-xs text-muted-foreground mb-6">Apakah Anda yakin ingin keluar dari sistem Finance Radar?</p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setLogoutConfirmOpen(false)}>
                Batal
              </Button>
              <Button type="button" variant="destructive" size="sm" onClick={() => {
                setLogoutConfirmOpen(false);
                handleLogout();
              }}>
                Keluar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
