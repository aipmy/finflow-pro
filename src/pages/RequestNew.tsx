import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Upload, Save, Send } from "lucide-react";
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
import { categories, departments, sites } from "@/data/mockData";

export default function RequestNew() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [type, setType] = useState("PEMBELIAN");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [cat, setCat] = useState("");
  const [dept, setDept] = useState("");
  const [site, setSite] = useState("");
  const [items, setItems] = useState([{ name: "", qty: 1, unit: "Pcs", price: 0 }]);

  const total = items.reduce((a, b) => a + (b.qty || 0) * (b.price || 0), 0);

  const setItem = (i: number, k: string, v: string | number) => {
    setItems(arr => arr.map((it, idx) => idx === i ? { ...it, [k]: v } : it));
  };

  const submit = (asDraft = false) => {
    if (!title || !cat || !dept || !site) {
      toast.error("Lengkapi data pengajuan");
      return;
    }
    toast.success(asDraft ? "Pengajuan disimpan sebagai draft" : "Pengajuan berhasil diajukan");
    navigate("/requests");
  };

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto pb-24">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="-ml-2"><ArrowLeft className="h-4 w-4" /></Button>
        <h2 className="text-lg font-bold tracking-tight">Buat Pengajuan Baru</h2>
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
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Kategori</Label>
                <Select value={cat} onValueChange={setCat}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Judul Pengajuan</Label>
              <Input className="mt-1.5" placeholder="Contoh: Pembelian sparepart line 2" value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
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
            <Button size="sm" variant="outline" onClick={() => setItems([...items, { name: "", qty: 1, unit: "Pcs", price: 0 }])}>
              <Plus className="h-3.5 w-3.5 mr-1" />Tambah
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end p-3 rounded-md border border-border">
                <div className="col-span-12 md:col-span-5">
                  <Label className="text-xs">Nama Item</Label>
                  <Input className="mt-1" value={it.name} onChange={e => setItem(i, "name", e.target.value)} />
                </div>
                <div className="col-span-3 md:col-span-2">
                  <Label className="text-xs">Qty</Label>
                  <Input className="mt-1" type="number" value={it.qty} onChange={e => setItem(i, "qty", +e.target.value)} />
                </div>
                <div className="col-span-3 md:col-span-2">
                  <Label className="text-xs">Unit</Label>
                  <Input className="mt-1" value={it.unit} onChange={e => setItem(i, "unit", e.target.value)} />
                </div>
                <div className="col-span-5 md:col-span-2">
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
          <Button variant="outline" onClick={() => submit(true)}><Save className="h-4 w-4 mr-1.5" />Simpan Draft</Button>
          <Button onClick={() => submit(false)} className="gradient-primary text-primary-foreground shadow-glow">
            <Send className="h-4 w-4 mr-1.5" />Ajukan Sekarang
          </Button>
        </div>
      </div>
    </div>
  );
}
