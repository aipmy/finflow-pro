import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp, TrendingDown, Wallet, AlertCircle,
  CheckCircle2, Clock, FileText, Coins, ArrowRight, Package
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, CartesianGrid
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { formatRupiah, relativeTime } from "@/utils/format";
import { apiClient } from "@/services/apiClient";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";

const sumBy = <T,>(arr: T[], pred: (x: T) => boolean, val: (x: T) => number) =>
  arr.filter(pred).reduce((a, b) => a + val(b), 0);

export default function Dashboard() {
  const [requests, setRequests] = useState<any[]>([]);
  const [trendPeriod, setTrendPeriod] = useState<string>("6_months");
  const [categories, setCategories] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [pettyCash, setPettyCash] = useState<any>({ balance: 0, initial: 0, transactions: [] });
  const [lowStockCount, setLowStockCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const [reqs, cats, depts, sts, pettyCashRes, itemsRes] = await Promise.all([
          apiClient.requests.list(),
          apiClient.meta.categories(),
          apiClient.meta.departments(),
          apiClient.meta.sites(),
          apiClient.pettyCash.get().catch(() => ({ balance: 0, initial: 0, transactions: [] })),
          apiClient.inventory.list().catch(() => [])
        ]);
        setRequests(reqs);
        setCategories(cats);
        setDepartments(depts);
        setSites(sts);
        if (pettyCashRes) setPettyCash(pettyCashRes);
        if (itemsRes) {
          const count = itemsRes.filter((item: any) => item.stock <= item.minStock).length;
          setLowStockCount(count);
        }
      } catch (err: any) {
        toast.error("Gagal memuat data dashboard: " + err.message);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  const manualPettyCashOut = (pettyCash.transactions || []).filter((t: any) => 
    t.type === "OUT" && (!t.refRequestId || t.refRequestId === "-" || t.refRequestId === "")
  );

  const manualRealized = manualPettyCashOut.reduce((acc: number, t: any) => acc + Number(t.amount), 0);

  const total = sumBy(requests, r => r.status !== "DRAFT", r => Number(r.amount));
  const approved = sumBy(requests, r => ["APPROVED_BY_FINANCE", "PURCHASED", "REALIZED", "WAITING_VERIFICATION", "CLOSED"].includes(r.status), r => Number(r.amount));
  const rejected = sumBy(requests, r => r.status === "REJECTED", r => Number(r.amount));
  const realized = sumBy(requests, r => !!r.financeRealization, r => Number(r.financeRealization?.realizedAmount || 0)) + manualRealized;
  const outstanding = approved - sumBy(requests, r => !!r.financeRealization, r => Number(r.financeRealization?.realizedAmount || 0));
  const pending = requests.filter(r => ["SUBMITTED", "APPROVED_BY_SUPERVISOR"].includes(r.status)).length;

  const byCategory = categories.map(c => {
    let sum = 0;
    requests.forEach(r => {
      if (r.status === "DRAFT") return;
      if (r.items && r.items.length > 0) {
        r.items.forEach((it: any) => {
          if (it.categoryId === c.id) {
            sum += it.qty * Number(it.price);
          }
        });
      } else if (r.categoryId === c.id) {
        sum += Number(r.amount);
      }
    });
    manualPettyCashOut.forEach((t: any) => {
      const match = t.description.match(/^\[(.*?)\] (.*)$/);
      const catName = match ? match[1] : null;
      if (catName === c.name) {
        sum += Number(t.amount);
      }
    });
    return { name: c.name, value: sum };
  }).filter(x => x.value > 0);

  const uncategorizedManualSum = manualPettyCashOut
    .filter((t: any) => !t.description.match(/^\[(.*?)\] (.*)$/))
    .reduce((acc: number, t: any) => acc + Number(t.amount), 0);

  if (uncategorizedManualSum > 0) {
    byCategory.push({ name: "Tidak Terkategori", value: uncategorizedManualSum });
  }

  const byDept = departments.map(d => ({
    name: d.name,
    value: sumBy(requests, r => r.departmentId === d.id && r.status !== "DRAFT", r => Number(r.amount)),
  })).filter(x => x.value > 0);

  if (manualRealized > 0) {
    byDept.push({ name: "Kas Kecil / Operasional", value: manualRealized });
  }

  const bySite = sites.map(s => ({
    name: s.name.replace("Site ", ""),
    value: sumBy(requests, r => r.siteId === s.id && r.status !== "DRAFT", r => Number(r.amount)),
  })).filter(x => x.value > 0);

  if (manualRealized > 0) {
    const pusatSite = bySite.find(s => s.name === "Pusat");
    if (pusatSite) {
      pusatSite.value += manualRealized;
    } else {
      bySite.push({ name: "Pusat", value: manualRealized });
    }
  }

  const latest = [...requests].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
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

  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
  const getMonthlyTrend = () => {
    const trend = [];
    const now = new Date();
    
    if (trendPeriod === "6_months") {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const mIndex = d.getMonth();
        const mName = months[mIndex];
        const year = d.getFullYear();
        
        const sum = requests
          .filter(r => {
            const rDate = new Date(r.createdAt);
            return rDate.getMonth() === mIndex && rDate.getFullYear() === year && ["APPROVED_BY_FINANCE", "PURCHASED", "REALIZED", "CLOSED"].includes(r.status);
          })
          .reduce((acc, r) => acc + Number(r.amount), 0);

        const pcSum = manualPettyCashOut
          .filter(t => {
            const tDate = new Date(t.createdAt);
            return tDate.getMonth() === mIndex && tDate.getFullYear() === year;
          })
          .reduce((acc, t) => acc + Number(t.amount), 0);
          
        trend.push({ month: `${mName}`, value: sum + pcSum });
      }
    } else if (trendPeriod === "1_month") {
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      for (let w = 1; w <= 4; w++) {
        const sum = requests
          .filter(r => {
            const rDate = new Date(r.createdAt);
            if (rDate.getFullYear() !== currentYear || rDate.getMonth() !== currentMonth) return false;
            if (!["APPROVED_BY_FINANCE", "PURCHASED", "REALIZED", "CLOSED"].includes(r.status)) return false;
            const day = rDate.getDate();
            if (w === 1) return day >= 1 && day <= 7;
            if (w === 2) return day >= 8 && day <= 14;
            if (w === 3) return day >= 15 && day <= 21;
            return day >= 22;
          })
          .reduce((acc, r) => acc + Number(r.amount), 0);

        const pcSum = manualPettyCashOut
          .filter(t => {
            const tDate = new Date(t.createdAt);
            if (tDate.getFullYear() !== currentYear || tDate.getMonth() !== currentMonth) return false;
            const day = tDate.getDate();
            if (w === 1) return day >= 1 && day <= 7;
            if (w === 2) return day >= 8 && day <= 14;
            if (w === 3) return day >= 15 && day <= 21;
            return day >= 22;
          })
          .reduce((acc, t) => acc + Number(t.amount), 0);
          
        trend.push({ month: `Mng ${w}`, value: sum + pcSum });
      }
    } else {
      const year = parseInt(trendPeriod, 10);
      for (let m = 0; m < 12; m++) {
        const sum = requests
          .filter(r => {
            const rDate = new Date(r.createdAt);
            return rDate.getFullYear() === year && rDate.getMonth() === m && ["APPROVED_BY_FINANCE", "PURCHASED", "REALIZED", "CLOSED"].includes(r.status);
          })
          .reduce((acc, r) => acc + Number(r.amount), 0);

        const pcSum = manualPettyCashOut
          .filter(t => {
            const tDate = new Date(t.createdAt);
            return tDate.getFullYear() === year && tDate.getMonth() === m;
          })
          .reduce((acc, t) => acc + Number(t.amount), 0);
          
        trend.push({ month: months[m], value: sum + pcSum });
      }
    }
    return trend;
  };
  const monthlyTrend = getMonthlyTrend();

  const stats = [
    { label: "Total Pengajuan Bulan Ini", value: formatRupiah(total), icon: FileText, trend: "aktif", up: true, color: "primary" },
    { label: "Total Disetujui", value: formatRupiah(approved), icon: CheckCircle2, trend: "approved", up: true, color: "success" },
    { label: "Total Ditolak", value: formatRupiah(rejected), icon: AlertCircle, trend: "rejected", up: false, color: "destructive" },
    { label: "Total Realisasi", value: formatRupiah(realized), icon: Wallet, trend: "terbayar", up: true, color: "info" },
    { label: "Outstanding", value: formatRupiah(outstanding), icon: Clock, trend: "pending", up: false, color: "warning" },
    { label: "Sisa Petty Cash", value: formatRupiah(pettyCash.balance), icon: Coins, trend: pettyCash.initial > 0 ? `${Math.round(pettyCash.balance / pettyCash.initial * 100)}%` : "0%", up: true, color: "accent" },
    { label: "Stok Hampir Habis", value: `${lowStockCount} item`, icon: Package, trend: "perlu restock", up: false, color: "destructive" },
    { label: "Menunggu Approval", value: `${pending} pengajuan`, icon: Clock, trend: "perlu tindakan", up: false, color: "warning" },
  ];

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-2">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">Memuat dashboard...</p>
      </div>
    );
  }

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
              <p className="text-xs text-muted-foreground mt-0.5">
                {trendPeriod === "6_months" ? "6 bulan terakhir" : trendPeriod === "1_month" ? "Bulan ini" : `Tahun ${trendPeriod}`}
              </p>
            </div>
            <Select value={trendPeriod} onValueChange={setTrendPeriod}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Pilih periode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1_month">1 Bulan</SelectItem>
                <SelectItem value="6_months">6 Bulan</SelectItem>
                {Array.from(
                  new Set([new Date().getFullYear(), ...requests.map(r => new Date(r.createdAt).getFullYear())])
                )
                  .sort((a, b) => b - a)
                  .map(y => (
                    <SelectItem key={y} value={y.toString()}>Tahun {y}</SelectItem>
                  ))
                }
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={monthlyTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="source-color" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="source-color" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={v => `${v / 1e6}jt`} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  itemStyle={{ color: "hsl(var(--popover-foreground))" }}
                  labelStyle={{ color: "hsl(var(--popover-foreground))" }}
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
            {byCategory.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[200px] text-xs text-muted-foreground">
                Tidak ada data kategori pengeluaran.
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={byCategory} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2} dataKey="value">
                      {byCategory.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                     <Tooltip 
                       contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} 
                       itemStyle={{ color: "hsl(var(--popover-foreground))" }}
                       labelStyle={{ color: "hsl(var(--popover-foreground))" }}
                       formatter={(v: number) => formatRupiah(v)} 
                     />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-3">
                  {byCategory.slice(0, 4).map((c, i) => (
                    <div key={c.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="truncate">{c.name}</span>
                      </div>
                      <span className="text-muted-foreground font-mono text-[10px]">{formatRupiah(c.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom lists grid */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="shadow-elegant">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pengajuan Terbaru</CardTitle>
            <p className="text-xs text-muted-foreground">5 transaksi terakhir yang diajukan</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {latest.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">Tidak ada transaksi terbaru.</div>
              ) : (
                latest.map(r => (
                  <div key={r.id} className="flex items-center justify-between p-3.5 hover:bg-muted/30">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono text-muted-foreground">{r.code}</span>
                        <StatusBadge status={r.status} />
                      </div>
                      <Link to={`/requests/${r.id}`} className="font-medium text-sm hover:text-primary block truncate">{r.title}</Link>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        Oleh {r.requester?.name || "-"} • {relativeTime(r.createdAt)}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <div className="font-semibold text-sm">{formatRupiah(Number(r.amount))}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {latest.length > 0 && (
              <div className="p-3 border-t border-border text-center">
                <Link to="/requests" className="text-xs font-semibold text-primary inline-flex items-center gap-1 hover:gap-1.5 transition-all">
                  Lihat Semua Pengajuan <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-elegant">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Persetujuan Tertunda</CardTitle>
            <p className="text-xs text-muted-foreground">Memerlukan verifikasi & approval segera</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {pendingApprovals.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">Tidak ada persetujuan tertunda.</div>
              ) : (
                pendingApprovals.map(r => (
                  <div key={r.id} className="flex items-center justify-between p-3.5 hover:bg-muted/30">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono text-muted-foreground">{r.code}</span>
                        <StatusBadge status={r.status} />
                      </div>
                      <Link to={`/requests/${r.id}`} className="font-medium text-sm hover:text-primary block truncate">{r.title}</Link>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        Nominal: {formatRupiah(Number(r.amount))} • Diajukan {relativeTime(r.createdAt)}
                      </div>
                    </div>
                    <Button asChild size="sm" variant="outline" className="h-7 text-xs"><Link to={`/requests/${r.id}`}>Tinjau</Link></Button>
                  </div>
                ))
              )}
            </div>
            {pendingApprovals.length > 0 && (
              <div className="p-3 border-t border-border text-center">
                <Link to="/approvals" className="text-xs font-semibold text-primary inline-flex items-center gap-1 hover:gap-1.5 transition-all">
                  Lihat Semua Approval <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
