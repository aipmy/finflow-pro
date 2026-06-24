import { useEffect, useState } from "react";
import { Search, Plus, ArrowDown, ArrowUp, AlertTriangle, Package, Trash2, Camera, FileImage, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatNumber, formatDate, formatDateTime } from "@/utils/format";
import { apiClient } from "@/services/apiClient";
import { useAuth } from "@/stores/authStore";
import { toast } from "sonner";
import { ImagePreviewModal } from "@/components/ImagePreviewModal";
import { WebcamCapture } from "@/components/WebcamCapture";

export default function Inventory() {
  const { user } = useAuth();
  const isAdmin = user?.role?.toLowerCase() === "admin";

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [q, setQ] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog State
  const [isNewItemOpen, setIsNewItemOpen] = useState(false);
  const [isMovementOpen, setIsMovementOpen] = useState(false);
  const [movType, setMovType] = useState<"IN" | "OUT">("IN");
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any>(null);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);

  // Delete State
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Form State - New Item
  const [newItemName, setNewItemName] = useState("");
  const [newItemSku, setNewItemSku] = useState("");
  const [newItemCat, setNewItemCat] = useState("");
  const [newItemLoc, setNewItemLoc] = useState("");
  const [newItemUnit, setNewItemUnit] = useState("");
  const [newItemStock, setNewItemStock] = useState("0");
  const [newItemMinStock, setNewItemMinStock] = useState("0");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // Form State - Stock Movement
  const [editingMovementId, setEditingMovementId] = useState<string | null>(null);
  const [movItem, setMovItem] = useState("");
  const [movQty, setMovQty] = useState("");
  const [movNote, setMovNote] = useState("");
  const [movDate, setMovDate] = useState("");
  const [movTime, setMovTime] = useState("");
  const [movProof, setMovProof] = useState<File | null>(null);
  const [movProofUrl, setMovProofUrl] = useState<string>("");

  const [movementToDelete, setMovementToDelete] = useState<any>(null);
  const [isDeleteMovementDialogOpen, setIsDeleteMovementDialogOpen] = useState(false);

  const [previewUrl, setPreviewUrl] = useState("");
  const [previewDetails, setPreviewDetails] = useState<any[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isUsingWebcam, setIsUsingWebcam] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const getCurrentDateString = () => {
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    return (new Date(Date.now() - tzoffset)).toISOString().split("T")[0];
  };

  const getCurrentTimeString = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  async function loadData(start = startDate, end = endDate) {
    try {
      setLoading(true);
      const [itms, mvts, cats, sts, unts] = await Promise.all([
        apiClient.inventory.list(),
        apiClient.inventory.movements({ startDate: start || undefined, endDate: end || undefined }),
        apiClient.meta.categories(),
        apiClient.meta.sites(),
        apiClient.meta.units()
      ]);
      setItems(itms);
      setMovements(mvts);
      setCategories(cats);
      setSites(sts);
      setUnits(unts);
    } catch (err: any) {
      toast.error("Gagal memuat data inventaris: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    try {
      await apiClient.inventory.deleteItem(itemToDelete.id);
      toast.success("Barang berhasil dihapus");
      setIsDeleteDialogOpen(false);
      setItemToDelete(null);
      loadData(startDate, endDate);
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus barang");
    }
  };

  useEffect(() => {
    loadData("", "");
  }, []);

  const filtered = items.filter(i =>
    !q || `${i.name} ${i.sku}`.toLowerCase().includes(q.toLowerCase())
  );
  
  const lowCount = items.filter(i => i.stock < i.minStock).length;

  const handleSaveItem = async () => {
    if (!newItemName || !newItemSku) {
      toast.error("Nama barang dan SKU wajib diisi");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: newItemName,
        sku: newItemSku,
        categoryId: newItemCat || undefined,
        locationId: newItemLoc || undefined,
        unitId: newItemUnit || undefined,
        stock: parseInt(newItemStock, 10) || 0,
        minStock: parseInt(newItemMinStock, 10) || 0
      };

      if (editingItemId) {
        await apiClient.inventory.updateItem(editingItemId, payload);
        toast.success("Barang berhasil diperbarui");
      } else {
        await apiClient.inventory.createItem(payload);
        toast.success("Barang baru berhasil ditambahkan");
      }
      
      // Reset Form
      setNewItemName("");
      setNewItemSku("");
      setNewItemCat("");
      setNewItemLoc("");
      setNewItemUnit("");
      setNewItemStock("0");
      setNewItemMinStock("0");
      setEditingItemId(null);
      setIsNewItemOpen(false);

      loadData();
    } catch (err: any) {
      toast.error(err.message || "Gagal membuat barang");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditItem = (item: any) => {
    setEditingItemId(item.id);
    setNewItemName(item.name);
    setNewItemSku(item.sku);
    setNewItemCat(item.categoryId || "");
    setNewItemLoc(item.locationId || "");
    setNewItemUnit(item.unitId || "");
    setNewItemStock(item.stock.toString());
    setNewItemMinStock(item.minStock.toString());
    setIsNewItemOpen(true);
  };

  const handleSaveMovement = async () => {
    const qtyNum = parseInt(movQty, 10);
    if (!movItem || isNaN(qtyNum) || qtyNum <= 0) {
      toast.error("Pilih barang dan masukkan jumlah yang valid");
      return;
    }

    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (movTime && !timeRegex.test(movTime)) {
      toast.error("Format waktu tidak valid. Gunakan format 24 jam HH:MM (contoh: 14:30)");
      return;
    }

    setIsSubmitting(true);
    try {
      let proofUrl = movProofUrl;
      if (movProof) {
        const uploadRes = await apiClient.upload(movProof);
        proofUrl = uploadRes.file.url;
      }

      let movementDate: string | undefined = undefined;
      if (movDate) {
        const timePart = movTime || "00:00";
        movementDate = new Date(`${movDate}T${timePart}:00`).toISOString();
      }

      const payload = {
        itemId: movItem,
        type: movType,
        quantity: qtyNum,
        note: movNote,
        proofUrl,
        createdAt: movementDate
      };

      if (editingMovementId) {
        await apiClient.inventory.updateMovement(editingMovementId, payload);
        toast.success(`Transaksi stock berhasil diperbarui`);
      } else {
        await apiClient.inventory.createMovement(payload);
        toast.success(`Transaksi stock ${movType} berhasil dicatat`);
      }

      setMovItem("");
      setMovQty("");
      setMovNote("");
      setMovDate("");
      setMovTime("");
      setMovProof(null);
      setMovProofUrl("");
      setEditingMovementId(null);
      setIsMovementOpen(false);

      loadData();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan transaksi stok");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditMovement = (m: any) => {
    setEditingMovementId(m.id);
    setMovType(m.type);
    setMovItem(m.itemId);
    setMovQty(m.quantity.toString());
    setMovNote(m.note || "");
    if (m.createdAt) {
      const d = new Date(m.createdAt);
      const tzoffset = d.getTimezoneOffset() * 60000;
      const localISO = new Date(d.getTime() - tzoffset).toISOString();
      setMovDate(localISO.split("T")[0]);
      setMovTime(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
    }
    setMovProof(null);
    setMovProofUrl(m.proofUrl || "");
    setIsMovementOpen(true);
  };

  const handleDeleteMovement = async () => {
    if (!movementToDelete) return;
    try {
      await apiClient.inventory.deleteMovement(movementToDelete.id);
      toast.success("Riwayat transaksi stok berhasil dihapus");
      setIsDeleteMovementDialogOpen(false);
      setMovementToDelete(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus riwayat stok");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-2">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">Memuat data inventaris...</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Stok Barang</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{items.length} item • {lowCount} di bawah minimum</p>
        </div>
        <div className="flex gap-2">
          {/* Stock In / Out Dialog Trigger */}
            <Dialog open={isMovementOpen} onOpenChange={(open) => {
              setIsMovementOpen(open);
              if (open && !editingMovementId) {
                setMovDate(getCurrentDateString());
                setMovTime(getCurrentTimeString());
                setMovProof(null);
                setMovProofUrl("");
              }
              if (!open) {
                setEditingMovementId(null);
                setMovItem("");
                setMovQty("");
                setMovNote("");
                setMovProof(null);
                setMovProofUrl("");
                setIsUsingWebcam(false);
              }
            }}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" onClick={() => setMovType("IN")}>
                <ArrowDown className="h-4 w-4 mr-1.5" />Stock In
              </Button>
            </DialogTrigger>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" onClick={() => setMovType("OUT")}>
                <ArrowUp className="h-4 w-4 mr-1.5" />Stock Out
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingMovementId ? "Edit Transaksi Stok" : `Transaksi Stok - ${movType}`}</DialogTitle>
                <DialogDescription>{editingMovementId ? "Perbarui informasi riwayat stok." : "Input pergerakan stok barang secara manual."}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Pilih Barang</Label>
                  <Select value={movItem} onValueChange={setMovItem} disabled={!!editingMovementId}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Pilih barang..." />
                    </SelectTrigger>
                    <SelectContent>
                      {items.map(i => (
                        <SelectItem key={i.id} value={i.id}>{i.sku} - {i.name} (Stok: {i.stock})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="movQty">Jumlah</Label>
                    <Input 
                      id="movQty" 
                      type="number" 
                      placeholder="0" 
                      value={movQty} 
                      onChange={e => setMovQty(e.target.value)} 
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="movDate">Tanggal</Label>
                    <Input 
                      id="movDate" 
                      type="date" 
                      value={movDate} 
                      onChange={e => setMovDate(e.target.value)} 
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="movTime">Waktu (24 Jam)</Label>
                    <Input 
                      id="movTime" 
                      type="text" 
                      placeholder="14:30" 
                      value={movTime} 
                      onChange={e => setMovTime(e.target.value)} 
                      className="mt-1.5"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="movNote">Keterangan / Memo</Label>
                  <Input 
                    id="movNote" 
                    type="text" 
                    placeholder="Catatan transaksi..." 
                    value={movNote} 
                    onChange={e => setMovNote(e.target.value)} 
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center">
                    <Label>Bukti / Lampiran (Opsional)</Label>
                    {!isUsingWebcam && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => setIsUsingWebcam(true)}>
                        <Camera className="h-3 w-3 mr-1" /> Buka Kamera
                      </Button>
                    )}
                  </div>
                  
                  {isUsingWebcam ? (
                    <div className="mt-1.5 p-3 border rounded-md bg-muted/30">
                      <WebcamCapture 
                        onCapture={(file) => {
                          setMovProof(file);
                          setIsUsingWebcam(false);
                        }}
                        onCancel={() => setIsUsingWebcam(false)}
                      />
                    </div>
                  ) : (
                    <div className="mt-1.5 flex gap-2">
                      <Input 
                        id="movProof" 
                        type="file" 
                        accept="image/*"
                        capture="environment"
                        onChange={e => setMovProof(e.target.files?.[0] || null)} 
                      />
                    </div>
                  )}

                  {movProof && <p className="text-xs text-muted-foreground mt-1">File terpilih: {movProof.name}</p>}
                  {!movProof && movProofUrl && (
                    <div className="mt-2 text-sm text-blue-600 hover:underline cursor-pointer flex items-center gap-1" onClick={() => window.open(movProofUrl, '_blank')}>
                      <FileImage className="h-4 w-4" /> Lihat Bukti Saat Ini
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleSaveMovement} className="gradient-primary text-primary-foreground" disabled={isSubmitting}>
                  {isSubmitting ? "Memproses..." : "Simpan Transaksi"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* New Item Dialog Trigger */}
          <Dialog open={isNewItemOpen} onOpenChange={(open) => {
            setIsNewItemOpen(open);
            if (!open) {
              setEditingItemId(null);
              setNewItemName("");
              setNewItemSku("");
              setNewItemCat("");
              setNewItemLoc("");
              setNewItemUnit("");
              setNewItemStock("0");
              setNewItemMinStock("0");
            }
          }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gradient-primary text-primary-foreground">
                <Plus className="h-4 w-4 mr-1.5" />Item Baru
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingItemId ? "Edit Barang" : "Tambah Barang Baru"}</DialogTitle>
                <DialogDescription>{editingItemId ? "Perbarui informasi barang di inventaris." : "Masukkan detail barang untuk didaftarkan."}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="name">Nama Barang</Label>
                    <Input id="name" placeholder="Oli Mesin" value={newItemName} onChange={e => setNewItemName(e.target.value)} className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="sku">SKU</Label>
                    <Input id="sku" placeholder="SPR-001" value={newItemSku} onChange={e => setNewItemSku(e.target.value)} className="mt-1.5" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Kategori</Label>
                    <Select value={newItemCat} onValueChange={setNewItemCat}>
                      <SelectTrigger className="mt-1.5"><SelectValue placeholder="Pilih..." /></SelectTrigger>
                      <SelectContent>
                        {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Unit Satuan</Label>
                    <Select value={newItemUnit} onValueChange={setNewItemUnit}>
                      <SelectTrigger className="mt-1.5"><SelectValue placeholder="Pilih..." /></SelectTrigger>
                      <SelectContent>
                        {units.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Lokasi / Site Gudang</Label>
                  <Select value={newItemLoc} onValueChange={setNewItemLoc}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Pilih lokasi..." /></SelectTrigger>
                    <SelectContent>
                      {sites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="stock">Stok Awal</Label>
                    <Input id="stock" type="number" value={newItemStock} onChange={e => setNewItemStock(e.target.value)} className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="minStock">Minimum Stok</Label>
                    <Input id="minStock" type="number" value={newItemMinStock} onChange={e => setNewItemMinStock(e.target.value)} className="mt-1.5" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleSaveItem} className="gradient-primary text-primary-foreground" disabled={isSubmitting}>
                  {isSubmitting ? "Menyimpan..." : "Simpan Barang"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <Card className="shadow-elegant"><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-primary/10 text-primary flex items-center justify-center"><Package className="h-5 w-5" /></div>
          <div><div className="text-xl font-bold">{items.length}</div><div className="text-[11px] text-muted-foreground">Total Item</div></div>
        </CardContent></Card>
        <Card className="shadow-elegant"><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-warning/10 text-warning flex items-center justify-center"><AlertTriangle className="h-5 w-5" /></div>
          <div><div className="text-xl font-bold">{lowCount}</div><div className="text-[11px] text-muted-foreground">Di Bawah Minimum</div></div>
        </CardContent></Card>
        <Card className="shadow-elegant"><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-success/10 text-success flex items-center justify-center"><Package className="h-5 w-5" /></div>
          <div><div className="text-xl font-bold">{formatNumber(items.reduce((a, b) => a + b.stock, 0))}</div><div className="text-[11px] text-muted-foreground">Total Unit</div></div>
        </CardContent></Card>
      </div>

      <Card className="shadow-elegant"><CardContent className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Cari nama barang atau SKU..." value={q} onChange={e => setQ(e.target.value)} />
        </div>
      </CardContent></Card>

      <Card className="shadow-elegant hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left p-3 font-medium">SKU</th>
                <th className="text-left p-3 font-medium">Nama Barang</th>
                <th className="text-left p-3 font-medium">Kategori</th>
                <th className="text-right p-3 font-medium">Stok</th>
                <th className="text-right p-3 font-medium">Min</th>
                <th className="text-left p-3 font-medium">Unit</th>
                <th className="text-left p-3 font-medium">Lokasi</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-right p-3 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(i => {
                const c = i.category;
                const s = i.location;
                const low = i.stock < i.minStock;
                return (
                  <tr key={i.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-3 font-mono text-xs">{i.sku}</td>
                    <td className="p-3 font-medium">{i.name}</td>
                    <td className="p-3 text-xs text-muted-foreground">{c?.name}</td>
                    <td className={`p-3 text-right font-semibold ${low ? "text-destructive" : ""}`}>{formatNumber(i.stock)}</td>
                    <td className="p-3 text-right text-xs text-muted-foreground">{formatNumber(i.minStock)}</td>
                    <td className="p-3 text-xs">{i.unit?.name || "Unit"}</td>
                    <td className="p-3 text-xs">{s?.name || "Gudang"}</td>
                    <td className="p-3">
                      {low ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-destructive/10 text-destructive border border-destructive/30 font-medium">Restock</span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-success/10 text-success border border-success/30 font-medium">Aman</span>
                      )}
                    </td>
                    <td className="p-3 text-right space-x-1">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setSelectedHistoryItem(i); setIsHistoryDialogOpen(true); }}>
                        Riwayat
                      </Button>
                      {isAdmin && (
                        <>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 text-xs text-blue-600 hover:bg-blue-50 hover:text-blue-600" 
                            onClick={() => handleEditItem(i)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive" 
                            onClick={() => { setItemToDelete(i); setIsDeleteDialogOpen(true); }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="p-12 text-center text-sm text-muted-foreground">Tidak ada barang ditemukan</div>}
        </div>
      </Card>

      <div className="md:hidden space-y-2">
        {filtered.map(i => {
          const s = i.location;
          const low = i.stock < i.minStock;
          return (
            <Card key={i.id} className="shadow-sm"><CardContent className="p-3">
              <div className="flex items-start justify-between mb-1.5">
                <div>
                  <div className="font-mono text-[10px] text-muted-foreground">{i.sku}</div>
                  <div className="text-sm font-medium">{i.name}</div>
                </div>
                {low ? <span className="text-[10px] px-2 py-0.5 rounded-md bg-destructive/10 text-destructive border border-destructive/30">Restock</span> : <span className="text-[10px] px-2 py-0.5 rounded-md bg-success/10 text-success border border-success/30">Aman</span>}
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px] mt-2 pt-2 border-t border-border">
                <div><div className="text-muted-foreground">Stok</div><div className={`font-semibold ${low ? "text-destructive" : ""}`}>{formatNumber(i.stock)} {i.unit?.name || "Unit"}</div></div>
                <div><div className="text-muted-foreground">Min</div><div>{formatNumber(i.minStock)}</div></div>
                <div><div className="text-muted-foreground">Lokasi</div><div className="truncate">{s?.name || "Gudang"}</div></div>
              </div>
              <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-border">
                <Button variant="ghost" size="sm" className="h-6 text-[10px] py-0 px-2" onClick={() => { setSelectedHistoryItem(i); setIsHistoryDialogOpen(true); }}>
                  Lihat Riwayat Stok
                </Button>
                {isAdmin && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 text-[10px] py-0 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive" 
                    onClick={() => { setItemToDelete(i); setIsDeleteDialogOpen(true); }}
                  >
                    Hapus
                  </Button>
                )}
              </div>
            </CardContent></Card>
          );
        })}
      </div>

      {/* Movements */}
      <Card className="shadow-elegant">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h3 className="font-semibold text-sm">Riwayat Pergerakan Stok</h3>
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex flex-col">
                <span className="text-[10px] font-medium text-muted-foreground mb-1">Tanggal Mulai</span>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    loadData(e.target.value, endDate);
                  }}
                  className="h-8 text-xs w-[140px]"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-medium text-muted-foreground mb-1">Tanggal Selesai</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    loadData(startDate, e.target.value);
                  }}
                  className="h-8 text-xs w-[140px]"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  loadData("", "");
                }}
                className="h-8 text-xs"
              >
                Reset
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            {movements.map(m => (
              <div key={m.id} className="flex items-center justify-between p-2.5 rounded-md border border-border">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-md flex items-center justify-center ${m.type === "IN" ? "bg-success/10 text-success" : "bg-info/10 text-info"}`}>
                    {m.type === "IN" ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{m.item?.name}</div>
                    <div className="text-[11px] text-muted-foreground">{m.note} • {m.actor?.name}</div>
                    {m.proofUrl && (
                      <button 
                        onClick={() => {
                          if (m.proofUrl.toLowerCase().endsWith(".pdf")) {
                            window.open(m.proofUrl, "_blank");
                          } else {
                            setPreviewUrl(m.proofUrl);
                            setPreviewDetails([
                              { label: "Transaksi", value: `Stok ${m.type === "IN" ? "Masuk" : "Keluar"}` },
                              { label: "Barang", value: m.item?.name },
                              { label: "Jumlah", value: `${m.quantity} ${m.item?.unit?.name || "Unit"}` },
                              { label: "Tanggal", value: formatDateTime(m.createdAt) },
                              { label: "Diinput Oleh", value: m.actor?.name },
                              { label: "Catatan", value: m.note || "-" }
                            ]);
                            setIsPreviewOpen(true);
                          }
                        }}
                        className="text-[10px] text-primary hover:underline mt-0.5 inline-block"
                      >
                        Lihat Bukti
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm font-semibold">{m.type === "IN" ? "+" : "-"}{m.quantity} {m.item?.unit?.name || "Unit"}</div>
                    <div className="text-[10px] text-muted-foreground">{formatDateTime(m.createdAt)}</div>
                  </div>
                  {isAdmin && (
                    <div className="flex flex-col gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => handleEditMovement(m)}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => { setMovementToDelete(m); setIsDeleteMovementDialogOpen(true); }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {movements.length === 0 && <div className="text-center py-8 text-sm text-muted-foreground">Belum ada riwayat pergerakan stok</div>}
          </div>
        </CardContent>
      </Card>

      {/* Dialog for Item Specific History Log */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Riwayat Pergerakan Stok: {selectedHistoryItem?.name}</DialogTitle>
            <DialogDescription>SKU: {selectedHistoryItem?.sku} | Stok Saat Ini: {selectedHistoryItem?.stock} {selectedHistoryItem?.unit?.name || "Unit"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {selectedHistoryItem && movements.filter(m => m.itemId === selectedHistoryItem.id).length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground">Belum ada riwayat pergerakan untuk barang ini</div>
            ) : (
              movements.filter(m => m.itemId === selectedHistoryItem?.id).map(m => (
                <div key={m.id} className="flex items-center justify-between p-2.5 rounded-md border border-border text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded flex items-center justify-center ${m.type === "IN" ? "bg-success/10 text-success" : "bg-info/10 text-info"}`}>
                      {m.type === "IN" ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />}
                    </div>
                    <div>
                      <div className="font-semibold">{m.type === "IN" ? "Masuk" : "Keluar"} {m.quantity} {selectedHistoryItem?.unit?.name || "Unit"}</div>
                      <div className="text-[10px] text-muted-foreground">{m.note || "Tanpa catatan"} • {m.actor?.name}</div>
                      {m.proofUrl && (
                        <button 
                          onClick={() => {
                            if (m.proofUrl.toLowerCase().endsWith(".pdf")) {
                              window.open(m.proofUrl, "_blank");
                            } else {
                              setPreviewUrl(m.proofUrl);
                              setPreviewDetails([
                                { label: "Transaksi", value: `Stok ${m.type === "IN" ? "Masuk" : "Keluar"}` },
                                { label: "Barang", value: selectedHistoryItem?.name },
                                { label: "Jumlah", value: `${m.quantity} ${selectedHistoryItem?.unit?.name || "Unit"}` },
                                { label: "Tanggal", value: formatDateTime(m.createdAt) },
                                { label: "Diinput Oleh", value: m.actor?.name },
                                { label: "Catatan", value: m.note || "-" }
                              ]);
                              setIsPreviewOpen(true);
                            }
                          }}
                          className="text-[10px] text-primary hover:underline mt-0.5 inline-block"
                        >
                          Lihat Bukti
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground">{formatDateTime(m.createdAt)}</div>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button size="sm" onClick={() => setIsHistoryDialogOpen(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog for Confirm Delete Movement */}
      <AlertDialog open={isDeleteMovementDialogOpen} onOpenChange={setIsDeleteMovementDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Riwayat Stok?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan membatalkan (rollback) efek dari pergerakan stok ini terhadap saldo barang utama dan menghapus riwayatnya dari database.
              <br/><br/>
              <span className="font-semibold">{movementToDelete?.item?.name}</span> - {movementToDelete?.type === "IN" ? "Masuk" : "Keluar"} {movementToDelete?.quantity} {movementToDelete?.item?.unit?.name}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMovement} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Ya, Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Alert Dialog for Confirm Delete */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Ini akan menghapus barang{" "}
              <span className="font-semibold">{itemToDelete?.name}</span> ({itemToDelete?.sku}) dari database master inventaris.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteItem} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ImagePreviewModal 
        isOpen={isPreviewOpen} 
        onClose={() => setIsPreviewOpen(false)} 
        imageUrl={previewUrl} 
        details={previewDetails}
      />
    </div>
  );
}
