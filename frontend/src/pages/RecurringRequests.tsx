import { useEffect, useState, useMemo } from "react";
import { 
  Plus, Search, RefreshCw, Edit2, Trash2, Calendar, 
  Layers, MapPin, Building, Play, Loader2, Info, ArrowLeft, Trash
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/services/apiClient";
import { toast } from "sonner";
import { formatRupiah } from "@/utils/format";
import { useAuth } from "@/stores/authStore";

const typeLabels: Record<string, string> = {
  PEMBELIAN: "Pembelian",
  PETTY_CASH: "Petty Cash",
  REIMBURSE: "Reimburse",
  PERJALANAN_DINAS: "Perjalanan Dinas",
  OPERASIONAL: "Operasional",
  TOP_UP_PETTY_CASH: "Top Up Petty Cash",
};

interface RecurringRequestItemInput {
  name: string;
  qty: number;
  unit: string;
  price: number;
}

const dayOfWeekLabels: Record<number, string> = {
  1: "Senin",
  2: "Selasa",
  3: "Rabu",
  4: "Kamis",
  5: "Jumat",
  6: "Sabtu",
  7: "Minggu"
};

export default function RecurringRequests() {
  const { user } = useAuth();
  
  // Lists
  const [templates, setTemplates] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  
  // State
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [triggering, setTriggering] = useState(false);
  
  // Dialog State
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("OPERASIONAL");
  const [frequency, setFrequency] = useState("MONTHLY"); // MONTHLY, WEEKLY
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [dayOfWeek, setDayOfWeek] = useState<number>(1);
  const [autoSubmit, setAutoSubmit] = useState(false);
  const [active, setActive] = useState(true);
  const [deptId, setDeptId] = useState<string>("");
  const [siteId, setSiteId] = useState<string>("");
  const [items, setItems] = useState<RecurringRequestItemInput[]>([
    { name: "", qty: 1, unit: "Pcs", price: 0 }
  ]);

  // Load Data
  const loadData = async () => {
    try {
      setLoading(true);
      const [data, cats, depts, sts, uns] = await Promise.all([
        apiClient.recurringRequests.list(),
        apiClient.meta.categories(),
        apiClient.meta.departments(),
        apiClient.meta.sites(),
        apiClient.meta.units()
      ]);
      setTemplates(data);
      setCategories(cats);
      setDepartments(depts);
      setSites(sts);
      setUnits(uns);
    } catch (err: any) {
      toast.error("Gagal memuat data: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesType = typeFilter === "all" || t.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [templates, searchQuery, typeFilter]);

  // Total amount calculated from items
  const totalAmount = useMemo(() => {
    return items.reduce((acc, item) => acc + (item.qty * item.price), 0);
  }, [items]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setType("OPERASIONAL");
    setFrequency("MONTHLY");
    setDayOfMonth(1);
    setDayOfWeek(1);
    setAutoSubmit(false);
    setActive(true);
    setDeptId(user?.departmentId || (departments[0]?.id || ""));
    setSiteId(user?.siteId || (sites[0]?.id || ""));
    
    const defaultUnit = units.length > 0 ? units[0].name : "Pcs";
    setItems([{ name: "", qty: 1, unit: defaultUnit, price: 0 }]);
    setIsOpen(true);
  };

  const handleOpenEdit = (template: any) => {
    setEditingId(template.id);
    setTitle(template.title);
    setDescription(template.description || "");
    setType(template.type);
    setFrequency(template.frequency || "MONTHLY");
    setDayOfMonth(template.dayOfMonth || 1);
    setDayOfWeek(template.dayOfWeek || 1);
    setAutoSubmit(template.autoSubmit || false);
    setActive(template.active);
    setDeptId(template.departmentId || "");
    setSiteId(template.siteId || "");
    
    if (template.items && template.items.length > 0) {
      setItems(template.items.map((it: any) => ({
        name: it.name,
        qty: it.qty,
        unit: it.unit,
        price: Number(it.price)
      })));
    } else {
      const defaultUnit = units.length > 0 ? units[0].name : "Pcs";
      setItems([{ name: "", qty: 1, unit: defaultUnit, price: 0 }]);
    }
    setIsOpen(true);
  };

  const handleAddItem = () => {
    const defaultUnit = units.length > 0 ? units[0].name : "Pcs";
    setItems([...items, { name: "", qty: 1, unit: defaultUnit, price: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      toast.warning("Pengajuan minimal harus memiliki 1 item");
      return;
    }
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: keyof RecurringRequestItemInput, value: any) => {
    setItems(items.map((item, idx) => idx === index ? { ...item, [field]: value } : item));
  };

  const handlePriceChange = (index: number, rawVal: string) => {
    const cleanVal = rawVal.replace(/[^0-9]/g, "");
    const numericVal = parseInt(cleanVal, 10) || 0;
    handleItemChange(index, "price", numericVal);
  };

  const formatPriceInput = (val: number) => {
    if (!val) return "";
    return new Intl.NumberFormat("id-ID").format(val);
  };

  // Toggle active status directly
  const handleToggleActive = async (template: any) => {
    const updatedStatus = !template.active;
    try {
      await apiClient.recurringRequests.update(template.id, {
        active: updatedStatus
      });
      setTemplates(templates.map((t) => t.id === template.id ? { ...t, active: updatedStatus } : t));
      toast.success(`Pengajuan "${template.title}" berhasil ${updatedStatus ? "diaktifkan" : "dinonaktifkan"}`);
    } catch (err: any) {
      toast.error("Gagal memperbarui status: " + (err.message || err));
    }
  };

  // Delete template
  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus template pengajuan rutin ini?")) return;
    try {
      await apiClient.recurringRequests.delete(id);
      setTemplates(templates.filter((t) => t.id !== id));
      toast.success("Template pengajuan rutin berhasil dihapus");
    } catch (err: any) {
      toast.error("Gagal menghapus template: " + (err.message || err));
    }
  };

  // Trigger test runner
  const handleTriggerScheduler = async () => {
    try {
      setTriggering(true);
      const res = await apiClient.recurringRequests.trigger();
      toast.success(`Scheduler berhasil dipicu secara manual! Generated ${res.generatedCount || 0} pengajuan baru.`);
      // Reload page data
      loadData();
    } catch (err: any) {
      toast.error("Gagal memicu scheduler: " + (err.message || err));
    } finally {
      setTriggering(false);
    }
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Judul pengajuan harus diisi");
      return;
    }
    
    // Validate items
    for (let i = 0; i < items.length; i++) {
      if (!items[i].name.trim()) {
        toast.error(`Nama item ke-${i + 1} tidak boleh kosong`);
        return;
      }
      if (items[i].qty <= 0) {
        toast.error(`Jumlah item ke-${i + 1} harus lebih dari 0`);
        return;
      }
      if (items[i].price <= 0) {
        toast.error(`Harga item ke-${i + 1} harus lebih dari 0`);
        return;
      }
    }

    try {
      setSubmitting(true);
      const payload = {
        title,
        description,
        type,
        amount: totalAmount,
        frequency,
        dayOfMonth: frequency === "MONTHLY" ? Number(dayOfMonth) : null,
        dayOfWeek: frequency === "WEEKLY" ? Number(dayOfWeek) : null,
        autoSubmit,
        active,
        departmentId: deptId || null,
        siteId: siteId || null,
        items
      };

      if (editingId) {
        await apiClient.recurringRequests.update(editingId, payload);
        toast.success("Template pengajuan rutin berhasil diperbarui");
      } else {
        await apiClient.recurringRequests.create(payload);
        toast.success("Template pengajuan rutin baru berhasil dibuat");
      }
      setIsOpen(false);
      loadData();
    } catch (err: any) {
      toast.error("Gagal menyimpan data: " + (err.message || err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && templates.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground animate-pulse">Memuat template pengajuan rutin...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/75 bg-clip-text">
            Pengajuan Rutin / Otomatis
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola template pengajuan mingguan/bulanan yang akan secara otomatis dibuat menjadi draf pengajuan.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <Button 
            variant="outline" 
            onClick={handleTriggerScheduler}
            disabled={triggering}
            className="border-dashed border-primary/40 hover:border-primary/80 transition-all duration-300"
          >
            {triggering ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4 text-emerald-500 fill-emerald-500/20" />
            )}
            Uji Coba Run
          </Button>

          <Button onClick={handleOpenCreate} className="gradient-primary text-primary-foreground shadow-sm">
            <Plus className="mr-2 h-4 w-4" />
            Template Baru
          </Button>
        </div>
      </div>

      {/* Info Card */}
      <div className="mb-6 bg-accent/40 border border-border/80 rounded-xl p-4 flex gap-3 text-xs leading-relaxed max-w-4xl">
        <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-foreground">Bagaimana cara kerjanya?</span>
          <p className="text-muted-foreground mt-1">
            Sistem scheduler otomatis berjalan setiap hari pada jam <b>00:01 WIB</b>. Sistem akan memeriksa semua template pengisian rutin yang **Aktif**. Jika hari/tanggal hari ini cocok dengan parameter <i>Frekuensi & Jadwal</i> yang Anda tentukan, sistem akan menduplikasikan isi template tersebut menjadi draf pengajuan di halaman utama Anda dan mengirimkan pemberitahuan.
          </p>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari berdasarkan judul atau deskripsi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-card"
          />
        </div>
        <div className="w-full sm:w-48">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="bg-card">
              <SelectValue placeholder="Semua Tipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tipe</SelectItem>
              {Object.entries(typeLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Template Grid */}
      {filteredTemplates.length === 0 ? (
        <Card className="border-dashed py-12 flex flex-col items-center justify-center text-center">
          <CardContent className="space-y-4">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
              <RefreshCw className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <h3 className="font-medium text-sm text-foreground">Tidak Ada Template Pengajuan Rutin</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                {searchQuery || typeFilter !== "all" 
                  ? "Tidak ada hasil pencarian yang cocok dengan filter aktif Anda."
                  : "Buat template pengajuan rutin pertama Anda untuk mengotomatiskan pengeluaran rutin."}
              </p>
            </div>
            {(!searchQuery && typeFilter === "all") && (
              <Button size="sm" onClick={handleOpenCreate} variant="outline">
                Buat Template Sekarang
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <Card 
              key={template.id} 
              className={`overflow-hidden transition-all duration-300 hover:shadow-md border-[1.5px] hover:border-primary/30 group relative flex flex-col ${
                template.active ? "bg-card border-border/80" : "bg-muted/40 border-muted opacity-80"
              }`}
            >
              {/* Header Gradient Accent depending on Active state */}
              <div className={`h-1.5 w-full transition-all duration-300 ${
                template.active 
                  ? "bg-gradient-to-r from-primary/80 to-primary" 
                  : "bg-muted-foreground/30"
              }`} />

              <CardHeader className="p-5 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Badge variant="secondary" className="mb-2 text-[10px] font-semibold py-0.5 tracking-wide">
                      {typeLabels[template.type] || template.type}
                    </Badge>
                    <CardTitle className="text-base font-semibold leading-snug line-clamp-2">
                      {template.title}
                    </CardTitle>
                  </div>
                  
                  {/* Premium 3D shadow Switch Container */}
                  <div className="flex items-center space-x-2 pt-1">
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={template.active} 
                        onChange={() => handleToggleActive(template)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-primary shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] peer-checked:shadow-[0_2px_6px_rgba(var(--primary),0.35)]"></div>
                    </label>
                  </div>
                </div>
                
                {template.description && (
                  <CardDescription className="text-xs line-clamp-2 mt-2 leading-relaxed">
                    {template.description}
                  </CardDescription>
                )}
              </CardHeader>

              {/* Body */}
              <CardContent className="p-5 pt-0 flex-1 flex flex-col justify-between space-y-4">
                {/* Meta details list */}
                <div className="space-y-2.5 pt-2 border-t border-border/40 text-xs">
                  <div className="flex items-center text-muted-foreground justify-between">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-primary/70" />
                      Jadwal Rutin:
                    </span>
                    <span className="font-semibold text-foreground bg-accent px-2 py-0.5 rounded text-[11px]">
                      {template.frequency === "WEEKLY"
                        ? `Setiap hari ${dayOfWeekLabels[template.dayOfWeek] || "Senin"}`
                        : `Tanggal ${template.dayOfMonth} setiap bulan`}
                    </span>
                  </div>

                  <div className="flex items-center text-muted-foreground justify-between">
                    <span className="flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-primary/70" />
                      Item Terkait:
                    </span>
                    <span className="font-medium text-foreground">
                      {template.items?.length || 0} item
                    </span>
                  </div>

                  <div className="flex items-center text-muted-foreground justify-between">
                    <span className="flex items-center gap-1.5">
                      <Play className="h-3.5 w-3.5 text-primary/70" />
                      Tindakan:
                    </span>
                    <span className={`font-semibold text-[11px] px-2 py-0.5 rounded ${
                      template.autoSubmit 
                        ? "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400 dark:bg-emerald-400/10" 
                        : "text-amber-600 bg-amber-500/10 dark:text-amber-400 dark:bg-amber-400/10"
                    }`}>
                      {template.autoSubmit ? "Langsung Diajukan" : "Simpan Draf"}
                    </span>
                  </div>

                  {/* Site & Dept */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {template.departmentId && (
                      <span className="flex items-center gap-1 text-[10px] bg-accent/60 text-muted-foreground px-2 py-0.5 rounded-full border border-border/40">
                        <Building className="h-2.5 w-2.5" />
                        {departments.find(d => d.id === template.departmentId)?.name || "Department"}
                      </span>
                    )}
                    {template.siteId && (
                      <span className="flex items-center gap-1 text-[10px] bg-accent/60 text-muted-foreground px-2 py-0.5 rounded-full border border-border/40">
                        <MapPin className="h-2.5 w-2.5" />
                        {sites.find(s => s.id === template.siteId)?.name || "Cawang"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Amount and Action Buttons */}
                <div className="pt-3 border-t border-border/40 flex items-center justify-between mt-auto">
                  <div>
                    <span className="text-[10px] text-muted-foreground block uppercase font-medium tracking-wider">Total Rutin</span>
                    <span className="text-base font-bold text-foreground">
                      {formatRupiah(Number(template.amount))}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleOpenEdit(template)}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent"
                      title="Edit template"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDelete(template.id)}
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      title="Hapus template"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Editor Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-card border border-border">
          <DialogHeader className="px-6 py-4 border-b border-border bg-accent/10">
            <DialogTitle className="text-lg font-bold tracking-tight">
              {editingId ? "Edit Template Pengajuan Rutin" : "Buat Template Pengajuan Rutin"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Tentukan parameter template otomatis dan item pengajuan bulanan/mingguan Anda.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Row 1: Title & Type */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-1.5">
                  <Label htmlFor="title" className="text-xs font-semibold">Judul Template Pengajuan <span className="text-destructive">*</span></Label>
                  <Input
                    id="title"
                    placeholder="Contoh: Pembayaran Internet Oxygen Bulanan Cawang"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="bg-background"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="type" className="text-xs font-semibold">Tipe Pengajuan</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Pilih Tipe" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(typeLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 2: Frequency & Specific Day Selection */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="space-y-1.5">
                  <Label htmlFor="frequency" className="text-xs font-semibold">Frekuensi Jadwal</Label>
                  <Select value={frequency} onValueChange={setFrequency}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Pilih Frekuensi" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MONTHLY">Bulanan (Tanggal)</SelectItem>
                      <SelectItem value="WEEKLY">Mingguan (Hari)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {frequency === "MONTHLY" ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="dayOfMonth" className="text-xs font-semibold">Setiap Tanggal Ke- <span className="text-destructive">*</span></Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="dayOfMonth"
                        type="number"
                        min={1}
                        max={31}
                        value={dayOfMonth}
                        onChange={(e) => setDayOfMonth(Math.max(1, Math.min(31, parseInt(e.target.value) || 1)))}
                        required
                        className="bg-background w-24"
                      />
                      <span className="text-xs text-muted-foreground font-medium">tiap bulan</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label htmlFor="dayOfWeek" className="text-xs font-semibold">Setiap Hari <span className="text-destructive">*</span></Label>
                    <Select value={String(dayOfWeek)} onValueChange={(v) => setDayOfWeek(Number(v))}>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Pilih Hari" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(dayOfWeekLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>Hari {label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="dept" className="text-xs font-semibold">Departemen</Label>
                  <Select value={deptId} onValueChange={setDeptId}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Pilih Departemen" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 3: Site & Action & Description */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                <div className="space-y-1.5">
                  <Label htmlFor="site" className="text-xs font-semibold">Lokasi/Site</Label>
                  <Select value={siteId} onValueChange={setSiteId}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Pilih Site" />
                    </SelectTrigger>
                    <SelectContent>
                      {sites.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="autoSubmit" className="text-xs font-semibold">Tindakan Otomatis</Label>
                  <Select value={autoSubmit ? "true" : "false"} onValueChange={(v) => setAutoSubmit(v === "true")}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Tindakan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="false">Simpan sebagai Draf</SelectItem>
                      <SelectItem value="true">Langsung Kirim (Ajukan)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1.5">
                  <Label htmlFor="description" className="text-xs font-semibold">Deskripsi / Catatan Tambahan</Label>
                  <Textarea
                    id="description"
                    placeholder="Berikan detail penjelasan pengeluaran rutin ini..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={1}
                    className="bg-background min-h-[38px] resize-none"
                  />
                </div>
              </div>

              {/* Items Section */}
              <div className="space-y-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Daftar Item Pengajuan</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Item pengeluaran beserta jumlah dan harganya</p>
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={handleAddItem}
                    className="h-8 border-primary/30 hover:bg-primary/5 text-primary text-xs"
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Tambah Item
                  </Button>
                </div>

                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <div 
                      key={idx} 
                      className="grid grid-cols-12 gap-3 items-start p-3 bg-muted/30 rounded-lg border border-border/60 relative group"
                    >
                      {/* Name */}
                      <div className="col-span-12 md:col-span-5 space-y-1">
                        <Label className="text-[10px] font-medium text-muted-foreground">Nama Item <span className="text-destructive">*</span></Label>
                        <Input
                          placeholder="Contoh: Internet Oxygen 100Mbps"
                          value={item.name}
                          onChange={(e) => handleItemChange(idx, "name", e.target.value)}
                          required
                          className="bg-background h-9 text-xs"
                        />
                      </div>

                      {/* Qty */}
                      <div className="col-span-4 md:col-span-2 space-y-1">
                        <Label className="text-[10px] font-medium text-muted-foreground">Jumlah <span className="text-destructive">*</span></Label>
                        <Input
                          type="number"
                          min={1}
                          value={item.qty}
                          onChange={(e) => handleItemChange(idx, "qty", Math.max(1, parseInt(e.target.value) || 1))}
                          required
                          className="bg-background h-9 text-xs"
                        />
                      </div>

                      {/* Unit */}
                      <div className="col-span-8 md:col-span-2 space-y-1">
                        <Label className="text-[10px] font-medium text-muted-foreground">Satuan</Label>
                        <Select 
                          value={item.unit} 
                          onValueChange={(val) => handleItemChange(idx, "unit", val)}
                        >
                          <SelectTrigger className="bg-background h-9 text-xs">
                            <SelectValue placeholder="Satuan" />
                          </SelectTrigger>
                          <SelectContent>
                            {units.length > 0 ? (
                              units.map((u) => (
                                <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>
                              ))
                            ) : (
                              <>
                                <SelectItem value="Pcs">Pcs</SelectItem>
                                <SelectItem value="Bulan">Bulan</SelectItem>
                                <SelectItem value="Unit">Unit</SelectItem>
                                <SelectItem value="Pax">Pax</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Price */}
                      <div className="col-span-10 md:col-span-2 space-y-1">
                        <Label className="text-[10px] font-medium text-muted-foreground">Harga Satuan (Rp) <span className="text-destructive">*</span></Label>
                        <div className="relative">
                          <Input
                            placeholder="0"
                            value={formatPriceInput(item.price)}
                            onChange={(e) => handlePriceChange(idx, e.target.value)}
                            required
                            className="bg-background h-9 text-xs pr-2"
                          />
                        </div>
                      </div>

                      {/* Delete button */}
                      <div className="col-span-2 md:col-span-1 pt-6 flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(idx)}
                          className="h-9 w-9 text-destructive hover:bg-destructive/10 rounded-md"
                          title="Hapus item"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Aggregate Summary */}
                <div className="flex items-center justify-between p-4 bg-accent/30 border border-border/80 rounded-xl mt-4">
                  <span className="text-xs font-semibold text-muted-foreground">Estimasi Total Pengajuan Bulanan:</span>
                  <span className="text-lg font-bold text-foreground">
                    {formatRupiah(totalAmount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 border-t border-border bg-accent/10 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="active-toggle"
                  checked={active}
                  onCheckedChange={setActive}
                />
                <Label htmlFor="active-toggle" className="text-xs font-medium cursor-pointer">
                  Aktifkan penjadwalan langsung
                </Label>
              </div>

              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsOpen(false)}
                  disabled={submitting}
                  className="text-xs h-9"
                >
                  Batal
                </Button>
                <Button 
                  type="submit" 
                  disabled={submitting}
                  className="gradient-primary text-primary-foreground text-xs h-9 shadow-sm"
                >
                  {submitting && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                  Simpan Template
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
