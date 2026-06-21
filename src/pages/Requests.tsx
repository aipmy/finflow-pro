import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Plus, Filter, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { formatRupiah, formatDate } from "@/utils/format";
import {
  requests, categories, departments, sites, users, type RequestStatus
} from "@/data/mockData";

const typeLabels: Record<string, string> = {
  PEMBELIAN: "Pembelian",
  PETTY_CASH: "Petty Cash",
  REIMBURSE: "Reimburse",
  PERJALANAN_DINAS: "Perjalanan Dinas",
  OPERASIONAL: "Operasional",
};

export default function Requests() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [cat, setCat] = useState<string>("all");
  const [dept, setDept] = useState<string>("all");

  const list = useMemo(() => requests.filter(r => {
    if (q && !`${r.title} ${r.code}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (status !== "all" && r.status !== status) return false;
    if (cat !== "all" && r.category !== cat) return false;
    if (dept !== "all" && r.department !== dept) return false;
    return true;
  }), [q, status, cat, dept]);

  const statuses: RequestStatus[] = ["DRAFT", "SUBMITTED", "NEED_REVISION", "APPROVED_BY_SUPERVISOR", "APPROVED_BY_FINANCE", "REJECTED", "PURCHASED", "REALIZED", "CLOSED"];

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Daftar Pengajuan</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{list.length} pengajuan ditemukan</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="hidden sm:flex"><Download className="h-4 w-4 mr-1.5" />Export</Button>
          <Button asChild size="sm" className="gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
            <Link to="/requests/new"><Plus className="h-4 w-4 mr-1.5" />Buat Pengajuan</Link>
          </Button>
        </div>
      </div>

      <Card className="shadow-elegant">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Cari kode atau judul..." className="pl-9" value={q} onChange={e => setQ(e.target.value)} />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                {statuses.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={cat} onValueChange={setCat}>
              <SelectTrigger><SelectValue placeholder="Kategori" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={dept} onValueChange={setDept}>
              <SelectTrigger><SelectValue placeholder="Departemen" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Dept</SelectItem>
                {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Desktop table */}
      <Card className="shadow-elegant hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left p-3 font-medium">Kode</th>
                <th className="text-left p-3 font-medium">Judul</th>
                <th className="text-left p-3 font-medium">Tipe</th>
                <th className="text-left p-3 font-medium">Pemohon</th>
                <th className="text-left p-3 font-medium">Site</th>
                <th className="text-right p-3 font-medium">Jumlah</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Tanggal</th>
              </tr>
            </thead>
            <tbody>
              {list.map(r => {
                const u = users.find(x => x.id === r.requesterId);
                const s = sites.find(x => x.id === r.site);
                return (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-3"><Link to={`/requests/${r.id}`} className="font-mono text-xs text-primary hover:underline">{r.code}</Link></td>
                    <td className="p-3 font-medium max-w-xs truncate">{r.title}</td>
                    <td className="p-3 text-xs text-muted-foreground">{typeLabels[r.type]}</td>
                    <td className="p-3 text-xs">{u?.name}</td>
                    <td className="p-3 text-xs">{s?.name}</td>
                    <td className="p-3 text-right font-semibold">{formatRupiah(r.amount)}</td>
                    <td className="p-3"><StatusBadge status={r.status} /></td>
                    <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">{formatDate(r.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {list.length === 0 && <div className="p-12 text-center text-sm text-muted-foreground">Tidak ada pengajuan ditemukan</div>}
        </div>
      </Card>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {list.map(r => {
          const u = users.find(x => x.id === r.requesterId);
          return (
            <Link key={r.id} to={`/requests/${r.id}`} className="block">
              <Card className="shadow-sm">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[10px] font-mono text-muted-foreground">{r.code}</span>
                    <StatusBadge status={r.status} />
                  </div>
                  <div className="font-medium text-sm mb-1 line-clamp-2">{r.title}</div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                    <div className="text-[11px] text-muted-foreground">{u?.name} • {formatDate(r.createdAt)}</div>
                    <div className="text-sm font-semibold">{formatRupiah(r.amount)}</div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
