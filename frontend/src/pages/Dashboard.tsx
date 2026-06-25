import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/stores/authStore";
import {
  TrendingUp, TrendingDown, Wallet, AlertCircle,
  CheckCircle2, Clock, FileText, Coins, ArrowRight, Package, XCircle
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

const tooltipContentStyle = {
  background: "rgba(15, 23, 42, 0.95)",
  backdropFilter: "blur(12px)",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  borderRadius: "12px",
  boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.5)",
  fontSize: "12px",
  color: "#fff",
  padding: "8px 12px"
};

const tooltipItemStyle = {
  color: "#fff"
};

const tooltipLabelStyle = {
  color: "#cbd5e1",
  fontWeight: "bold"
};

export default function Dashboard() {
  const [requests, setRequests] = useState<any[]>([]);
  const [trendPeriod, setTrendPeriod] = useState<string>(new Date().getFullYear().toString());
  const [categories, setCategories] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [pettyCash, setPettyCash] = useState<any>({ balance: 0, initial: 0, transactions: [] });
  const [lowStockCount, setLowStockCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().getMonth().toString());
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

  const { user } = useAuth();
  const isStaff = user?.role === "staff";

  useEffect(() => {
    async function loadDashboardData(silent = false) {
      try {
        if (!silent) setLoading(true);
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
        if (!silent) toast.error("Gagal memuat data dashboard: " + err.message);
      } finally {
        if (!silent) setLoading(false);
      }
    }
    loadDashboardData();

    const interval = setInterval(() => {
      loadDashboardData(true);
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedMonth === "all") {
      setTrendPeriod(selectedYear);
    } else {
      setTrendPeriod("1_month");
    }
  }, [selectedMonth, selectedYear]);

  const isSelectedPeriod = (dateStr: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const yearMatch = d.getFullYear().toString() === selectedYear;
    if (selectedMonth === "all") {
      return yearMatch;
    }
    return yearMatch && d.getMonth().toString() === selectedMonth;
  };

  const manualPettyCashOut = (pettyCash.transactions || []).filter((t: any) => 
    t.type === "OUT" && (!t.refRequestId || t.refRequestId === "-" || t.refRequestId === "")
  );

  const manualRealized = manualPettyCashOut
    .filter((t: any) => isSelectedPeriod(t.createdAt))
    .reduce((acc: number, t: any) => acc + Number(t.amount), 0);

  const total = sumBy(requests, r => r.status !== "DRAFT" && isSelectedPeriod(r.createdAt), r => Number(r.amount));
  const approved = sumBy(requests, r => ["APPROVED_BY_FINANCE", "PURCHASED", "REALIZED", "WAITING_VERIFICATION", "CLOSED"].includes(r.status) && isSelectedPeriod(r.createdAt), r => Number(r.amount));
  const rejected = sumBy(requests, r => r.status === "REJECTED" && isSelectedPeriod(r.createdAt), r => Number(r.amount));
  
  // Realized requests filter
  const realized = sumBy(requests, r => !!r.financeRealization && isSelectedPeriod(r.financeRealization.createdAt), r => Number(r.financeRealization?.realizedAmount || 0)) + manualRealized;
  
  const outstanding = approved - sumBy(requests, r => !!r.financeRealization && isSelectedPeriod(r.financeRealization.createdAt), r => Number(r.financeRealization?.realizedAmount || 0));
  const pending = requests.filter(r => ["SUBMITTED", "APPROVED_BY_SUPERVISOR"].includes(r.status) && isSelectedPeriod(r.createdAt)).length;
  
  // Total nominal Rupiah pending approval
  const pendingAmount = sumBy(requests, r => ["SUBMITTED", "APPROVED_BY_SUPERVISOR"].includes(r.status) && isSelectedPeriod(r.createdAt), r => Number(r.amount));
  
  // New counts for Dashboard metrics
  const newSubmissionsCount = requests.filter(r => r.status !== "DRAFT" && isSelectedPeriod(r.createdAt)).length;
  const needRevisionCount = requests.filter(r => r.status === "NEED_REVISION" && isSelectedPeriod(r.createdAt)).length;

  // Only count approved/realized requests in the selected period for monthly expenses based on realization/approval date
  const totalExpensesMonth = sumBy(requests, r => {
    if (!["REALIZED", "CLOSED"].includes(r.status)) return false;
    if (r.financeRealization) {
      return isSelectedPeriod(r.financeRealization.createdAt);
    }
    return isSelectedPeriod(r.updatedAt);
  }, r => Number(r.financeRealization?.realizedAmount || r.amount)) + manualRealized;

  const byCategory = categories.map(c => {
    let sum = 0;
    requests.forEach(r => {
      // Only include realized/closed requests in category distribution
      if (!["REALIZED", "CLOSED"].includes(r.status)) return;
      const realizedDate = r.financeRealization ? r.financeRealization.createdAt : r.updatedAt;
      if (!isSelectedPeriod(realizedDate)) return;
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
      if (!isSelectedPeriod(t.createdAt)) return;
      const match = t.description.match(/^\[(.*?)\] (.*)$/);
      const catName = match ? match[1] : null;
      if (catName === c.name) {
        sum += Number(t.amount);
      }
    });
    return { name: c.name, value: sum };
  }).filter(x => x.value > 0);

  const uncategorizedManualSum = manualPettyCashOut
    .filter((t: any) => !t.description.match(/^\[(.*?)\] (.*)$/) && isSelectedPeriod(t.createdAt))
    .reduce((acc: number, t: any) => acc + Number(t.amount), 0);

  if (uncategorizedManualSum > 0) {
    byCategory.push({ name: "Tidak Terkategori", value: uncategorizedManualSum });
  }

  const byDept = departments.map(d => ({
    name: d.name,
    value: sumBy(requests, r => r.departmentId === d.id && r.status !== "DRAFT" && isSelectedPeriod(r.createdAt), r => Number(r.amount)),
  })).filter(x => x.value > 0);

  if (manualRealized > 0) {
    byDept.push({ name: "Kas Kecil / Operasional", value: manualRealized });
  }

  const bySite = sites.map(s => ({
    name: s.name.replace("Site ", ""),
    value: sumBy(requests, r => r.siteId === s.id && r.status !== "DRAFT" && isSelectedPeriod(r.createdAt), r => Number(r.amount)),
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

  const PIE_COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--info))", "hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--destructive))", "#8b5cf6", "#ec4899", "#f59e0b", "#06b6d4", "#84cc16"];

  const colorMap: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    destructive: "bg-destructive/10 text-destructive",
    info: "bg-info/10 text-info",
    warning: "bg-warning/10 text-warning",
    accent: "bg-accent/10 text-accent",
  };

  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
  const periodName = selectedMonth === "all" ? `Tahun ${selectedYear}` : `${months[parseInt(selectedMonth)]} ${selectedYear}`;

  const stats = isStaff ? [
    { label: `Total Pengajuan Saya (${periodName})`, value: formatRupiah(total), icon: FileText, trend: "aktif", up: true, color: "primary" },
    { label: `Total Disetujui (${periodName})`, value: formatRupiah(approved), icon: CheckCircle2, trend: "approved", up: true, color: "success" },
    { label: `Menunggu Approval (${periodName})`, value: `${pending} pengajuan`, icon: Clock, trend: "perlu tindakan", up: false, color: "warning" },
    { label: `Perlu Tindakan / Revisi (${periodName})`, value: `${needRevisionCount} pengajuan`, icon: AlertCircle, trend: "revisi", up: false, color: "destructive" },
  ] : [
    { label: `Total Pengeluaran (${periodName})`, value: formatRupiah(totalExpensesMonth), icon: Wallet, trend: "realisasi", up: true, color: "primary" },
    { label: `Nominal Menunggu Approval (${periodName})`, value: formatRupiah(pendingAmount), icon: Clock, trend: `${pending} pengajuan`, up: false, color: "warning" },
    { label: `Total Pengajuan Baru (${periodName})`, value: `${newSubmissionsCount} pengajuan`, icon: FileText, trend: "aktif", up: true, color: "info" },
    { label: `Outstanding (${periodName})`, value: formatRupiah(outstanding), icon: Clock, trend: "pending", up: false, color: "warning" },
    { label: "Sisa Petty Cash", value: formatRupiah(pettyCash.balance), icon: Coins, trend: pettyCash.initial > 0 ? `${Math.round(pettyCash.balance / pettyCash.initial * 100)}%` : "0%", up: true, color: "accent" },
    { label: "Stok Hampir Habis", value: `${lowStockCount} item`, icon: Package, trend: "perlu restock", up: false, color: "destructive" },
    { label: `Total Disetujui (${periodName})`, value: formatRupiah(approved), icon: CheckCircle2, trend: "approved", up: true, color: "success" },
    { label: `Total Ditolak (${periodName})`, value: formatRupiah(rejected), icon: XCircle, trend: "rejected", up: false, color: "destructive" },
  ];

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-2">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">Memuat dashboard...</p>
      </div>
    );
  }

  const getMonthlyTrend = () => {
    const trend = [];
    const year = parseInt(selectedYear, 10);
    const targetMonth = selectedMonth === "all" ? new Date().getMonth() : parseInt(selectedMonth, 10);
    
    if (trendPeriod === "6_months") {
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const mIndex = d.getMonth();
        const mName = months[mIndex];
        const y = d.getFullYear();
        
        const sum = requests
          .filter(r => {
            const rDate = new Date(r.createdAt);
            return rDate.getMonth() === mIndex && rDate.getFullYear() === y && ["APPROVED_BY_FINANCE", "PURCHASED", "REALIZED", "CLOSED"].includes(r.status);
          })
          .reduce((acc, r) => acc + Number(r.amount), 0);

        const pcSum = manualPettyCashOut
          .filter(t => {
            const tDate = new Date(t.createdAt);
            return tDate.getMonth() === mIndex && tDate.getFullYear() === y;
          })
          .reduce((acc, t) => acc + Number(t.amount), 0);
          
        trend.push({ month: `${mName}`, value: sum + pcSum });
      }
    } else if (trendPeriod === "1_month") {
      for (let w = 1; w <= 4; w++) {
        const sum = requests
          .filter(r => {
            const rDate = new Date(r.createdAt);
            if (rDate.getFullYear() !== year || rDate.getMonth() !== targetMonth) return false;
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
            if (tDate.getFullYear() !== year || tDate.getMonth() !== targetMonth) return false;
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
      const targetYear = parseInt(trendPeriod, 10) || year;
      for (let m = 0; m < 12; m++) {
        const sum = requests
          .filter(r => {
            const rDate = new Date(r.createdAt);
            return rDate.getFullYear() === targetYear && rDate.getMonth() === m && ["APPROVED_BY_FINANCE", "PURCHASED", "REALIZED", "CLOSED"].includes(r.status);
          })
          .reduce((acc, r) => acc + Number(r.amount), 0);

        const pcSum = manualPettyCashOut
          .filter(t => {
            const tDate = new Date(t.createdAt);
            return tDate.getFullYear() === targetYear && tDate.getMonth() === m;
          })
          .reduce((acc, t) => acc + Number(t.amount), 0);
          
        trend.push({ month: months[m], value: sum + pcSum });
      }
    }
    return trend;
  };
  const monthlyTrend = getMonthlyTrend();

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header with Period Selectors */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-xs text-muted-foreground">Ringkasan aktivitas dan kinerja keuangan</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <SelectValue placeholder="Pilih Bulan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Bulan</SelectItem>
              {months.map((m, idx) => (
                <SelectItem key={idx} value={idx.toString()}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[110px] h-9 text-xs">
              <SelectValue placeholder="Pilih Tahun" />
            </SelectTrigger>
            <SelectContent>
              {Array.from(
                new Set([new Date().getFullYear(), ...requests.map(r => new Date(r.createdAt).getFullYear())])
              )
                .sort((a, b) => b - a)
                .map(y => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))
              }
            </SelectContent>
          </Select>
        </div>
      </div>

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
      {!isStaff && (
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
                <SelectItem value="1_month">Bulan Ini</SelectItem>
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
                  <linearGradient id="dashboardTrendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="dashboardTrendStroke" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="hsl(var(--primary))" />
                    <stop offset="100%" stopColor="hsl(var(--accent))" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="hsl(var(--border))" vertical={false} opacity={0.4} />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `${v / 1e6}jt`} />
                <Tooltip
                  contentStyle={tooltipContentStyle}
                  itemStyle={tooltipItemStyle}
                  labelStyle={tooltipLabelStyle}
                  formatter={(v: number) => [formatRupiah(v), "Pengeluaran"]}
                />
                <Area type="monotone" dataKey="value" stroke="url(#dashboardTrendStroke)" strokeWidth={3} fill="url(#dashboardTrendGrad)" />
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
                    <Pie
                      data={byCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {byCategory.map((_, i) => (
                        <Cell
                          key={i}
                          fill={PIE_COLORS[i % PIE_COLORS.length]}
                          stroke="hsl(var(--card))"
                          strokeWidth={3}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={tooltipContentStyle}
                      itemStyle={tooltipItemStyle}
                      labelStyle={tooltipLabelStyle}
                      formatter={(v: number) => [formatRupiah(v), "Jumlah"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-3 max-h-[140px] overflow-y-auto pr-1">
                  {(() => {
                    const totalCat = byCategory.reduce((acc: number, curr: any) => acc + curr.value, 0);
                    return (
                      <>
                        <div className="space-y-1.5 pb-2">
                          {byCategory.map((c, i) => {
                            const rawPct = totalCat > 0 ? (c.value / totalCat) * 100 : 0;
                            const pct = rawPct % 1 === 0 ? rawPct.toFixed(0) : rawPct.toFixed(1);
                            return (
                              <div key={c.name} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                                  <span className="truncate text-foreground font-medium">{c.name}</span>
                                </div>
                                <div className="flex items-center gap-4 flex-shrink-0 font-mono text-[10px]">
                                  <span className="text-muted-foreground">{pct}%</span>
                                  <span className="text-foreground font-semibold">{formatRupiah(c.value)}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="border-t border-border/80 my-2 pt-2.5 flex items-center justify-between text-xs font-bold">
                          <span className="text-foreground">Total</span>
                          <span className="text-primary font-mono text-[11px]">{formatRupiah(totalCat)}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      )}

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
