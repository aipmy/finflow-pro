import { useState, useEffect } from "react";
import { FileSpreadsheet, FileText, FileType, Loader2 } from "lucide-react";
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
  const [data, setData] = useState<{
    byCategory: { name: string; value: number }[];
    byDept: { name: string; value: number }[];
    bySite: { name: string; value: number }[];
    byUser: { name: string; value: number }[];
  }>({ byCategory: [], byDept: [], bySite: [], byUser: [] });

  const loadData = async (year = selectedYear) => {
    try {
      setLoading(true);
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
      toast.error(err.message || "Gagal memuat data laporan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(currentYearStr);
  }, []);

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

      <Tabs defaultValue="category">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="category">Kategori</TabsTrigger>
          <TabsTrigger value="dept">Departemen</TabsTrigger>
          <TabsTrigger value="site">Site</TabsTrigger>
          <TabsTrigger value="user">Pemohon</TabsTrigger>
        </TabsList>

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
