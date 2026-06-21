import { Link } from "react-router-dom";
import {
  TrendingUp, TrendingDown, Wallet, AlertCircle,
  CheckCircle2, Clock, FileText, Coins, ArrowRight, Package
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell, CartesianGrid
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { formatRupiah, relativeTime } from "@/utils/format";
import {
  requests, items as inv, pettyCash, monthlyTrend,
  categories, departments, sites, users
} from "@/data/mockData";

const sumBy = <T,>(arr: T[], pred: (x: T) => boolean, val: (x: T) => number) =>
  arr.filter(pred).reduce((a, b) => a + val(b), 0);

export default function Dashboard() {
  const total = sumBy(requests, () => true, r => r.amount);
  const approved = sumBy(requests, r => ["APPROVED_BY_FINANCE", "PURCHASED", "REALIZED", "CLOSED"].includes(r.status), r => r.amount);
  const rejected = sumBy(requests, r => r.status === "REJECTED", r => r.amount);
  const realized = sumBy(requests, r => r.realizedAmount !== undefined, r => r.realizedAmount || 0);
  const outstanding = approved - realized;
  const pending = requests.filter(r => ["SUBMITTED", "APPROVED_BY_SUPERVISOR"].includes(r.status)).length;
  const lowStock = inv.filter(i => i.stock < i.minStock).length;

  const byCategory = categories.map(c => ({
    name: c.name,
    value: sumBy(requests, r => r.category === c.id, r => r.amount),
  })).filter(x => x.value > 0);

  const byDept = departments.map(d => ({
    name: d.name,
    value: sumBy(requests, r => r.department === d.id, r => r.amount),
  })).filter(x => x.value > 0);

  const bySite = sites.map(s => ({
    name: s.name.replace("Site ", ""),
    value: sumBy(requests, r => r.site === s.id, r => r.amount),
  })).filter(x => x.value > 0);

  const latest = [...requests].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  const pendingApprovals = requests.filter(r => ["SUBMITTED", "APPROVED_BY_SUPERVISOR"].includes(r.status)).slice(0, 4);

  const PIE_COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--info))", "hsl(var(--warning))", "hsl(var(--success))", "hsl(var(--destructive))", "hsl(var(--primary-glow))"];

  const colorMap: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    destructive: "bg-destructive/10 text-destructive",
    info: "bg-info/10 text-info",
    warning: "bg-warning/10 text-warning",
    accent: "bg-accent/10 text-accent",
  };

  const stats = [
    { label: "Total Pengajuan Bulan Ini", value: formatRupiah(total), icon: FileText, trend: "+12.4%", up: true, color: "primary" },
    { label: "Total Disetujui", value: formatRupiah(approved), icon: CheckCircle2, trend: "+8.2%", up: true, color: "success" },
    { label: "Total Ditolak", value: formatRupiah(rejected), icon: AlertCircle, trend: "-3.1%", up: false, color: "destructive" },
    { label: "Total Realisasi", value: formatRupiah(realized), icon: Wallet, trend: "+5.6%", up: true, color: "info" },
    { label: "Outstanding", value: formatRupiah(outstanding), icon: Clock, trend: "-2.4%", up: false, color: "warning" },
    { label: "Sisa Petty Cash", value: formatRupiah(pettyCash.balance), icon: Coins, trend: `${Math.round(pettyCash.balance / pettyCash.initial * 100)}%`, up: true, color: "accent" },
    { label: "Stok Hampir Habis", value: `${lowStock} item`, icon: Package, trend: "perlu restock", up: false, color: "destructive" },
    { label: "Menunggu Approval", value: `${pending} pengajuan`, icon: Clock, trend: "perlu tindakan", up: false, color: "warning" },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4">
        {stats.map(s => (
          <Card key={s.label} className="shadow-elegant hover:shadow-elevated transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorMap[s.color]}`}>
                  <s.icon className="h-4 w-4" />
                </div>
                <span className={`text-[10px] font-medium flex items-center gap-0.5 ${s.up ? "text-success" : "text-muted-foreground"}`}>
                  {s.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {s.trend}
                </span>
              </div>
              <div className="text-lg lg:text-xl font-bold tracking-tight">{s.value}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base">Tren Pengeluaran Bulanan</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">6 bulan terakhir</p>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={monthlyTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={v => `${v / 1e6}jt`} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => formatRupiah(v)}
                />
                <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#g1)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-elegant">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Per Kategori</CardTitle>
            <p className="text-xs text-muted-foreground">Distribusi pengeluaran</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={byCategory} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2} dataKey="value">
                  {byCategory.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => formatRupiah(v)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-3">
              {byCategory.slice(0, 4).map((c, i) => (
                <div key={c.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i] }} />
                    <span className="truncate">{c.name}</span>
                  </div>
                  <span className="text-muted-foreground font-mono text-[10px]">{formatRupiah(c.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* By dept + site */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="shadow-elegant">
          <CardHeader className="pb-2"><CardTitle className="text-base">Per Departemen</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byDept} layout="vertical" margin={{ left: 5, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={v => `${v / 1e6}jt`} />
                <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} width={80} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => formatRupiah(v)} />
                <Bar dataKey="value" fill="hsl(var(--accent))" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-elegant">
          <CardHeader className="pb-2"><CardTitle className="text-base">Per Site / Lokasi</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={bySite}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={v => `${v / 1e6}jt`} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => formatRupiah(v)} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Latest + pending */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Pengajuan Terbaru</CardTitle>
            <Link to="/requests" className="text-xs text-primary hover:underline flex items-center gap-1">Lihat semua <ArrowRight className="h-3 w-3" /></Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {latest.map(r => {
              const u = users.find(x => x.id === r.requesterId);
              return (
                <Link key={r.id} to={`/requests/${r.id}`} className="flex items-center justify-between p-3 rounded-md border border-border hover:border-primary/40 hover:bg-muted/40 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-mono text-muted-foreground">{r.code}</span>
                      <StatusBadge status={r.status} />
                    </div>
                    <div className="text-sm font-medium truncate">{r.title}</div>
                    <div className="text-[11px] text-muted-foreground">{u?.name} • {relativeTime(r.createdAt)}</div>
                  </div>
                  <div className="text-right ml-3">
                    <div className="text-sm font-semibold">{formatRupiah(r.amount)}</div>
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <Card className="shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Menunggu Approval</CardTitle>
            <Link to="/approvals" className="text-xs text-primary hover:underline flex items-center gap-1">Lihat semua <ArrowRight className="h-3 w-3" /></Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingApprovals.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">Tidak ada pengajuan menunggu approval</div>
            ) : pendingApprovals.map(r => {
              const u = users.find(x => x.id === r.requesterId);
              return (
                <Link key={r.id} to={`/requests/${r.id}`} className="flex items-center justify-between p-3 rounded-md border border-border hover:border-primary/40 hover:bg-muted/40 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-mono text-muted-foreground">{r.code}</span>
                      <StatusBadge status={r.status} />
                    </div>
                    <div className="text-sm font-medium truncate">{r.title}</div>
                    <div className="text-[11px] text-muted-foreground">{u?.name} • {relativeTime(r.createdAt)}</div>
                  </div>
                  <div className="text-right ml-3">
                    <div className="text-sm font-semibold">{formatRupiah(r.amount)}</div>
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
