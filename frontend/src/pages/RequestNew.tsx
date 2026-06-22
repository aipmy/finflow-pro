import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Minus, Trash2, Upload, Save, Send, Loader2, Calendar, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { toast } from "sonner";
import { formatRupiah } from "@/utils/format";
import { apiClient } from "@/services/apiClient";

export default function RequestNew() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [step, setStep] = useState(1);
  const [type, setType] = useState("PEMBELIAN");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [dept, setDept] = useState("");
  const [site, setSite] = useState("");
  const [items, setItems] = useState<any[]>([{ name: "", qty: 1, unitId: "", categoryId: "", price: 0 }]);

  // Perjalanan Dinas Dates
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");

  // Meta states
  const [categories, setCategories] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [cats, depts, sts, uns] = await Promise.all([
          apiClient.meta.categories(),
          apiClient.meta.departments(),
          apiClient.meta.sites(),
          apiClient.meta.units()
        ]);
        setCategories(cats);
        setDepartments(depts);
        setSites(sts);
        setUnits(uns);
        
        if (isEdit) {
          const r = await apiClient.requests.get(id!);
          setType(r.type);
          setTitle(r.title);
          setDesc(r.description || "");
          setDept(r.departmentId);
          setSite(r.siteId);
          if (r.departureDate) setDepartureDate(r.departureDate.substring(0, 10));
          if (r.returnDate) setReturnDate(r.returnDate.substring(0, 10));
          if (r.items && r.items.length > 0) {
            const sortedItems = [...r.items].sort((a: any, b: any) =>
              (a.name || "").toLowerCase().localeCompare((b.name || "").toLowerCase())
            );
            setItems(sortedItems.map((it: any) => ({
              name: it.name,
              qty: it.qty,
              unitId: it.unitId || "",
              categoryId: it.categoryId || "",
              price: Number(it.price)
            })));
          }
        } else {
          if (depts.length > 0) setDept(depts[0].id);
          if (sts.length > 0) setSite(sts[0].id);
          
          const defaultCatId = cats.length > 0 ? cats[0].id : "";
          const defaultUnitId = uns.length > 0 ? uns[0].id : "";
          setItems([{ name: "", qty: 1, unitId: defaultUnitId, categoryId: defaultCatId, price: 0 }]);
        }
      } catch (err: any) {
        toast.error("Gagal memuat data: " + err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id, isEdit]);

  // Auto set category for Perjalanan Dinas
  useEffect(() => {
    if (type === "PERJALANAN_DINAS" && categories.length > 0) {
      const dinasCat = categories.find(c => c.name.toLowerCase() === "perjalanan dinas");
      if (dinasCat) {
        setItems(prev => prev.map(it => ({ ...it, categoryId: dinasCat.id })));
      }
    }
  }, [type, categories]);

  const total = items.reduce((a, b) => a + (b.qty || 0) * (b.price || 0), 0);

  const setItem = (i: number, k: string, v: string | number) => {
    setItems(arr => arr.map((it, idx) => idx === i ? { ...it, [k]: v } : it));
  };

  const handleAddItem = () => {
    const defaultUnitId = units.length > 0 ? units[0].id : "";
    const dinasCat = type === "PERJALANAN_DINAS" ? categories.find(c => c.name.toLowerCase() === "perjalanan dinas") : null;
    const defaultCatId = dinasCat ? dinasCat.id : (categories.length > 0 ? categories[0].id : "");
    setItems([...items, { name: "", qty: 1, unitId: defaultUnitId, categoryId: defaultCatId, price: 0 }]);
  };

  const handleSortItems = () => {
    setItems(prev => [...prev].sort((a, b) =>
      (a.name || "").toLowerCase().localeCompare((b.name || "").toLowerCase())
    ));
    toast.success("Item diurutkan berdasarkan nama (A-Z)");
  };

  const submit = async (asDraft = false) => {
    if (!title || !dept || !site) {
      toast.error("Lengkapi data pengajuan");
      return;
    }
    if (type === "PERJALANAN_DINAS" && (!departureDate || !returnDate)) {
      toast.error("Tanggal pergi dan pulang harus diisi untuk Perjalanan Dinas");
      return;
    }
    // Verify all items have name and category
    const invalidItem = items.find(it => !it.name.trim() || !it.categoryId);
    if (invalidItem) {
      toast.error("Lengkapi nama item dan kategori untuk setiap detail item");
      return;
    }

    setSubmitting(true);
    const payload = {
      type,
      title,
      description: desc,
      departmentId: dept,
      siteId: site,
      amount: total,
      status: asDraft ? "DRAFT" : "SUBMITTED",
      departureDate: type === "PERJALANAN_DINAS" ? departureDate : null,
      returnDate: type === "PERJALANAN_DINAS" ? returnDate : null,
      items: items.map(it => ({
        name: it.name,
        qty: it.qty,
        unitId: it.unitId || null,
        categoryId: it.categoryId || null,
        price: it.price
      })),
      attachments: []
    };

    try {
      if (isEdit) {
        await apiClient.requests.update(id!, payload);
        toast.success(asDraft ? "Draft pengajuan diperbarui" : "Pengajuan berhasil diajukan ulang");
      } else {
        await apiClient.requests.create(payload);
        toast.success(asDraft ? "Pengajuan disimpan sebagai draft" : "Pengajuan berhasil diajukan");
      }
      navigate("/requests");
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan pengajuan");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
        <span className="text-sm text-muted-foreground">Memuat form pengajuan...</span>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto pb-24">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="-ml-2"><ArrowLeft className="h-4 w-4" /></Button>
        <h2 className="text-lg font-bold tracking-tight">{isEdit ? "Edit Pengajuan" : "Buat Pengajuan Baru"}</h2>
      </div>

      {/* Stepper (mobile) */}
      <div className="md:hidden flex items-center gap-2 mb-4">
        {[1, 2, 3].map(s => (
          <div key={s} className={`flex-1 h-1 rounded-full ${step >= s ? "bg-primary" : "bg-muted"}`} />
        ))}
      </div>
      <div className="md:hidden text-xs text-muted-foreground mb-3">Langkah {step} dari 3</div>

      <div className="space-y-4">
        <Card className={`shadow-elegant ${step !== 1 ? "md:block hidden" : ""}`}>
          <CardHeader><CardTitle className="text-base">1. Informasi Umum</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Tipe Pengajuan</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PEMBELIAN">Pembelian Barang/Sparepart</SelectItem>
                    <SelectItem value="PETTY_CASH">Petty Cash</SelectItem>
                    <SelectItem value="REIMBURSE">Reimburse</SelectItem>
                    <SelectItem value="PERJALANAN_DINAS">Perjalanan Dinas</SelectItem>
                    <SelectItem value="OPERASIONAL">Operasional</SelectItem>
                    <SelectItem value="TOP_UP_PETTY_CASH">Top Up Petty Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Departemen</Label>
                  <Select value={dept} onValueChange={setDept}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Pilih dept" /></SelectTrigger>
                    <SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Site / Lokasi</Label>
                  <Select value={site} onValueChange={setSite}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Pilih site" /></SelectTrigger>
                    <SelectContent>{sites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div>
              <Label>Judul Pengajuan</Label>
              <Input className="mt-1.5" placeholder="Contoh: Pembelian sparepart line 2" value={title} onChange={e => setTitle(e.target.value)} />
            </div>

            {/* Travel dates for Perjalanan Dinas */}
            {type === "PERJALANAN_DINAS" && (
              <div className="grid sm:grid-cols-2 gap-3 border-t border-border pt-3 animate-in fade-in duration-200">
                <div>
                  <Label>Tanggal Pergi</Label>
                  <Input
                    type="date"
                    className="mt-1.5"
                    value={departureDate}
                    onChange={e => setDepartureDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Tanggal Pulang</Label>
                  <Input
                    type="date"
                    className="mt-1.5"
                    value={returnDate}
                    onChange={e => setReturnDate(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div>
              <Label>Deskripsi / Justifikasi</Label>
              <Textarea className="mt-1.5" rows={3} placeholder="Jelaskan kebutuhan..." value={desc} onChange={e => setDesc(e.target.value)} />
            </div>
            <div className="md:hidden flex justify-end pt-2">
              <Button onClick={() => setStep(2)} className="gradient-primary text-primary-foreground">Lanjut →</Button>
            </div>
          </CardContent>
        </Card>

        <Card className={`shadow-elegant ${step !== 2 ? "md:block hidden" : ""}`}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">2. Detail Item</CardTitle>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleSortItems} type="button">
                <ArrowUpDown className="h-3.5 w-3.5 mr-1" />Urutkan A-Z
              </Button>
              <Button size="sm" variant="outline" onClick={handleAddItem} type="button">
                <Plus className="h-3.5 w-3.5 mr-1" />Tambah
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end p-3 rounded-md border border-border">
                <div className="col-span-12 md:col-span-3">
                  <Label className="text-xs">Nama Item</Label>
                  <Input className="mt-1" value={it.name} onChange={e => setItem(i, "name", e.target.value)} />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <Label className="text-xs">Kategori</Label>
                  <Select value={it.categoryId} onValueChange={val => setItem(i, "categoryId", val)} disabled={type === "PERJALANAN_DINAS"}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Kategori" /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-3 md:col-span-1">
                  <Label className="text-xs">Qty</Label>
                  <Input
                    type="number"
                    className="mt-1 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    value={it.qty || 1}
                    onChange={e => setItem(i, "qty", Math.max(1, parseInt(e.target.value) || 1))}
                  />
                </div>
                <div className="col-span-4 md:col-span-2">
                  <Label className="text-xs">Unit</Label>
                  <Select value={it.unitId} onValueChange={val => setItem(i, "unitId", val)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Unit" /></SelectTrigger>
                    <SelectContent>
                      {units.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-4 md:col-span-2">
                  <Label className="text-xs">Harga</Label>
                  <Input className="mt-1" type="number" value={it.price} onChange={e => setItem(i, "price", +e.target.value)} />
                </div>
                <div className="col-span-1 flex justify-end">
                  <Button size="icon" variant="ghost" className="h-9 w-9 text-destructive" onClick={() => setItems(items.filter((_, idx) => idx !== i))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-xl font-bold text-primary">{formatRupiah(total)}</span>
            </div>
            <div className="md:hidden flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>← Kembali</Button>
              <Button onClick={() => setStep(3)} className="gradient-primary text-primary-foreground">Lanjut →</Button>
            </div>
          </CardContent>
        </Card>

        <Card className={`shadow-elegant ${step !== 3 ? "md:block hidden" : ""}`}>
          <CardHeader><CardTitle className="text-base">3. Lampiran</CardTitle></CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-border rounded-md p-8 text-center hover:border-primary/40 transition-colors cursor-pointer">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <div className="text-sm font-medium">Tarik file ke sini atau klik untuk upload</div>
              <div className="text-[11px] text-muted-foreground mt-1">PDF, JPG, PNG hingga 10MB</div>
            </div>
            <div className="md:hidden flex justify-start pt-3">
              <Button variant="outline" onClick={() => setStep(2)}>← Kembali</Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-2 justify-end pt-2">
          <Button variant="outline" onClick={() => submit(true)} disabled={submitting}>
            <Save className="h-4 w-4 mr-1.5" />Simpan Draft
          </Button>
          <Button onClick={() => submit(false)} className="gradient-primary text-primary-foreground shadow-glow" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Send className="h-4 w-4 mr-1.5" />}
            Ajukan Sekarang
          </Button>
        </div>
      </div>
    </div>
  );
}
