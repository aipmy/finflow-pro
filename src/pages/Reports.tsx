import { useState } from "react";
import { FileSpreadsheet, FileText, FileType, Download } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatRupiah } from "@/utils/format";
import { requests, categories, departments, sites, users } from "@/data/mockData";
import { toast } from "sonner";

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--info))", "hsl(var(--warning))", "hsl(var(--success))", "hsl(var(--destructive))", "hsl(var(--primary-glow))"];

export default function Reports() {
  const sumBy = (pred: (r: typeof requests[0]) => boolean) =>
    requests.filter(pred).reduce((a, b) => a + b.amount, 0);

  const byCategory = categories.map(c => ({ name: c.name, value: sumBy(r => r.category === c.id) })).filter(x => x.value > 0);
  const byDept = departments.map(d => ({ name: d.name, value: sumBy(r => r.department === d.id) })).filter(x => x.value > 0);
  const bySite = sites.map(s => ({ name: s.name.replace("Site ", ""), value: sumBy(r => r.site === s.id) })).filter(x => x.value > 0);
  const byUser = users.map(u => ({ name: u.name, value: sumBy(r => r.requesterId === u.id) })).filter(x => x.value > 0).sort((a, b) => b.value - a.value);

  const handleExport = (fmt: string) => toast.success(`Export ${fmt} berhasil. Log tercatat di Audit Trail.`);

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Laporan</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Periode: Februari 2026</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => handleExport("Excel")}><FileSpreadsheet className="h-4 w-4 mr-1.5 text-success" />Excel</Button>
          <Button size="sm" variant="outline" onClick={() => handleExport("PDF")}><FileType className="h-4 w-4 mr-1.5 text-destructive" />PDF</Button>
          <Button size="sm" variant="outline" onClick={() => handleExport("DOCX")}><FileText className="h-4 w-4 mr-1.5 text-info" />DOCX</Button>
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
          <ReportPanel data={byCategory} title="Pengeluaran per Kategori" />
        </TabsContent>
        <TabsContent value="dept">
          <ReportPanel data={byDept} title="Pengeluaran per Departemen" />
        </TabsContent>
        <TabsContent value="site">
          <ReportPanel data={bySite} title="Pengeluaran per Site" />
        </TabsContent>
        <TabsContent value="user">
          <ReportPanel data={byUser} title="Top Pemohon" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ReportPanel({ data, title }: { data: { name: string; value: number }[]; title: string }) {
  const total = data.reduce((a, b) => a + b.value, 0);
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
              <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => formatRupiah(v)} />
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
              <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => formatRupiah(v)} />
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
                  <span className="text-muted-foreground font-mono text-[10px]">{Math.round(c.value / total * 100)}%</span>
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
