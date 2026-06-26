import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Plus, Download, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { formatRupiah, formatDate } from "@/utils/format";
import { apiClient } from "@/services/apiClient";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const typeLabels: Record<string, string> = {
  PEMBELIAN: "Pembelian",
  PETTY_CASH: "Petty Cash",
  REIMBURSE: "Reimburse",
  PERJALANAN_DINAS: "Perjalanan Dinas",
  OPERASIONAL: "Operasional",
  TOP_UP_PETTY_CASH: "Top Up Petty Cash",
};

export default function Requests() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [cat, setCat] = useState<string>("all");
  const [dept, setDept] = useState<string>("all");

  const [requests, setRequests] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Sorting states
  const [sortBy, setSortBy] = useState<"title" | "createdAt">("title");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    async function loadData(silent = false) {
      try {
        if (!silent) setLoading(true);
        const [reqs, cats, depts, sts] = await Promise.all([
          apiClient.requests.list(),
          apiClient.meta.categories(),
          apiClient.meta.departments(),
          apiClient.meta.sites()
        ]);
        setRequests(reqs);
        setCategories(cats);
        setDepartments(depts);
        setSites(sts);
      } catch (err: any) {
        if (!silent) toast.error("Gagal memuat data dari server: " + err.message);
      } finally {
        if (!silent) setLoading(false);
      }
    }
    loadData();

    const interval = setInterval(() => {
      loadData(true);
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const list = useMemo(() => {
    const filtered = requests.filter(r => {
      if (q && !`${r.title} ${r.code}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (status !== "all" && r.status !== status) return false;
      if (cat !== "all" && r.categoryId !== cat) return false;
      if (dept !== "all" && r.departmentId !== dept) return false;
      return true;
    });

    return filtered.sort((a, b) => {
      if (sortBy === "title") {
        const valA = a.title.toLowerCase();
        const valB = b.title.toLowerCase();
        return sortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else {
        const valA = new Date(a.createdAt).getTime();
        const valB = new Date(b.createdAt).getTime();
        return sortOrder === "asc" ? valA - valB : valB - valA;
      }
    });
  }, [requests, q, status, cat, dept, sortBy, sortOrder]);

  const activeList = useMemo(() => {
    return list.filter(r => r.status !== "CLOSED" && r.status !== "REJECTED");
  }, [list]);

  const historyList = useMemo(() => {
    return list.filter(r => r.status === "CLOSED" || r.status === "REJECTED");
  }, [list]);

  const statuses = ["DRAFT", "SUBMITTED", "NEED_REVISION", "APPROVED_BY_SUPERVISOR", "APPROVED_BY_FINANCE", "REJECTED", "PURCHASED", "REALIZED", "CLOSED"];

  const handleHeaderClick = (field: "title" | "createdAt") => {
    if (sortBy === field) {
      setSortOrder(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const renderTable = (items: any[], emptyLabel: string) => {
    return (
      <Card className="shadow-elegant hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left p-3 font-medium">Kode</th>
                <th className="text-left p-3 font-medium cursor-pointer hover:bg-muted/80 select-none transition-colors" onClick={() => handleHeaderClick("title")}>
                  <div className="flex items-center gap-1.5">
                    Judul
                    <ArrowUpDown className={`h-3 w-3 ${sortBy === "title" ? "text-primary" : "text-muted-foreground/50"}`} />
                  </div>
                </th>
                <th className="text-left p-3 font-medium">Tipe</th>
                <th className="text-left p-3 font-medium">Pemohon</th>
                <th className="text-left p-3 font-medium">Site</th>
                <th className="text-right p-3 font-medium">Jumlah</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium cursor-pointer hover:bg-muted/80 select-none transition-colors" onClick={() => handleHeaderClick("createdAt")}>
                  <div className="flex items-center gap-1.5">
                    Tanggal
                    <ArrowUpDown className={`h-3 w-3 ${sortBy === "createdAt" ? "text-primary" : "text-muted-foreground/50"}`} />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map(r => {
                const u = r.requester;
                const s = r.site;
                return (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-3"><Link to={`/requests/${r.id}`} className="font-mono text-xs text-primary hover:underline">{r.code}</Link></td>
                    <td className="p-3 font-medium max-w-xs truncate">
                      <Link to={`/requests/${r.id}`} className="hover:text-primary transition-colors">
                        {r.title}
                      </Link>
                    </td>
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
          {items.length === 0 && <div className="p-12 text-center text-sm text-muted-foreground">{emptyLabel}</div>}
        </div>
      </Card>
    );
  };

  const renderMobileCards = (items: any[], emptyLabel: string) => {
    return (
      <div className="md:hidden space-y-2">
        {items.map(r => {
          const u = r.requester;
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
        {items.length === 0 && <div className="p-12 text-center text-sm text-muted-foreground">{emptyLabel}</div>}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-2">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">Memuat data pengajuan...</p>
      </div>
    );
  }

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
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
            <Select value={`${sortBy}-${sortOrder}`} onValueChange={val => {
              const [field, order] = val.split("-");
              setSortBy(field as any);
              setSortOrder(order as any);
            }}>
              <SelectTrigger><SelectValue placeholder="Urutkan" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="title-asc">Judul (A-Z)</SelectItem>
                <SelectItem value="title-desc">Judul (Z-A)</SelectItem>
                <SelectItem value="createdAt-desc">Tanggal (Terbaru)</SelectItem>
                <SelectItem value="createdAt-asc">Tanggal (Terlama)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="queue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="queue" className="relative">
            Antrian Pengajuan
            {activeList.length > 0 && (
              <span className="ml-2 bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {activeList.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">
            Riwayat Pengajuan
            {historyList.length > 0 && (
              <span className="ml-2 bg-muted text-muted-foreground text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {historyList.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-4 outline-none">
          {renderTable(activeList, "Tidak ada pengajuan aktif dalam antrian")}
          {renderMobileCards(activeList, "Tidak ada pengajuan aktif dalam antrian")}
        </TabsContent>

        <TabsContent value="history" className="space-y-4 outline-none">
          {renderTable(historyList, "Tidak ada riwayat pengajuan")}
          {renderMobileCards(historyList, "Tidak ada riwayat pengajuan")}
        </TabsContent>
      </Tabs>
    </div>
  );
}
