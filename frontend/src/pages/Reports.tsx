import { useState, useEffect } from "react";
import { FileSpreadsheet, FileText, FileType, Loader2, Award, TrendingUp, DollarSign, BarChart2 } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell
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

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--info))", "hsl(var(--warning))", "hsl(var(--success))", "hsl(var(--destructive))", "hsl(var(--primary-glow))"];

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const currentYearStr = new Date().getFullYear().toString();
  const [selectedYear, setSelectedYear] = useState<string>(currentYearStr);
  const [availableYears, setAvailableYears] = useState<number[]>([new Date().getFullYear()]);
  const [data, setData] = useState<any>({ byCategory: [], byDept: [], bySite: [], byUser: [], topRequests: [], topSpenders: [] });

  const loadData = async (year = selectedYear, silent = false) => {
    try {
      if (!silent) setLoading(true);
      const filters: any = {};
      if (year !== "all") {
        filters.year = year;
      }
      const res = await apiClient.reports.getAggregates(filters);
      setData(res);
      if (res.years) {
        const yrs = Array.from(new Set([new Date().getFullYear(), ...res.years])).sort((a, b) => b - a);
        setAvailableYears(yrs);
      }
    } catch (err: any) {
      if (!silent) toast.error(err.message || "Gagal memuat data laporan");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData(currentYearStr);

    const interval = setInterval(() => {
      loadData(selectedYear, true);
    }, 15000);

    return () => clearInterval(interval);
  }, [selectedYear]);

  const handleExport = async (fmt: "excel" | "pdf" | "docx") => {
    try {
      toast.loading(`Mengekspor laporan ke ${fmt.toUpperCase()}...`, { id: "export-toast" });
      const token = localStorage.getItem("finflow:access_token") || "";
      let url = `/api/reports/export/${fmt}?token=${encodeURIComponent(token)}`;
      if (selectedYear !== "all") {
        url += `&year=${selectedYear}`;
      }
      window.location.href = url;
      toast.success(`Export ${fmt.toUpperCase()} berhasil. Log tercatat di Audit Trail.`, { id: "export-toast" });
    } catch (err: any) {
      toast.error(`Gagal mengekspor laporan: ${err.message || err}`, { id: "export-toast" });
    }
  };

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
          <p className="text-xs text-muted-foreground mt-0.5">Semua Transaksi Realisasi & Pengajuan Aktif</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => handleExport("excel")}><FileSpreadsheet className="h-4 w-4 mr-1.5 text-success" />Excel</Button>
          <Button size="sm" variant="outline" onClick={() => handleExport("pdf")}><FileType className="h-4 w-4 mr-1.5 text-destructive" />PDF</Button>
          <Button size="sm" variant="outline" onClick={() => handleExport("docx")}><FileText className="h-4 w-4 mr-1.5 text-info" />DOCX</Button>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 p-3 bg-muted/30 border border-border rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Tahun Laporan:</span>
          <Select value={selectedYear} onValueChange={(val) => {
            setSelectedYear(val);
            loadData(val);
          }}>
            <SelectTrigger className="w-[140px] h-8 text-xs bg-background">
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

      <Tabs defaultValue="executive">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="executive">Ringkasan Eksekutif</TabsTrigger>
          <TabsTrigger value="category">Kategori</TabsTrigger>
          <TabsTrigger value="dept">Departemen</TabsTrigger>
          <TabsTrigger value="site">Site</TabsTrigger>
          <TabsTrigger value="user">Pemohon</TabsTrigger>
        </TabsList>

        <TabsContent value="executive">
          <ExecutiveSummaryPanel data={data} />
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
          <ReportPanel data={data.byUser} title="Top Pemohon" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ExecutiveSummaryPanel({ data }: { data: any }) {
  const totalExpense = data.byCategory.reduce((acc: number, curr: any) => acc + curr.value, 0);
  const largestTx = data.topRequests && data.topRequests.length > 0 ? data.topRequests[0] : null;
  const topSpender = data.topSpenders && data.topSpenders.length > 0 ? data.topSpenders[0] : null;
  const topCategory = data.byCategory && data.byCategory.length > 0 
    ? [...data.byCategory].sort((a, b) => b.value - a.value)[0] 
    : null;

  const highlights = [
    { label: "Total Realisasi Pengeluaran", value: formatRupiah(totalExpense), desc: "Keseluruhan pengeluaran disetujui", icon: DollarSign, color: "primary" },
    { label: "Transaksi Terbesar", value: largestTx ? formatRupiah(largestTx.amount) : "Rp 0", desc: largestTx ? largestTx.title : "Tidak ada transaksi", icon: TrendingUp, color: "destructive" },
    { label: "Top Spender (Pemohon Terbanyak)", value: topSpender ? formatRupiah(topSpender.value) : "Rp 0", desc: topSpender ? `${topSpender.name} (${topSpender.count} pengajuan)` : "Tidak ada pemohon", icon: Award, color: "warning" },
    { label: "Kategori Terbesar", value: topCategory ? formatRupiah(topCategory.value) : "Rp 0", desc: topCategory ? topCategory.name : "Tidak ada kategori", icon: BarChart2, color: "success" }
  ];

  const colorMap: Record<string, string> = {
    primary: "bg-primary/10 text-primary border-primary/20",
    destructive: "bg-destructive/10 text-destructive border-destructive/20",
    warning: "bg-warning/10 text-warning border-warning/20",
    success: "bg-success/10 text-success border-success/20",
  };

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
                  const pct = totalExpense > 0 ? ((s.value / totalExpense) * 100).toFixed(1) : "0.0";
                  return (
                    <div key={s.name || idx} className="flex items-center justify-between p-3.5 hover:bg-muted/20">
                      <div className="flex items-center gap-3 min-w-0 pr-3">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                          {idx + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-xs text-foreground truncate">{s.name}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            Frekuensi pengajuan: {s.count} kali
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
