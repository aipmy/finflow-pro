import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/services/apiClient";
import { toast } from "sonner";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Smartphone, Search, RefreshCw, Wifi, Phone, MessageSquare, AlertTriangle, Info, Calendar, MapPin, Database,
  ArrowDown, ArrowUp, ArrowUpDown, Download, TrendingUp, Activity, BarChart3, Zap, Settings, Timer, Eye
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip,
  Cell, PieChart, Pie
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────
interface Simcard {
  msisdn: string;
  lokasi: string;
  grup: string;
  site: string;
  siteId: string;
  kuota_digunakan: string;
  sisa_kuota: string;
  voice_digunakan: string;
  sisa_voice: string;
  sms_digunakan: string;
  sisa_sms: string;
  kuotaPercent: number;
  scrapedAt: string | null;
}

interface Site {
  id: string;
  name: string;
}

interface OverviewData {
  summary: {
    totalModem: number;
    totalUsedGB: number;
    totalAllocatedGB: number;
    criticalCount: number;
    warningCount: number;
    safeCount: number;
  };
  monthlyTrend: { periode: string; totalUsed: number; totalAllocated: number; count: number }[];
  perGrup: { grup: string; totalUsed: number; totalAllocated: number; count: number }[];
  top10: { msisdn: string; lokasi: string; grup: string; site: string; used: number; total: number; percent: number }[];
}

interface ScraperStatus {
  enabled: boolean;
  intervalMinutes: number;
  lastSyncAt: string | null;
  isSyncing: boolean;
  lastSyncResult: { success: boolean; count?: number; error?: string; durationMs?: number } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────
const getIndonesianMonthYear = () => {
  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  const date = new Date();
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
};

const parseQuota = (quotaStr: string) => {
  if (!quotaStr || quotaStr === "Tidak Ditemukan") return { used: 0, total: 10 };
  const parts = quotaStr.match(/([\d.]+)/g);
  if (parts && parts.length >= 2) return { used: parseFloat(parts[0]), total: parseFloat(parts[1]) };
  return { used: 0, total: 10 };
};

const parseVoice = (voiceStr: string) => {
  if (!voiceStr) return { used: 0, total: 60, percent: 0 };
  const parts = voiceStr.match(/(\d+)/g);
  if (parts && parts.length >= 2) {
    const used = parseInt(parts[0]), total = parseInt(parts[1]);
    return { used, total, percent: total > 0 ? (used / total) * 100 : 0 };
  }
  return { used: 0, total: 60, percent: 0 };
};

const parseSms = (smsStr: string) => {
  if (!smsStr) return { used: 0, total: 60, percent: 0 };
  const parts = smsStr.match(/(\d+)/g);
  if (parts && parts.length >= 2) {
    const used = parseInt(parts[0]), total = parseInt(parts[1]);
    return { used, total, percent: total > 0 ? (used / total) * 100 : 0 };
  }
  return { used: 0, total: 60, percent: 0 };
};

const GRUP_COLORS = [
  "hsl(220, 90%, 56%)", "hsl(160, 75%, 43%)", "hsl(30, 95%, 55%)",
  "hsl(340, 80%, 55%)", "hsl(270, 70%, 55%)", "hsl(190, 80%, 45%)",
  "hsl(50, 90%, 50%)", "hsl(0, 75%, 55%)", "hsl(140, 60%, 45%)",
  "hsl(300, 60%, 50%)"
];

const formatTimeSince = (dateStr: string | null) => {
  if (!dateStr) return "Belum pernah";
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds} detik lalu`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  return new Date(dateStr).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};

// ─── Component ────────────────────────────────────────────────────────
export default function SimcardUsage() {
  // ── State
  const [data, setData] = useState<Simcard[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [scraperStatus, setScraperStatus] = useState<ScraperStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Detail dialog
  const [detailMsisdn, setDetailMsisdn] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedSiteId, setSelectedSiteId] = useState<string>("ALL");
  const [selectedGrup, setSelectedGrup] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "CRITICAL" | "WARNING" | "SAFE">("ALL");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" }>({ key: "kuotaPercent", direction: "desc" });

  // Scraper config UI
  const [configEnabled, setConfigEnabled] = useState(true);
  const [configInterval, setConfigInterval] = useState("5");

  // ── Sort helpers
  const requestSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown className="h-3 w-3 ml-1 inline opacity-30" />;
    return sortConfig.direction === "asc" ? <ArrowUp className="h-3 w-3 ml-1 inline" /> : <ArrowDown className="h-3 w-3 ml-1 inline" />;
  };

  // ── Init
  useEffect(() => {
    setSelectedMonth(getIndonesianMonthYear());
  }, []);

  // ── Fetch data
  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const [usageRes, sitesRes, overviewRes, scraperRes] = await Promise.all([
        apiClient.simcard.getUsage({ periode: selectedMonth || getIndonesianMonthYear() }),
        apiClient.meta.sites(),
        apiClient.simcard.getOverview(),
        apiClient.simcard.getScraperStatus()
      ]);

      if (usageRes.success && usageRes.data) setData(usageRes.data);
      if (sitesRes) setSites(sitesRes);
      if (overviewRes.success && overviewRes.data) setOverview(overviewRes.data);
      if (scraperRes.success && scraperRes.data) {
        setScraperStatus(scraperRes.data);
        setConfigEnabled(scraperRes.data.enabled);
        setConfigInterval(String(scraperRes.data.intervalMinutes));
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    if (selectedMonth) loadAll();
  }, [selectedMonth, loadAll]);

  // Poll scraper status every 30s
  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const res = await apiClient.simcard.getScraperStatus();
        if (res.success && res.data) {
          setScraperStatus(res.data);
          // If a sync just finished, reload data
          if (res.data.lastSyncResult?.success && !res.data.isSyncing) {
            const lastSync = res.data.lastSyncAt ? new Date(res.data.lastSyncAt).getTime() : 0;
            const now = Date.now();
            if (now - lastSync < 35000) {
              loadAll();
            }
          }
        }
      } catch { /* silent */ }
    }, 30000);
    return () => clearInterval(poll);
  }, [loadAll]);

  // ── Load history when detail dialog opens
  useEffect(() => {
    if (detailMsisdn) {
      setLoadingHistory(true);
      apiClient.simcard.getHistory(detailMsisdn)
        .then(res => { if (res.success) setHistoryData(res.data); })
        .catch(err => console.error("Error loading history:", err))
        .finally(() => setLoadingHistory(false));
    }
  }, [detailMsisdn]);

  // ── Manual Sync
  const handleSync = async () => {
    try {
      setSyncing(true);
      toast.info("Memulai sinkronisasi scraper. Mohon tunggu...");
      const res = await apiClient.simcard.sync();
      if (res.success) {
        toast.success(`Sukses mensinkronkan ${res.count} kartu SIM! (${((res.durationMs || 0) / 1000).toFixed(1)}s)`);
        loadAll();
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal mensinkronkan");
    } finally {
      setSyncing(false);
    }
  };

  // ── Update scraper config
  const handleUpdateConfig = async (enabled?: boolean, interval?: number) => {
    try {
      const body: any = {};
      if (enabled !== undefined) body.enabled = enabled;
      if (interval !== undefined) body.intervalMinutes = interval;
      const res = await apiClient.simcard.updateScraperConfig(body);
      if (res.success) {
        setScraperStatus(res.data);
        toast.success("Konfigurasi scraper diperbarui!");
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal mengubah konfigurasi");
    }
  };

  // ── Export CSV
  const handleExportCSV = () => {
    if (sortedData.length === 0) { toast.warning("Tidak ada data"); return; }
    const csvHeaders = ["MSISDN", "Lokasi", "Grup/Tol", "Site", "Kuota Digunakan", "Sisa Kuota", "Persen", "Status"];
    const csvRows = sortedData.map(item => {
      const statusText = item.kuotaPercent >= 90 ? "Perlu Isi" : item.kuotaPercent >= 70 ? "Waspada" : "Aman";
      return [item.msisdn, `"${item.lokasi}"`, `"${item.grup}"`, `"${item.site}"`, `"${item.kuota_digunakan}"`, `"${item.sisa_kuota}"`, `${item.kuotaPercent.toFixed(1)}%`, statusText];
    });
    const csvContent = "data:text/csv;charset=utf-8," + [csvHeaders.join(","), ...csvRows.map(e => e.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `Modem_Usage_${selectedMonth.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Laporan CSV berhasil diunduh!");
  };

  // ── Filter + Sort
  const groupsList = Array.from(new Set(data.map(item => item.grup).filter(Boolean)));

  const filteredData = data.filter(item => {
    const matchesSearch = item.msisdn.toLowerCase().includes(search.toLowerCase()) ||
      item.lokasi.toLowerCase().includes(search.toLowerCase()) ||
      (item.grup && item.grup.toLowerCase().includes(search.toLowerCase()));
    const matchesSite = selectedSiteId === "ALL" || item.siteId === selectedSiteId;
    const matchesGrup = selectedGrup === "ALL" || item.grup === selectedGrup;
    let matchesStatus = true;
    if (statusFilter === "CRITICAL") matchesStatus = item.kuotaPercent >= 90;
    else if (statusFilter === "WARNING") matchesStatus = item.kuotaPercent >= 70 && item.kuotaPercent < 90;
    else if (statusFilter === "SAFE") matchesStatus = item.kuotaPercent < 70;
    return matchesSearch && matchesSite && matchesGrup && matchesStatus;
  });

  const totalCount = data.length;
  const criticalCount = data.filter(i => i.kuotaPercent >= 90).length;
  const warningCount = data.filter(i => i.kuotaPercent >= 70 && i.kuotaPercent < 90).length;
  const safeCount = data.filter(i => i.kuotaPercent < 70).length;

  const sortedData = [...filteredData].sort((a, b) => {
    let valA = a[sortConfig.key as keyof Simcard];
    let valB = b[sortConfig.key as keyof Simcard];
    if (valA === null || valA === undefined) valA = "";
    if (valB === null || valB === undefined) valB = "";
    if (typeof valA === "string" && typeof valB === "string") return sortConfig.direction === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
    if (typeof valA === "number" && typeof valB === "number") return sortConfig.direction === "asc" ? valA - valB : valB - valA;
    return 0;
  });

  // ── Detail selected card
  const selectedSim = data.find(i => i.msisdn === detailMsisdn) || null;

  // ── Render
  return (
    <div className="p-4 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      {/* ═══════════════ HEADER ═══════════════ */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Smartphone className="h-6 w-6 text-primary" />
              Monitoring Modem 4G Traffic Counting
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Dashboard overview penggunaan kuota modem seluruh lokasi traffic counting.
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button variant="outline" onClick={loadAll} disabled={loading || syncing} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button onClick={handleSync} disabled={loading || syncing || (scraperStatus?.isSyncing ?? false)} className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white">
              <Database className={`h-4 w-4 ${syncing || scraperStatus?.isSyncing ? "animate-spin" : ""}`} />
              {syncing || scraperStatus?.isSyncing ? "Syncing..." : "Sync Sekarang"}
            </Button>
          </div>
        </div>

        {/* ─── Scraper Control Panel ─── */}
        <Card className="border-primary/15 bg-gradient-to-r from-primary/[0.03] to-transparent">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className={`w-2.5 h-2.5 rounded-full ${scraperStatus?.isSyncing ? "bg-blue-500 animate-pulse" : scraperStatus?.enabled ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"}`} />
                <Settings className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">Auto-Scraping</span>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={configEnabled}
                  onCheckedChange={(checked) => {
                    setConfigEnabled(checked);
                    handleUpdateConfig(checked, undefined);
                  }}
                />
                <span className="text-xs text-muted-foreground font-medium">
                  {configEnabled ? "Aktif" : "Nonaktif"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Timer className="h-3.5 w-3.5 text-muted-foreground" />
                <Select
                  value={configInterval}
                  onValueChange={(val) => {
                    setConfigInterval(val);
                    handleUpdateConfig(undefined, parseInt(val));
                  }}
                >
                  <SelectTrigger className="w-[140px] h-8 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">Setiap 5 menit</SelectItem>
                    <SelectItem value="10">Setiap 10 menit</SelectItem>
                    <SelectItem value="15">Setiap 15 menit</SelectItem>
                    <SelectItem value="30">Setiap 30 menit</SelectItem>
                    <SelectItem value="60">Setiap 1 jam</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1" />

              {/* Status indicators */}
              <div className="flex flex-wrap items-center gap-3 text-xs">
                {scraperStatus?.isSyncing && (
                  <span className="inline-flex items-center gap-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-full font-semibold">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    Sedang Scraping...
                  </span>
                )}
                {scraperStatus?.lastSyncAt && (
                  <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full font-medium">
                    <Activity className="h-3 w-3" />
                    Terakhir: {formatTimeSince(scraperStatus.lastSyncAt)}
                  </span>
                )}
                {scraperStatus?.lastSyncResult && (
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium ${scraperStatus.lastSyncResult.success ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-red-500/10 text-red-600 dark:text-red-400"}`}>
                    {scraperStatus.lastSyncResult.success
                      ? `${scraperStatus.lastSyncResult.count} kartu · ${((scraperStatus.lastSyncResult.durationMs || 0) / 1000).toFixed(0)}s`
                      : `Error: ${scraperStatus.lastSyncResult.error}`}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══════════════ LOADING ═══════════════ */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
          {[...Array(4)].map((_, i) => <Card key={i} className="h-28" />)}
          <Card className="md:col-span-4 h-72" />
        </div>
      ) : (
        <>
          {/* ═══════════════ OVERVIEW DASHBOARD ═══════════════ */}
          {overview && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-card/50 backdrop-blur-sm border-primary/10 hover:border-primary/20 transition-colors">
                  <CardHeader className="pb-1.5">
                    <CardDescription className="text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5">
                      <Smartphone className="h-3.5 w-3.5 text-primary" /> Total Modem
                    </CardDescription>
                    <CardTitle className="text-2xl font-extrabold">{overview.summary.totalModem}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-[10px] text-muted-foreground">Perangkat modem 4G terdaftar</p>
                  </CardContent>
                </Card>

                <Card className="bg-card/50 backdrop-blur-sm border-primary/10 hover:border-primary/20 transition-colors">
                  <CardHeader className="pb-1.5">
                    <CardDescription className="text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5">
                      <Wifi className="h-3.5 w-3.5 text-blue-500" /> Total Penggunaan
                    </CardDescription>
                    <CardTitle className="text-2xl font-extrabold text-primary">{overview.summary.totalUsedGB} GB</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-[10px] text-muted-foreground">dari {overview.summary.totalAllocatedGB} GB alokasi ({overview.summary.totalAllocatedGB > 0 ? ((overview.summary.totalUsedGB / overview.summary.totalAllocatedGB) * 100).toFixed(1) : 0}%)</p>
                  </CardContent>
                </Card>

                <Card className="bg-card/50 backdrop-blur-sm border-red-500/10 hover:border-red-500/20 transition-colors">
                  <CardHeader className="pb-1.5">
                    <CardDescription className="text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-500" /> Kritis
                    </CardDescription>
                    <CardTitle className={`text-2xl font-extrabold ${overview.summary.criticalCount > 0 ? "text-red-500" : "text-emerald-500"}`}>
                      {overview.summary.criticalCount}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-[10px] text-muted-foreground">Modem &gt;= 90% kuota terpakai</p>
                  </CardContent>
                </Card>

                <Card className="bg-card/50 backdrop-blur-sm border-emerald-500/10 hover:border-emerald-500/20 transition-colors">
                  <CardHeader className="pb-1.5">
                    <CardDescription className="text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-emerald-500" /> Aman
                    </CardDescription>
                    <CardTitle className="text-2xl font-extrabold text-emerald-500">{overview.summary.safeCount}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-[10px] text-muted-foreground">Modem &lt; 70% kuota terpakai</p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Monthly Trend */}
                <Card className="border-border/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      Tren Penggunaan Bulanan
                    </CardTitle>
                    <CardDescription className="text-xs">Akumulasi penggunaan data per periode</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-52 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={overview.monthlyTrend} margin={{ top: 5, right: 15, left: -15, bottom: 0 }}>
                          <defs>
                            <linearGradient id="gradTrend" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(220, 90%, 56%)" stopOpacity={0.25} />
                              <stop offset="95%" stopColor="hsl(220, 90%, 56%)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                          <XAxis dataKey="periode" tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                          <YAxis tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} unit=" GB" />
                          <ChartTooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--popover))",
                              borderColor: "hsl(var(--border))",
                              borderRadius: "8px",
                              fontSize: 11
                            }}
                            formatter={(value: number) => [`${value.toFixed(1)} GB`, "Total Penggunaan"]}
                          />
                          <Area type="monotone" dataKey="totalUsed" name="Digunakan" stroke="hsl(220, 90%, 56%)" strokeWidth={2.5} fillOpacity={1} fill="url(#gradTrend)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Per-Group Breakdown */}
                <Card className="border-border/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-primary" />
                      Penggunaan per Tol/Grup
                    </CardTitle>
                    <CardDescription className="text-xs">Breakdown konsumsi per grup</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-52 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={overview.perGrup.slice(0, 8)} layout="vertical" margin={{ top: 0, right: 15, left: 5, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.06)" />
                          <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} unit=" GB" />
                          <YAxis dataKey="grup" type="category" tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }} width={90} />
                          <ChartTooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--popover))",
                              borderColor: "hsl(var(--border))",
                              borderRadius: "8px",
                              fontSize: 11
                            }}
                            formatter={(value: number) => [`${value.toFixed(1)} GB`, "Penggunaan"]}
                          />
                          <Bar dataKey="totalUsed" radius={[0, 4, 4, 0]} barSize={16}>
                            {overview.perGrup.slice(0, 8).map((_, idx) => (
                              <Cell key={idx} fill={GRUP_COLORS[idx % GRUP_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Top 10 Modem */}
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-red-500" />
                    Top 10 Modem Penggunaan Tertinggi
                  </CardTitle>
                  <CardDescription className="text-xs">Modem dengan konsumsi data terbesar periode ini</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {overview.top10.map((item, idx) => (
                      <div
                        key={item.msisdn}
                        className="group p-3 rounded-xl border border-border/60 bg-background/40 hover:bg-accent/30 cursor-pointer transition-all duration-200 hover:shadow-md"
                        onClick={() => setDetailMsisdn(item.msisdn)}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${idx < 3 ? "bg-red-500/10 text-red-500" : "bg-muted text-muted-foreground"}`}>
                            #{idx + 1}
                          </span>
                          <span className={`text-[10px] font-bold ${item.percent >= 90 ? "text-red-500" : item.percent >= 70 ? "text-amber-500" : "text-emerald-500"}`}>
                            {item.percent.toFixed(0)}%
                          </span>
                        </div>
                        <p className="text-xs font-bold mt-1.5 text-foreground truncate">{item.msisdn}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{item.lokasi}</p>
                        <div className="mt-2">
                          <Progress
                            value={item.percent}
                            className={`h-1.5 bg-muted ${item.percent >= 90 ? "[&>div]:bg-red-500" : item.percent >= 70 ? "[&>div]:bg-amber-500" : "[&>div]:bg-emerald-500"}`}
                          />
                          <p className="text-[10px] font-semibold text-foreground mt-1">{item.used.toFixed(1)} / {item.total} GB</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* ═══════════════ FILTER PANEL ═══════════════ */}
          <Card className="border-border/60 bg-muted/20">
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 w-full">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Cari MSISDN, Lokasi..." className="pl-9 bg-background" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Semua Site" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Site</SelectItem>
                    {sites.map(site => (<SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>))}
                  </SelectContent>
                </Select>
                <Select value={selectedGrup} onValueChange={setSelectedGrup}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Semua Tol/Grup" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Tol/Grup</SelectItem>
                    {groupsList.map(g => (<SelectItem key={g} value={g}>{g}</SelectItem>))}
                  </SelectContent>
                </Select>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Pilih Periode" /></SelectTrigger>
                  <SelectContent>
                    {["Juni 2026", "Mei 2026", "April 2026"].map(m => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={handleExportCSV} className="gap-1.5 h-10 text-xs border-border/60 hover:bg-muted/60">
                  <Download className="h-3.5 w-3.5" />
                  Ekspor CSV
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/40">
                <span className="text-xs font-semibold text-muted-foreground mr-1 uppercase tracking-wider">FILTER STATUS:</span>
                {([
                  { key: "ALL" as const, label: "Semua", count: totalCount, color: "primary" },
                  { key: "CRITICAL" as const, label: "Perlu Pengisian", count: criticalCount, color: "red" },
                  { key: "WARNING" as const, label: "Waspada", count: warningCount, color: "amber" },
                  { key: "SAFE" as const, label: "Aman", count: safeCount, color: "emerald" },
                ]).map(btn => (
                  <Button
                    key={btn.key}
                    size="sm"
                    variant={statusFilter === btn.key ? "default" : "outline"}
                    onClick={() => setStatusFilter(btn.key)}
                    className={`h-8 rounded-full text-xs font-medium px-3.5 ${
                      statusFilter === btn.key
                        ? btn.color === "primary"
                          ? "bg-primary text-primary-foreground border-transparent shadow-sm"
                          : btn.color === "red"
                          ? "bg-red-500 text-white border-transparent shadow-sm hover:bg-red-600"
                          : btn.color === "amber"
                          ? "bg-amber-500 text-white border-transparent shadow-sm hover:bg-amber-600"
                          : "bg-emerald-500 text-white border-transparent shadow-sm hover:bg-emerald-600"
                        : `border-border/60 text-${btn.color === "primary" ? "foreground" : `${btn.color}-500`} hover:bg-${btn.color === "primary" ? "muted" : `${btn.color}-500`}/10`
                    }`}
                  >
                    {btn.label} ({btn.count})
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ═══════════════ TABLE — Full Width ═══════════════ */}
          <Card className="border-border">
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base font-semibold">Daftar Modem 4G Traffic Counting</CardTitle>
                <CardDescription className="text-xs">
                  Menampilkan {filteredData.length} dari {data.length} perangkat · Klik baris untuk detail
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border border-border rounded-lg overflow-hidden bg-background/30">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="w-12 text-center text-xs">NO</TableHead>
                      <TableHead className="text-xs cursor-pointer select-none" onClick={() => requestSort("msisdn")}>
                        MSISDN <SortIcon columnKey="msisdn" />
                      </TableHead>
                      <TableHead className="text-xs cursor-pointer select-none" onClick={() => requestSort("lokasi")}>
                        LOKASI <SortIcon columnKey="lokasi" />
                      </TableHead>
                      <TableHead className="text-xs cursor-pointer select-none" onClick={() => requestSort("grup")}>
                        TOL/GRUP <SortIcon columnKey="grup" />
                      </TableHead>
                      <TableHead className="text-xs w-32 text-right cursor-pointer select-none" onClick={() => requestSort("kuotaPercent")}>
                        PENGGUNAAN <SortIcon columnKey="kuotaPercent" />
                      </TableHead>
                      <TableHead className="text-xs w-28 text-center">STATUS</TableHead>
                      <TableHead className="text-xs w-20 text-center">DETAIL</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-xs">
                          Tidak ada data modem ditemukan dengan filter ini.
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedData.map((item, idx) => (
                        <TableRow
                          key={item.msisdn}
                          className="cursor-pointer hover:bg-accent/40 transition-colors"
                          onClick={() => setDetailMsisdn(item.msisdn)}
                        >
                          <TableCell className="text-center font-medium text-xs text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell className="font-semibold text-xs tracking-wide font-mono">{item.msisdn}</TableCell>
                          <TableCell className="text-xs">
                            <div className="font-medium text-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              <span className="truncate max-w-[200px]">{item.lokasi}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="flex gap-1.5 flex-wrap">
                              {item.grup && (
                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-primary/20 bg-primary/5 text-primary">
                                  {item.grup}
                                </Badge>
                              )}
                              {item.site && item.site !== item.grup && (
                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-muted-foreground/20 bg-muted text-muted-foreground">
                                  {item.site}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right pr-4">
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-xs font-bold">{item.kuota_digunakan}</span>
                              <div className="flex items-center gap-2 w-full max-w-[110px]">
                                <Progress
                                  value={item.kuotaPercent}
                                  className={`h-1.5 w-full bg-muted flex-grow ${
                                    item.kuotaPercent >= 90 ? "[&>div]:bg-red-500" :
                                    item.kuotaPercent >= 70 ? "[&>div]:bg-amber-500" : "[&>div]:bg-emerald-500"
                                  }`}
                                />
                                <span className="text-[9px] font-semibold text-muted-foreground w-6 text-right">{item.kuotaPercent.toFixed(0)}%</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {item.kuotaPercent >= 90 ? (
                              <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5 animate-pulse" />
                                Perlu Isi
                              </span>
                            ) : item.kuotaPercent >= 70 ? (
                              <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5" />
                                Waspada
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
                                Aman
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={(e) => { e.stopPropagation(); setDetailMsisdn(item.msisdn); }}
                            >
                              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* ═══════════════ DETAIL DIALOG ═══════════════ */}
          <Dialog open={!!detailMsisdn} onOpenChange={(open) => { if (!open) setDetailMsisdn(null); }}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              {selectedSim && (() => {
                const dataQuota = parseQuota(selectedSim.kuota_digunakan);
                const voiceQuota = parseVoice(selectedSim.voice_digunakan);
                const smsQuota = parseSms(selectedSim.sms_digunakan);
                const currentDay = Math.max(1, new Date().getDate());
                const dailyAverage = dataQuota.used / currentDay;
                const sisaQuotaGB = Math.max(0, dataQuota.total - dataQuota.used);
                const estimasiHariSisa = dailyAverage > 0 ? Math.floor(sisaQuotaGB / dailyAverage) : 99;

                return (
                  <>
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-lg">
                        <Smartphone className="h-5 w-5 text-primary" />
                        {selectedSim.msisdn}
                      </DialogTitle>
                      <DialogDescription>
                        {selectedSim.lokasi} · {selectedSim.grup || "Default"}{selectedSim.site && selectedSim.site !== selectedSim.grup ? ` · Site: ${selectedSim.site}` : ""}
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5 mt-2">
                      {/* Audit Status */}
                      <div className={`p-4 rounded-xl border flex gap-3 ${
                        selectedSim.kuotaPercent >= 90
                          ? "bg-red-500/5 border-red-500/20 text-red-700 dark:text-red-400"
                          : selectedSim.kuotaPercent >= 70
                          ? "bg-amber-500/5 border-amber-500/20 text-amber-700 dark:text-amber-400"
                          : "bg-emerald-500/5 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                      }`}>
                        <div className="mt-0.5">
                          {selectedSim.kuotaPercent >= 90 ? <AlertTriangle className="h-5 w-5 text-red-500" /> :
                           selectedSim.kuotaPercent >= 70 ? <AlertTriangle className="h-5 w-5 text-amber-500" /> :
                           <Info className="h-5 w-5 text-emerald-500" />}
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs font-bold uppercase tracking-wider">
                            Status Audit: {selectedSim.kuotaPercent >= 90 ? "Kritis / Perlu Pengisian" : selectedSim.kuotaPercent >= 70 ? "Waspada (Mendekati Batas)" : "Aman / Normal"}
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {selectedSim.kuotaPercent >= 90
                              ? "Kuota modem telah mencapai batas kritis (>= 90%). Segera isi ulang agar telemetry traffic counting tidak terputus."
                              : selectedSim.kuotaPercent >= 70
                              ? "Kuota berada di rentang waspada (70% - 90%). Harap pantau secara berkala."
                              : "Kuota modem masih dalam batas aman (< 70%). Telemetry berjalan lancar."}
                          </p>
                          {selectedSim.scrapedAt && (
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                              <Calendar className="h-3 w-3" />
                              Update: {new Date(selectedSim.scrapedAt).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Projections */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-1">
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Rata-rata / Hari</span>
                          <div className="text-sm font-extrabold text-foreground">
                            {dailyAverage < 0.001 ? "0 MB" : dailyAverage >= 1 ? `${dailyAverage.toFixed(2)} GB` : `${(dailyAverage * 1000).toFixed(0)} MB`}
                          </div>
                        </div>
                        <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-1">
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Estimasi Kuota Habis</span>
                          <div className={`text-sm font-extrabold ${estimasiHariSisa <= 5 ? "text-red-500" : estimasiHariSisa <= 10 ? "text-amber-500" : "text-emerald-500"}`}>
                            {estimasiHariSisa > 30 ? "Aman (>30 hari)" : `${estimasiHariSisa} Hari Lagi`}
                          </div>
                        </div>
                      </div>

                      {/* Data Quota */}
                      <div className="space-y-3 p-4 rounded-xl border border-border/80 bg-muted/10">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold flex items-center gap-1.5">
                            <Wifi className="h-4 w-4 text-primary" /> Kuota Data
                          </span>
                          <Badge className={`${selectedSim.kuotaPercent >= 90 ? "bg-red-500/10 text-red-600 border-none" : "bg-primary/10 text-primary border-none"} text-[10px] font-bold`}>
                            {(100 - selectedSim.kuotaPercent).toFixed(0)}% tersisa
                          </Badge>
                        </div>
                        <div className="text-xl font-extrabold text-foreground">{dataQuota.used.toFixed(1)} / {dataQuota.total} GB</div>
                        <div className="space-y-1">
                          <Progress
                            value={selectedSim.kuotaPercent}
                            className={`h-2.5 bg-muted ${selectedSim.kuotaPercent >= 90 ? "[&>div]:bg-red-500" : selectedSim.kuotaPercent >= 70 ? "[&>div]:bg-amber-500" : "[&>div]:bg-emerald-500"}`}
                          />
                          <div className="flex justify-between text-[9px] font-semibold text-muted-foreground px-0.5">
                            <span>Aman (&lt;70%)</span>
                            <span>Waspada (70%)</span>
                            <span>Kritis (90%)</span>
                          </div>
                        </div>
                        <div className="text-[10px] text-muted-foreground">Sisa: <span className="font-bold text-foreground">{selectedSim.sisa_kuota}</span></div>
                      </div>

                      {/* Historical Trend */}
                      <div className="space-y-2 p-4 rounded-xl border border-border/80 bg-muted/10">
                        <span className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                          <TrendingUp className="h-4 w-4 text-primary" />
                          Tren Penggunaan Kuota
                        </span>
                        {loadingHistory ? (
                          <div className="h-36 flex items-center justify-center text-xs text-muted-foreground">Memuat tren...</div>
                        ) : historyData.length === 0 ? (
                          <div className="h-20 flex items-center justify-center text-xs text-muted-foreground">Belum ada data historis</div>
                        ) : (
                          <div className="h-40 w-full pt-2">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={historyData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                <defs>
                                  <linearGradient id="colorKuotaDetail" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="periode" tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }} />
                                <YAxis tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }} unit=" GB" />
                                <ChartTooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", borderColor: "hsl(var(--border))", borderRadius: "8px", fontSize: 11 }} />
                                <Area type="monotone" dataKey="kuotaUsed" name="Digunakan" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorKuotaDetail)" />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </div>

                      {/* Voice & SMS */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2 p-3.5 rounded-xl border border-border/80 bg-muted/10">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold flex items-center gap-1.5">
                              <Phone className="h-3.5 w-3.5 text-emerald-500" /> Telepon
                            </span>
                            <span className="text-[9px] font-bold text-emerald-500">{(100 - voiceQuota.percent).toFixed(0)}%</span>
                          </div>
                          <div className="text-base font-extrabold">{voiceQuota.used} / {voiceQuota.total} Min</div>
                          <Progress value={voiceQuota.percent} className="h-1.5 bg-muted [&>div]:bg-emerald-500" />
                        </div>
                        <div className="space-y-2 p-3.5 rounded-xl border border-border/80 bg-muted/10">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold flex items-center gap-1.5">
                              <MessageSquare className="h-3.5 w-3.5 text-amber-500" /> SMS
                            </span>
                            <span className="text-[9px] font-bold text-amber-500">{(100 - smsQuota.percent).toFixed(0)}%</span>
                          </div>
                          <div className="text-base font-extrabold">{smsQuota.used} / {smsQuota.total} SMS</div>
                          <Progress value={smsQuota.percent} className="h-1.5 bg-muted [&>div]:bg-amber-500" />
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
