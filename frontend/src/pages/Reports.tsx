import { useState, useEffect, useMemo } from "react";
import {
  FileSpreadsheet, FileText, FileType, Loader2, Award, TrendingUp, DollarSign, BarChart2,
  Search, ChevronDown, ChevronUp, ArrowUpDown, CheckCircle2, XCircle, Clock, AlertCircle,
  Users, CalendarDays, PieChart as PieChartIcon, ArrowLeft, ExternalLink
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, AreaChart, Area, Legend
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatRupiah } from "@/utils/format";
import { apiClient } from "@/services/apiClient";
import { toast } from "sonner";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--info))", "hsl(var(--warning))", "hsl(var(--success))", "hsl(var(--destructive))", "hsl(var(--primary-glow))", "#8b5cf6", "#f59e0b", "#06b6d4", "#ec4899", "#84cc16"];
const MONTHS_ID = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const currentYearStr = new Date().getFullYear().toString();
  const [selectedYear, setSelectedYear] = useState<string>(currentYearStr);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [availableYears, setAvailableYears] = useState<number[]>([new Date().getFullYear()]);
  const [data, setData] = useState<any>({
    byCategory: [], byDept: [], bySite: [], byUser: [],
    topRequests: [], topSpenders: [], allTransactions: [],
    monthlyBreakdown: [], monthlyCategories: [], stats: {},
    years: []
  });

  // Drill-down state
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string } | null>(null);
  const [userDetailData, setUserDetailData] = useState<any>(null);
  const [loadingUserDetail, setLoadingUserDetail] = useState(false);

  const loadData = async (year = selectedYear, month = selectedMonth, silent = false) => {
    try {
      if (!silent) setLoading(true);
      const filters: any = {};
      if (year !== "all") filters.year = year;
      if (month !== "all") filters.month = (parseInt(month, 10) + 1).toString();
      const res = await apiClient.reports.getAggregates(filters);
      setData(res);
      if (res.years) {
        const yrs = Array.from(new Set([new Date().getFullYear(), ...res.years])).sort((a: number, b: number) => b - a);
        setAvailableYears(yrs as number[]);
      }
    } catch (err: any) {
      if (!silent) toast.error(err.message || "Gagal memuat data laporan");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData(selectedYear, selectedMonth);
    const interval = setInterval(() => {
      loadData(selectedYear, selectedMonth, true);
    }, 15000);
    return () => clearInterval(interval);
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    if (!selectedUser) {
      setUserDetailData(null);
      return;
    }

    const fetchDetail = async () => {
      try {
        setLoadingUserDetail(true);
        const filters: any = {};
        if (selectedYear !== "all") filters.year = selectedYear;
        if (selectedMonth !== "all") filters.month = (parseInt(selectedMonth, 10) + 1).toString();
        const res = await apiClient.reports.getUserDetail(selectedUser.id, filters);
        setUserDetailData(res);
      } catch (err: any) {
        toast.error(err.message || "Gagal memuat detail pemohon");
        setSelectedUser(null);
      } finally {
        setLoadingUserDetail(false);
      }
    };

    fetchDetail();
  }, [selectedUser?.id, selectedYear, selectedMonth]);

  const handleExport = async (fmt: "excel" | "pdf" | "docx") => {
    try {
      toast.loading(`Mengekspor laporan ke ${fmt.toUpperCase()}...`, { id: "export-toast" });
      const token = localStorage.getItem("finflow:access_token") || "";
      let url = `/api/reports/export/${fmt}?token=${encodeURIComponent(token)}`;
      if (selectedYear !== "all") url += `&year=${selectedYear}`;
      if (selectedMonth !== "all") url += `&month=${parseInt(selectedMonth, 10) + 1}`;
      window.location.href = url;
      toast.success(`Export ${fmt.toUpperCase()} berhasil. Log tercatat di Audit Trail.`, { id: "export-toast" });
    } catch (err: any) {
      toast.error(`Gagal mengekspor laporan: ${err.message || err}`, { id: "export-toast" });
    }
  };

  const periodLabel = selectedMonth === "all"
    ? (selectedYear === "all" ? "Semua Periode" : `Tahun ${selectedYear}`)
    : `${MONTHS_ID[parseInt(selectedMonth)]} ${selectedYear}`;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Memuat data laporan...</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Laporan</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Audit Keuangan — {periodLabel}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => handleExport("excel")}><FileSpreadsheet className="h-4 w-4 mr-1.5 text-success" />Excel</Button>
          <Button size="sm" variant="outline" onClick={() => handleExport("pdf")}><FileType className="h-4 w-4 mr-1.5 text-destructive" />PDF</Button>
          <Button size="sm" variant="outline" onClick={() => handleExport("docx")}><FileText className="h-4 w-4 mr-1.5 text-info" />DOCX</Button>
        </div>
      </div>

      {/* Period Filter Bar */}
      <div className="flex items-center justify-between gap-3 p-3 bg-muted/30 border border-border rounded-lg">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-muted-foreground">Periode:</span>
          <Select value={selectedMonth} onValueChange={(val) => setSelectedMonth(val)}>
            <SelectTrigger className="w-[140px] h-8 text-xs bg-background">
              <SelectValue placeholder="Pilih bulan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Bulan</SelectItem>
              {MONTHS_SHORT.map((m, idx) => (
                <SelectItem key={idx} value={idx.toString()}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedYear} onValueChange={(val) => setSelectedYear(val)}>
            <SelectTrigger className="w-[120px] h-8 text-xs bg-background">
              <SelectValue placeholder="Pilih tahun" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tahun</SelectItem>
              {availableYears.map(y => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="executive" onValueChange={(val) => { if (val !== "user") setSelectedUser(null); }}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="executive">Ringkasan Eksekutif</TabsTrigger>
          <TabsTrigger value="category">Kategori</TabsTrigger>
          <TabsTrigger value="dept">Departemen</TabsTrigger>
          <TabsTrigger value="site">Site</TabsTrigger>
          <TabsTrigger value="user">Pemohon</TabsTrigger>
          <TabsTrigger value="monthly">Tren Bulanan</TabsTrigger>
          <TabsTrigger value="transactions">Rincian Transaksi</TabsTrigger>
        </TabsList>

        <TabsContent value="executive">
          <ExecutiveSummaryPanel data={data} periodLabel={periodLabel} />
        </TabsContent>
        <TabsContent value="category">
          <ReportPanel data={data.byCategory} title="Pengeluaran per Kategori" />
        </TabsContent>
        <TabsContent value="dept">
          <ReportPanel data={data.byDept} title="Pengeluaran per Departemen" />
        </TabsContent>
        <TabsContent value="site">
          <ReportPanel data={data.bySite} title="Pengeluaran per Site" />
        </TabsContent>
        <TabsContent value="user">
          {selectedUser ? (
            <UserDetailPanel
              data={userDetailData}
              onBack={() => setSelectedUser(null)}
              loading={loadingUserDetail || !userDetailData}
            />
          ) : (
            <SpenderPanel
              data={data}
              onSelectUser={(userId, name) => setSelectedUser({ id: userId, name })}
            />
          )}
        </TabsContent>
        <TabsContent value="monthly">
          <MonthlyBreakdownPanel data={data} />
        </TabsContent>
        <TabsContent value="transactions">
          <TransactionsPanel data={data} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* =============================================================================
   EXECUTIVE SUMMARY PANEL
============================================================================= */
function ExecutiveSummaryPanel({ data, periodLabel }: { data: any; periodLabel: string }) {
  const stats = data.stats || {};
  const totalExpense = stats.totalRealizedAmount || data.byCategory.reduce((acc: number, curr: any) => acc + curr.value, 0);
  const largestTx = data.topRequests && data.topRequests.length > 0 ? data.topRequests[0] : null;
  const topSpender = data.topSpenders && data.topSpenders.length > 0 ? data.topSpenders[0] : null;
  const topCategory = data.byCategory && data.byCategory.length > 0
    ? [...data.byCategory].sort((a: any, b: any) => b.value - a.value)[0]
    : null;

  const colorMap: Record<string, string> = {
    primary: "bg-primary/10 text-primary border-primary/20",
    destructive: "bg-destructive/10 text-destructive border-destructive/20",
    warning: "bg-warning/10 text-warning border-warning/20",
    success: "bg-success/10 text-success border-success/20",
    info: "bg-info/10 text-info border-info/20",
    accent: "bg-accent/10 text-accent border-accent/20",
  };

  const highlights = [
    { label: "Total Realisasi Pengeluaran", value: formatRupiah(totalExpense), desc: periodLabel, icon: DollarSign, color: "primary" },
    { label: "Transaksi Terbesar", value: largestTx ? formatRupiah(largestTx.amount) : "Rp 0", desc: largestTx ? largestTx.title : "Tidak ada transaksi", icon: TrendingUp, color: "destructive" },
    { label: "Top Spender", value: topSpender ? formatRupiah(topSpender.value) : "Rp 0", desc: topSpender ? `${topSpender.name} (${topSpender.count} pengajuan)` : "Tidak ada pemohon", icon: Award, color: "warning" },
    { label: "Kategori Terbesar", value: topCategory ? formatRupiah(topCategory.value) : "Rp 0", desc: topCategory ? topCategory.name : "Tidak ada kategori", icon: BarChart2, color: "success" },
  ];

  const statCards = [
    { label: "Total Pengajuan", value: stats.totalSubmitted || 0, icon: FileText, color: "primary" },
    { label: "Disetujui", value: stats.totalApproved || 0, icon: CheckCircle2, color: "success", extra: `${stats.approvalRate || 0}%` },
    { label: "Ditolak", value: stats.totalRejected || 0, icon: XCircle, color: "destructive" },
    { label: "Perlu Revisi", value: stats.totalRevision || 0, icon: AlertCircle, color: "warning" },
    { label: "Menunggu Approval", value: stats.totalPending || 0, icon: Clock, color: "info" },
    { label: "Rata-rata Nominal", value: formatRupiah(stats.avgAmount || 0), icon: DollarSign, color: "accent" },
  ];

  const totalExpenseNum = totalExpense || 0;

  return (
    <div className="space-y-5 mt-3">
      {/* Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {highlights.map(hl => (
          <Card key={hl.label} className="shadow-elegant border hover:shadow-elevated transition-all duration-300">
            <CardContent className="p-4 flex items-start justify-between">
              <div className="space-y-1 pr-2 min-w-0">
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">{hl.label}</span>
                <div className="text-lg font-extrabold tracking-tight text-foreground truncate">{hl.value}</div>
                <p className="text-[10px] text-muted-foreground truncate font-medium">{hl.desc}</p>
              </div>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${colorMap[hl.color]}`}>
                <hl.icon className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Audit Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map(sc => (
          <Card key={sc.label} className="shadow-elegant">
            <CardContent className="p-3 text-center">
              <div className={`w-8 h-8 rounded-lg mx-auto flex items-center justify-center mb-2 ${colorMap[sc.color]}`}>
                <sc.icon className="h-3.5 w-3.5" />
              </div>
              <div className="text-lg font-bold text-foreground">{sc.value}</div>
              {sc.extra && <div className="text-[10px] font-semibold text-success">{sc.extra}</div>}
              <div className="text-[10px] text-muted-foreground mt-0.5">{sc.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Grid columns */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Left Column: Top 10 Largest Transactions */}
        <Card className="shadow-elegant">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-bold">10 Transaksi Terbesar (Alokasi Pengeluaran)</CardTitle>
            <p className="text-xs text-muted-foreground">Detail pengeluaran satuan dengan nominal terbesar</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {!data.topRequests || data.topRequests.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">Tidak ada data transaksi.</div>
              ) : (
                data.topRequests.map((r: any, idx: number) => (
                  <div key={r.code || idx} className="flex items-center justify-between p-3.5 hover:bg-muted/20">
                    <div className="min-w-0 pr-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary flex-shrink-0">{idx + 1}</span>
                        <span className="text-[9px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{r.code}</span>
                        <span className="text-[10px] text-muted-foreground font-medium">{r.categoryName}</span>
                      </div>
                      <div className="font-semibold text-xs truncate text-foreground">{r.title}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        Oleh: {r.requesterName} • {new Date(r.date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-bold text-xs text-foreground font-mono">{formatRupiah(r.amount)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Spender Ranking */}
        <Card className="shadow-elegant">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-bold">Peringkat Pengeluaran Pemohon</CardTitle>
            <p className="text-xs text-muted-foreground">Akumulasi total serapan dana berdasarkan pemohon</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {!data.topSpenders || data.topSpenders.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">Tidak ada data pemohon.</div>
              ) : (
                data.topSpenders.map((s: any, idx: number) => {
                  const pct = totalExpenseNum > 0 ? ((s.value / totalExpenseNum) * 100).toFixed(1) : "0.0";
                  return (
                    <div key={s.name || idx} className="flex items-center justify-between p-3.5 hover:bg-muted/20">
                      <div className="flex items-center gap-3 min-w-0 pr-3">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                          {idx + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-xs text-foreground truncate">{s.name}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {s.count} pengajuan • {s.categories && s.categories.length > 0 ? s.categories.slice(0, 2).map((c: any) => c.name).join(", ") : "-"}
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 font-mono text-xs">
                        <div className="font-bold text-foreground">{formatRupiah(s.value)}</div>
                        <div className="text-[10px] text-muted-foreground">({pct}%)</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* =============================================================================
   SPENDER PANEL (TAB PEMOHON) - dengan drill-down
============================================================================= */
function SpenderPanel({ data, onSelectUser }: { data: any; onSelectUser: (userId: string, name: string) => void }) {
  const totalExpense = data.stats?.totalRealizedAmount || data.byCategory.reduce((acc: number, curr: any) => acc + curr.value, 0);

  return (
    <div className="space-y-4 mt-3">
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Bar Chart */}
        <Card className="shadow-elegant">
          <CardHeader className="pb-2"><CardTitle className="text-base">Peringkat Pemohon</CardTitle></CardHeader>
          <CardContent>
            {data.byUser && data.byUser.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.byUser.slice(0, 10)} layout="vertical" margin={{ left: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={v => `${v / 1e6}jt`} />
                  <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} width={110} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    itemStyle={{ color: "hsl(var(--popover-foreground))" }}
                    labelStyle={{ color: "hsl(var(--popover-foreground))" }}
                    formatter={(v: number) => formatRupiah(v)}
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center min-h-[200px] text-xs text-muted-foreground">Tidak ada data.</div>
            )}
          </CardContent>
        </Card>

        {/* Spender List with Drill-Down */}
        <Card className="shadow-elegant">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Detail Pemohon</CardTitle>
            <p className="text-xs text-muted-foreground">Klik nama pemohon untuk melihat distribusi detail</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
              {!data.topSpenders || data.topSpenders.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">Tidak ada data.</div>
              ) : (
                data.topSpenders.map((s: any, idx: number) => {
                  const pct = totalExpense > 0 ? ((s.value / totalExpense) * 100).toFixed(1) : "0.0";
                  return (
                    <button
                      key={s.name || idx}
                      className="flex items-center justify-between p-3.5 hover:bg-primary/5 w-full text-left transition-colors cursor-pointer"
                      onClick={() => s.userId && onSelectUser(s.userId, s.name)}
                      disabled={!s.userId}
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-3">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: COLORS[idx % COLORS.length] + "20", color: COLORS[idx % COLORS.length] }}>
                          {idx + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-xs text-foreground truncate flex items-center gap-1">
                            {s.name}
                            {s.userId && <ExternalLink className="h-3 w-3 text-primary opacity-50" />}
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {s.count} pengajuan
                            {s.categories && s.categories.length > 0 && (
                              <> • {s.categories.slice(0, 3).map((c: any) => c.name).join(", ")}</>
                            )}
                          </div>
                          {/* Mini category bar */}
                          {s.categories && s.categories.length > 0 && (
                            <div className="flex h-1.5 rounded-full overflow-hidden mt-1.5 w-full max-w-[200px]">
                              {s.categories.map((cat: any, ci: number) => (
                                <div
                                  key={cat.name}
                                  className="h-full"
                                  style={{
                                    width: `${(cat.value / s.value) * 100}%`,
                                    background: COLORS[ci % COLORS.length],
                                    minWidth: "2px"
                                  }}
                                  title={`${cat.name}: ${formatRupiah(cat.value)}`}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 font-mono text-xs">
                        <div className="font-bold text-foreground">{formatRupiah(s.value)}</div>
                        <div className="text-[10px] text-muted-foreground">({pct}%)</div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* =============================================================================
   USER DETAIL PANEL (DRILL-DOWN PER ORANG)
============================================================================= */
function UserDetailPanel({ data, onBack, loading }: { data: any; onBack: () => void; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-2 mt-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">Memuat detail pemohon...</p>
      </div>
    );
  }

  const user = data.user;
  const colorMap: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    destructive: "bg-destructive/10 text-destructive",
    warning: "bg-warning/10 text-warning",
    info: "bg-info/10 text-info",
  };

  const summaryCards = [
    { label: "Total Realisasi", value: formatRupiah(data.totalAmount), icon: DollarSign, color: "primary" },
    { label: "Jumlah Disetujui", value: `${data.totalApproved}`, icon: CheckCircle2, color: "success" },
    { label: "Total Pengajuan", value: `${data.totalSubmitted}`, icon: FileText, color: "info" },
    { label: "Ditolak", value: `${data.totalRejected}`, icon: XCircle, color: "destructive" },
    { label: "Menunggu", value: `${data.totalPending}`, icon: Clock, color: "warning" },
  ];

  return (
    <div className="space-y-4 mt-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button size="sm" variant="ghost" onClick={onBack} className="h-8">
          <ArrowLeft className="h-4 w-4 mr-1" /> Kembali
        </Button>
        <div>
          <h3 className="text-base font-bold text-foreground">{user?.name || "Pemohon"}</h3>
          <p className="text-[10px] text-muted-foreground">{user?.email} • {user?.role}</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {summaryCards.map(sc => (
          <Card key={sc.label} className="shadow-elegant">
            <CardContent className="p-3 text-center">
              <div className={`w-7 h-7 rounded-lg mx-auto flex items-center justify-center mb-1.5 ${colorMap[sc.color]}`}>
                <sc.icon className="h-3.5 w-3.5" />
              </div>
              <div className="text-base font-bold text-foreground">{sc.value}</div>
              <div className="text-[10px] text-muted-foreground">{sc.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Pie Chart: Category Breakdown */}
        <Card className="shadow-elegant">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-1.5">
              <PieChartIcon className="h-4 w-4 text-primary" /> Distribusi per Kategori
            </CardTitle>
            <p className="text-xs text-muted-foreground">Ke mana saja pengeluaran dialokasikan</p>
          </CardHeader>
          <CardContent>
            {data.byCategory && data.byCategory.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={data.byCategory} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2} dataKey="value">
                      {data.byCategory.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                      itemStyle={{ color: "hsl(var(--popover-foreground))" }}
                      formatter={(v: number) => formatRupiah(v)}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {data.byCategory.map((c: any, i: number) => {
                    const pct = data.totalAmount > 0 ? ((c.value / data.totalAmount) * 100).toFixed(1) : "0";
                    return (
                      <div key={c.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                          <span className="truncate font-medium">{c.name}</span>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0 font-mono text-[10px]">
                          <span className="text-muted-foreground">{pct}%</span>
                          <span className="font-semibold">{formatRupiah(c.value)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center min-h-[200px] text-xs text-muted-foreground">Tidak ada data kategori.</div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Trend */}
        <Card className="shadow-elegant">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-info" /> Tren Pengajuan Bulanan
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.monthlyTrend && data.monthlyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={data.monthlyTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="userTrendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
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
                  <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#userTrendGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center min-h-[200px] text-xs text-muted-foreground">Tidak ada data trend.</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* All Transactions for this user */}
      <Card className="shadow-elegant">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-sm font-bold">Semua Transaksi {user?.name}</CardTitle>
          <p className="text-xs text-muted-foreground">{data.transactions?.length || 0} transaksi ditemukan</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-3 font-semibold text-muted-foreground">Kode</th>
                  <th className="text-left p-3 font-semibold text-muted-foreground">Judul</th>
                  <th className="text-left p-3 font-semibold text-muted-foreground">Kategori</th>
                  <th className="text-right p-3 font-semibold text-muted-foreground">Nominal</th>
                  <th className="text-left p-3 font-semibold text-muted-foreground">Status</th>
                  <th className="text-left p-3 font-semibold text-muted-foreground">Tanggal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.transactions && data.transactions.length > 0 ? (
                  data.transactions.map((tx: any) => (
                    <tr key={tx.id} className="hover:bg-muted/20">
                      <td className="p-3 font-mono text-muted-foreground">{tx.code}</td>
                      <td className="p-3 font-medium text-foreground max-w-[200px] truncate">
                        <Link to={`/requests/${tx.id}`} className="hover:text-primary">{tx.title}</Link>
                      </td>
                      <td className="p-3 text-muted-foreground">{tx.categoryName}</td>
                      <td className="p-3 text-right font-mono font-semibold">{formatRupiah(tx.amount)}</td>
                      <td className="p-3">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                          tx.status === "CLOSED" || tx.status === "REALIZED" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                        }`}>{tx.status}</span>
                      </td>
                      <td className="p-3 text-muted-foreground">{new Date(tx.date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Tidak ada transaksi.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* =============================================================================
   MONTHLY BREAKDOWN PANEL
============================================================================= */
function MonthlyBreakdownPanel({ data }: { data: any }) {
  const monthlyBreakdown = data.monthlyBreakdown || [];
  const categories = data.monthlyCategories || [];

  return (
    <div className="space-y-4 mt-3">
      {/* Stacked Bar Chart */}
      <Card className="shadow-elegant">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Tren Pengeluaran Bulanan per Kategori</CardTitle>
          <p className="text-xs text-muted-foreground">Visualisasi distribusi bulanan pengeluaran</p>
        </CardHeader>
        <CardContent>
          {monthlyBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={monthlyBreakdown} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={10} angle={-30} textAnchor="end" height={60} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={v => `${v / 1e6}jt`} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
                  itemStyle={{ color: "hsl(var(--popover-foreground))" }}
                  labelStyle={{ color: "hsl(var(--popover-foreground))", fontWeight: "bold" }}
                  formatter={(v: number) => formatRupiah(v)}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {categories.map((cat: string, i: number) => (
                  <Bar key={cat} dataKey={cat} stackId="a" fill={COLORS[i % COLORS.length]} radius={i === categories.length - 1 ? [4, 4, 0, 0] : undefined} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center min-h-[250px] text-xs text-muted-foreground">Tidak ada data tren bulanan.</div>
          )}
        </CardContent>
      </Card>

      {/* Pivot Table */}
      <Card className="shadow-elegant">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-sm font-bold">Tabel Pivot: Bulan × Kategori</CardTitle>
          <p className="text-xs text-muted-foreground">Detail angka per bulan dan per kategori</p>
        </CardHeader>
        <CardContent className="p-0">
          {monthlyBreakdown.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-3 font-semibold text-muted-foreground sticky left-0 bg-muted/30 z-10">Bulan</th>
                    {categories.map((cat: string) => (
                      <th key={cat} className="text-right p-3 font-semibold text-muted-foreground whitespace-nowrap">{cat}</th>
                    ))}
                    <th className="text-right p-3 font-bold text-foreground">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {monthlyBreakdown.map((row: any) => (
                    <tr key={row.monthKey} className="hover:bg-muted/20">
                      <td className="p-3 font-medium text-foreground sticky left-0 bg-background whitespace-nowrap">{row.month}</td>
                      {categories.map((cat: string) => (
                        <td key={cat} className="p-3 text-right font-mono text-muted-foreground">
                          {row[cat] > 0 ? formatRupiah(row[cat]) : <span className="text-muted-foreground/30">-</span>}
                        </td>
                      ))}
                      <td className="p-3 text-right font-mono font-bold text-foreground">{formatRupiah(row.total)}</td>
                    </tr>
                  ))}
                  {/* Grand Total Row */}
                  <tr className="bg-muted/40 border-t-2 border-primary/20">
                    <td className="p-3 font-bold text-foreground sticky left-0 bg-muted/40">TOTAL</td>
                    {categories.map((cat: string) => {
                      const catTotal = monthlyBreakdown.reduce((acc: number, row: any) => acc + (row[cat] || 0), 0);
                      return (
                        <td key={cat} className="p-3 text-right font-mono font-bold text-foreground">
                          {catTotal > 0 ? formatRupiah(catTotal) : "-"}
                        </td>
                      );
                    })}
                    <td className="p-3 text-right font-mono font-extrabold text-primary">
                      {formatRupiah(monthlyBreakdown.reduce((acc: number, row: any) => acc + row.total, 0))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-muted-foreground">Tidak ada data.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* =============================================================================
   TRANSACTIONS PANEL (RINCIAN TRANSAKSI / BUKU BESAR)
============================================================================= */
function TransactionsPanel({ data }: { data: any }) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<string>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterDept, setFilterDept] = useState<string>("all");
  const [page, setPage] = useState(1);
  const perPage = 20;

  const allTransactions = data.allTransactions || [];
  const uniqueCategories = [...new Set(allTransactions.map((t: any) => t.categoryName))].sort();
  const uniqueDepts = [...new Set(allTransactions.map((t: any) => t.departmentName))].sort();

  const filtered = useMemo(() => {
    let result = [...allTransactions];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((t: any) =>
        t.title?.toLowerCase().includes(q) ||
        t.code?.toLowerCase().includes(q) ||
        t.requesterName?.toLowerCase().includes(q) ||
        t.categoryName?.toLowerCase().includes(q)
      );
    }

    // Filter by category
    if (filterCategory !== "all") {
      result = result.filter((t: any) => t.categoryName === filterCategory);
    }

    // Filter by department
    if (filterDept !== "all") {
      result = result.filter((t: any) => t.departmentName === filterDept);
    }

    // Sort
    result.sort((a: any, b: any) => {
      let va = a[sortField];
      let vb = b[sortField];
      if (sortField === "date") {
        va = new Date(va).getTime();
        vb = new Date(vb).getTime();
      } else if (sortField === "amount") {
        va = Number(va);
        vb = Number(vb);
      } else {
        va = String(va || "").toLowerCase();
        vb = String(vb || "").toLowerCase();
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [allTransactions, search, filterCategory, filterDept, sortField, sortDir]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);
  const totalFiltered = filtered.reduce((acc: number, t: any) => acc + Number(t.amount), 0);

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
    setPage(1);
  };

  const SortIcon = ({ field }: { field: string }) => (
    <ArrowUpDown className={`h-3 w-3 inline ml-1 ${sortField === field ? "text-primary" : "text-muted-foreground/50"}`} />
  );

  return (
    <div className="space-y-3 mt-3">
      {/* Filters */}
      <Card className="shadow-elegant">
        <CardContent className="p-3">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Cari kode, judul, pemohon, kategori..."
                className="pl-8 h-8 text-xs"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <Select value={filterCategory} onValueChange={(v) => { setFilterCategory(v); setPage(1); }}>
              <SelectTrigger className="w-[150px] h-8 text-xs">
                <SelectValue placeholder="Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                {uniqueCategories.map((c: string) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterDept} onValueChange={(v) => { setFilterDept(v); setPage(1); }}>
              <SelectTrigger className="w-[150px] h-8 text-xs">
                <SelectValue placeholder="Departemen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Departemen</SelectItem>
                {uniqueDepts.map((d: string) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-[10px] text-muted-foreground ml-auto">
              {filtered.length} transaksi • Total: <span className="font-bold text-foreground">{formatRupiah(totalFiltered)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="shadow-elegant">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-3 font-semibold text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort("code")}>
                    Kode <SortIcon field="code" />
                  </th>
                  <th className="text-left p-3 font-semibold text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort("title")}>
                    Judul <SortIcon field="title" />
                  </th>
                  <th className="text-left p-3 font-semibold text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort("requesterName")}>
                    Pemohon <SortIcon field="requesterName" />
                  </th>
                  <th className="text-left p-3 font-semibold text-muted-foreground">Departemen</th>
                  <th className="text-left p-3 font-semibold text-muted-foreground">Kategori</th>
                  <th className="text-right p-3 font-semibold text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort("amount")}>
                    Nominal <SortIcon field="amount" />
                  </th>
                  <th className="text-left p-3 font-semibold text-muted-foreground">Tipe</th>
                  <th className="text-left p-3 font-semibold text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort("date")}>
                    Tanggal <SortIcon field="date" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginated.length > 0 ? paginated.map((tx: any, idx: number) => (
                  <tr key={`${tx.code}-${idx}`} className="hover:bg-muted/20">
                    <td className="p-3 font-mono text-muted-foreground whitespace-nowrap">{tx.code}</td>
                    <td className="p-3 font-medium text-foreground max-w-[200px] truncate">
                      {tx.id && tx.type !== "PETTY_CASH" ? (
                        <Link to={`/requests/${tx.id}`} className="hover:text-primary">{tx.title}</Link>
                      ) : tx.title}
                    </td>
                    <td className="p-3 text-muted-foreground whitespace-nowrap">{tx.requesterName}</td>
                    <td className="p-3 text-muted-foreground whitespace-nowrap">{tx.departmentName}</td>
                    <td className="p-3 text-muted-foreground whitespace-nowrap">{tx.categoryName}</td>
                    <td className="p-3 text-right font-mono font-semibold whitespace-nowrap">{formatRupiah(tx.amount)}</td>
                    <td className="p-3">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                        tx.type === "PETTY_CASH" ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary"
                      }`}>{tx.type === "PETTY_CASH" ? "Kas Kecil" : tx.type || "-"}</span>
                    </td>
                    <td className="p-3 text-muted-foreground whitespace-nowrap">
                      {new Date(tx.date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Tidak ada transaksi yang cocok.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-3 border-t border-border">
              <span className="text-[10px] text-muted-foreground">
                Halaman {page} dari {totalPages}
              </span>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs px-2"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Sebelumnya
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs px-2"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Selanjutnya
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* =============================================================================
   GENERIC REPORT PANEL (Kategori / Departemen / Site)
============================================================================= */
function ReportPanel({ data, title }: { data: { name: string; value: number }[]; title: string }) {
  const total = data.reduce((a, b) => a + b.value, 0);

  if (data.length === 0) {
    return (
      <Card className="shadow-elegant mt-3">
        <CardContent className="flex flex-col items-center justify-center min-h-[250px] text-muted-foreground text-sm">
          Tidak ada data pengeluaran untuk ditampilkan.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid lg:grid-cols-2 gap-4 mt-3">
      <Card className="shadow-elegant">
        <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} layout="vertical" margin={{ left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={v => `${v / 1e6}jt`} />
              <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} width={110} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                itemStyle={{ color: "hsl(var(--popover-foreground))" }}
                labelStyle={{ color: "hsl(var(--popover-foreground))" }}
                formatter={(v: number) => formatRupiah(v)}
              />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card className="shadow-elegant">
        <CardHeader className="pb-2"><CardTitle className="text-base">Distribusi</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
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
            {data.map((c, i) => (
              <div key={c.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="truncate">{c.name}</span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-muted-foreground font-mono text-[10px]">{total > 0 ? Math.round(c.value / total * 100) : 0}%</span>
                  <span className="font-medium">{formatRupiah(c.value)}</span>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between text-xs pt-2 border-t border-border font-bold">
              <span>Total</span>
              <span className="text-primary">{formatRupiah(total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
