import { useEffect, useState } from "react";
import { Search, Plus, ArrowDown, ArrowUp, ArrowUpDown, AlertTriangle, Package, Trash2, Camera, FileImage, Pencil } from "lucide-react";
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
  const [statusFilter, setStatusFilter] = useState<"ALL" | "LOW" | "OK">("ALL");
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

  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'sku', direction: 'asc' });

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

  async function loadData(start = startDate, end = endDate, silent = false) {
    try {
      if (!silent) setLoading(true);
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
      if (!silent) toast.error("Gagal memuat data inventaris: " + err.message);
    } finally {
      if (!silent) setLoading(false);
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
    loadData(startDate, endDate);

    const interval = setInterval(() => {
      loadData(startDate, endDate, true);
    }, 15000);

    return () => clearInterval(interval);
  }, [startDate, endDate]);

  const filtered = items.filter(i => {
    const matchesQuery = !q || `${i.name} ${i.sku}`.toLowerCase().includes(q.toLowerCase());
    if (!matchesQuery) return false;
    
    if (statusFilter === "LOW") {
      return i.stock < i.minStock;
    }
    if (statusFilter === "OK") {
      return i.stock >= i.minStock;
    }
    return true;
  });
  
  const sortedItems = [...filtered].sort((a, b) => {
    let valA: any = a[sortConfig.key as keyof typeof a];
    let valB: any = b[sortConfig.key as keyof typeof b];

    if (sortConfig.key === 'location') {
      valA = a.location?.name || '';
      valB = b.location?.name || '';
    } else if (sortConfig.key === 'unit') {
      valA = a.unit?.name || '';
      valB = b.unit?.name || '';
    } else if (sortConfig.key === 'status') {
      valA = a.stock < a.minStock ? 0 : 1;
      valB = b.stock < b.minStock ? 0 : 1;
    } else if (sortConfig.key === 'name') {
      valA = (a.name || '').toLowerCase();
      valB = (b.name || '').toLowerCase();
    } else if (sortConfig.key === 'sku') {
      valA = (a.sku || '').toLowerCase();
      valB = (b.sku || '').toLowerCase();
    } else if (sortConfig.key === 'category') {
      valA = (a.category?.name || '').toLowerCase();
      valB = (b.category?.name || '').toLowerCase();
    }

    if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
    if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown className="h-3 w-3 ml-1 inline opacity-30" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3 ml-1 inline" /> : <ArrowDown className="h-3 w-3 ml-1 inline" />;
  };
  
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
              <Button size="sm" variant="outline" onClick={() => {
                setEditingMovementId(null);
                setMovItem("");
                setMovQty("");
                setMovNote("");
                setMovDate(getCurrentDateString());
                setMovTime(getCurrentTimeString());
                setMovProof(null);
                setMovProofUrl("");
                setMovType("IN");
              }}>
                <ArrowDown className="h-4 w-4 mr-1.5" />Stock In
              </Button>
            </DialogTrigger>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" onClick={() => {
                setEditingMovementId(null);
                setMovItem("");
                setMovQty("");
                setMovNote("");
                setMovDate(getCurrentDateString());
                setMovTime(getCurrentTimeString());
                setMovProof(null);
                setMovProofUrl("");
                setMovType("OUT");
              }}>
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card 
          className="relative overflow-hidden border border-border/60 bg-card/50 backdrop-blur-md shadow-elegant hover:-translate-y-1 transition-all duration-300 group cursor-pointer"
          onClick={() => setStatusFilter("ALL")}
        >
          <div className={`absolute top-0 left-0 w-1.5 h-full bg-primary transition-all duration-300 ${statusFilter === "ALL" ? "w-2.5" : "w-1.5"}`} />
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-sm border border-primary/20">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-black tracking-tight">{items.length}</div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Item</div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="relative overflow-hidden border border-border/60 bg-card/50 backdrop-blur-md shadow-elegant hover:-translate-y-1 transition-all duration-300 group cursor-pointer"
          onClick={() => setStatusFilter("LOW")}
        >
          <div className={`absolute top-0 left-0 w-1.5 h-full bg-warning transition-all duration-300 ${statusFilter === "LOW" ? "w-2.5" : "w-1.5"}`} />
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-warning/10 text-warning flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-sm border border-warning/20">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-black tracking-tight text-warning">{lowCount}</div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Di Bawah Minimum</div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="relative overflow-hidden border border-border/60 bg-card/50 backdrop-blur-md shadow-elegant hover:-translate-y-1 transition-all duration-300 group cursor-pointer"
          onClick={() => setStatusFilter("OK")}
        >
          <div className={`absolute top-0 left-0 w-1.5 h-full bg-success transition-all duration-300 ${statusFilter === "OK" ? "w-2.5" : "w-1.5"}`} />
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-success/10 text-success flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-sm border border-success/20">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-black tracking-tight text-success">{formatNumber(items.reduce((a, b) => a + b.stock, 0))}</div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Unit</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border/60 bg-card/50 backdrop-blur-md shadow-elegant">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              className="pl-10 h-10 border-border/60 bg-background/50 focus-visible:ring-primary/50" 
              placeholder="Cari nama barang atau SKU..." 
              value={q} 
              onChange={e => setQ(e.target.value)} 
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground mr-1 uppercase tracking-wider">Filter Status:</span>
            <Button
              size="sm"
              variant={statusFilter === "ALL" ? "default" : "outline"}
              onClick={() => setStatusFilter("ALL")}
              className={`h-8 rounded-full text-xs font-medium px-3.5 ${statusFilter === "ALL" ? "gradient-primary text-primary-foreground border-transparent shadow-sm" : "border-border/60 hover:bg-muted/60"}`}
            >
              Semua ({items.length})
            </Button>
            <Button
              size="sm"
              variant={statusFilter === "LOW" ? "default" : "outline"}
              onClick={() => setStatusFilter("LOW")}
              className={`h-8 rounded-full text-xs font-medium px-3.5 ${statusFilter === "LOW" ? "bg-warning text-warning-foreground border-transparent shadow-sm hover:bg-warning/90" : "border-border/60 text-warning hover:bg-warning/10 hover:text-warning"}`}
            >
              Restock ({lowCount})
            </Button>
            <Button
              size="sm"
              variant={statusFilter === "OK" ? "default" : "outline"}
              onClick={() => setStatusFilter("OK")}
              className={`h-8 rounded-full text-xs font-medium px-3.5 ${statusFilter === "OK" ? "bg-success text-success-foreground border-transparent shadow-sm hover:bg-success/90" : "border-border/60 text-success hover:bg-success/10 hover:text-success"}`}
            >
              Aman ({items.length - lowCount})
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/60 bg-card/40 backdrop-blur-md shadow-elegant hidden md:block overflow-hidden rounded-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground border-b border-border/50">
              <tr>
                <th className="text-left p-3.5 font-semibold cursor-pointer hover:bg-muted/50" onClick={() => requestSort('sku')}>SKU <SortIcon columnKey="sku" /></th>
                <th className="text-left p-3.5 font-semibold cursor-pointer hover:bg-muted/50" onClick={() => requestSort('name')}>Nama Barang <SortIcon columnKey="name" /></th>
                <th className="text-left p-3.5 font-semibold cursor-pointer hover:bg-muted/50" onClick={() => requestSort('category')}>Kategori <SortIcon columnKey="category" /></th>
                <th className="text-right p-3.5 font-semibold cursor-pointer hover:bg-muted/50" onClick={() => requestSort('stock')}>Stok <SortIcon columnKey="stock" /></th>
                <th className="text-right p-3.5 font-semibold cursor-pointer hover:bg-muted/50" onClick={() => requestSort('minStock')}>Min <SortIcon columnKey="minStock" /></th>
                <th className="text-left p-3.5 font-semibold cursor-pointer hover:bg-muted/50" onClick={() => requestSort('unit')}>Unit <SortIcon columnKey="unit" /></th>
                <th className="text-left p-3.5 font-semibold cursor-pointer hover:bg-muted/50" onClick={() => requestSort('location')}>Lokasi <SortIcon columnKey="location" /></th>
                <th className="text-left p-3.5 font-semibold cursor-pointer hover:bg-muted/50" onClick={() => requestSort('status')}>Status <SortIcon columnKey="status" /></th>
                <th className="text-right p-3.5 font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map(i => {
                const c = i.category;
                const s = i.location;
                const low = i.stock < i.minStock;
                return (
                  <tr key={i.id} className="border-b border-border/40 last:border-none hover:bg-muted/20 transition-all duration-150">
                    <td className="p-3.5">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-secondary/80 text-secondary-foreground border border-border/85 font-medium tracking-tight shadow-sm">
                        {i.sku}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-foreground">{i.name}</td>
                    <td className="p-3.5 text-xs font-medium text-muted-foreground">{c?.name || "-"}</td>
                    <td className={`p-3.5 text-right font-bold ${low ? "text-destructive" : "text-foreground"}`}>{formatNumber(i.stock)}</td>
                    <td className="p-3.5 text-right text-xs font-semibold text-muted-foreground">{formatNumber(i.minStock)}</td>
                    <td className="p-3.5 text-xs font-semibold text-muted-foreground">{i.unit?.name || "Unit"}</td>
                    <td className="p-3.5 text-xs font-semibold text-muted-foreground">{s?.name || "Gudang"}</td>
                    <td className="p-3.5">
                      {low ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-destructive/10 text-destructive border border-destructive/20 shadow-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-destructive mr-1.5 animate-pulse" />
                          Restock
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-success/10 text-success border border-success/20 shadow-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-success mr-1.5" />
                          Aman
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-7 text-xs px-2.5 border border-border/60 hover:bg-muted" onClick={() => { setSelectedHistoryItem(i); setIsHistoryDialogOpen(true); }}>
                          Riwayat
                        </Button>
                        {isAdmin && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:text-blue-500 border border-transparent hover:border-blue-200 dark:hover:border-blue-900/30" 
                              onClick={() => handleEditItem(i)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive border border-transparent hover:border-destructive/20" 
                              onClick={() => { setItemToDelete(i); setIsDeleteDialogOpen(true); }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {sortedItems.length === 0 && <div className="p-12 text-center text-sm text-muted-foreground italic">Tidak ada barang ditemukan</div>}
        </div>
      </Card>

      <div className="md:hidden space-y-3">
        {sortedItems.map(i => {
          const s = i.location;
          const low = i.stock < i.minStock;
          return (
            <Card key={i.id} className="relative overflow-hidden border border-border/60 bg-card/60 backdrop-blur-md shadow-elegant hover:-translate-y-0.5 transition-all duration-200">
              <div className={`absolute top-0 left-0 w-1.5 h-full ${low ? "bg-destructive" : "bg-success"}`} />
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="inline-block font-mono text-[10px] px-1.5 py-0.5 rounded bg-secondary/80 text-secondary-foreground border border-border/80 font-medium tracking-tight mb-1">
                      {i.sku}
                    </span>
                    <div className="text-sm font-bold tracking-tight text-foreground">{i.name}</div>
                  </div>
                  {low ? (
                    <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full bg-destructive/10 text-destructive border border-destructive/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-destructive mr-1 animate-pulse" />
                      Restock
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full bg-success/10 text-success border border-success/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-success mr-1" />
                      Aman
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-3 gap-2.5 text-xs pt-3 border-t border-border/40">
                  <div>
                    <div className="text-muted-foreground text-[10px] uppercase font-semibold tracking-wider">Stok</div>
                    <div className={`font-bold mt-0.5 ${low ? "text-destructive" : "text-foreground"}`}>{formatNumber(i.stock)} {i.unit?.name || "Unit"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-[10px] uppercase font-semibold tracking-wider">Min</div>
                    <div className="font-semibold text-muted-foreground mt-0.5">{formatNumber(i.minStock)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-[10px] uppercase font-semibold tracking-wider">Lokasi</div>
                    <div className="font-semibold truncate mt-0.5">{s?.name || "Gudang"}</div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-3 border-t border-border/40 gap-2">
                  <span className="text-[11px] text-muted-foreground italic truncate">{i.category?.name || "Tanpa Kategori"}</span>
                  <div className="flex items-center gap-1.5">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-[11px] px-2.5 border-border/60 hover:bg-muted" 
                      onClick={() => { setSelectedHistoryItem(i); setIsHistoryDialogOpen(true); }}
                    >
                      Riwayat
                    </Button>
                    {isAdmin && (
                      <>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-7 w-7 text-blue-600 border-border/60 hover:bg-blue-50 dark:hover:bg-blue-950/30" 
                          onClick={() => handleEditItem(i)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-7 w-7 text-destructive border-border/60 hover:bg-destructive/10" 
                          onClick={() => { setItemToDelete(i); setIsDeleteDialogOpen(true); }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Movements */}
      <Card className="border border-border/60 bg-card/40 backdrop-blur-md shadow-elegant">
        <CardContent className="p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-border/50">
            <div>
              <h3 className="font-bold text-base tracking-tight">Riwayat Pergerakan Stok</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Daftar keluar masuk stok barang logistik</p>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Tanggal Mulai</span>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    loadData(e.target.value, endDate);
                  }}
                  className="h-9 text-xs w-[145px] border-border/60 bg-background/50 focus-visible:ring-primary/50"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Tanggal Selesai</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    loadData(startDate, e.target.value);
                  }}
                  className="h-9 text-xs w-[145px] border-border/60 bg-background/50 focus-visible:ring-primary/50"
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
                className="h-9 text-xs px-3 border-border/60 hover:bg-muted"
              >
                Reset
              </Button>
            </div>
          </div>

          <div className="relative pl-6 sm:pl-8 before:absolute before:left-[17px] sm:before:left-[21px] before:top-2 before:bottom-2 before:w-[2px] before:bg-border/60 space-y-5">
            {movements.map(m => {
              const firstChar = m.actor?.name ? m.actor.name.charAt(0).toUpperCase() : "A";
              return (
                <div key={m.id} className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border/50 bg-card/60 backdrop-blur-md shadow-sm hover:shadow-md transition-all duration-200 group">
                  {/* Timeline icon indicator */}
                  <div className={`absolute -left-[27px] sm:-left-[31px] top-1/2 -translate-y-1/2 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border-4 border-background transition-transform duration-300 group-hover:scale-110 shadow-sm ${
                    m.type === "IN" 
                      ? "bg-success text-success-foreground" 
                      : "bg-info text-info-foreground"
                  }`}>
                    {m.type === "IN" ? <ArrowDown className="h-3.5 w-3.5 stroke-[2.5]" /> : <ArrowUp className="h-3.5 w-3.5 stroke-[2.5]" />}
                  </div>

                  <div className="flex items-start gap-3.5">
                    {/* User Initials Avatar */}
                    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs uppercase shadow-sm select-none">
                      {firstChar}
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm font-bold tracking-tight text-foreground flex flex-wrap items-center gap-1.5">
                        <span>{m.item?.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted font-mono border border-border/60 font-semibold text-muted-foreground">{m.item?.sku}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {m.note || <span className="italic text-muted-foreground/60">Tidak ada catatan</span>}
                        <span className="mx-1.5 text-border">•</span>
                        <span className="font-semibold text-foreground">{m.actor?.name}</span>
                      </div>
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
                          className="text-[10px] font-semibold text-primary hover:text-primary-glow hover:underline transition-colors mt-1 inline-flex items-center gap-1"
                        >
                          <FileImage className="h-3 w-3" /> Lihat Bukti Lampiran
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-5 pl-[48px] sm:pl-0 border-t border-dashed border-border/50 sm:border-none pt-2.5 sm:pt-0">
                    <div className="text-left sm:text-right">
                      <div className={`text-base font-black tracking-tight ${m.type === "IN" ? "text-success" : "text-info"}`}>
                        {m.type === "IN" ? "+" : "-"}{m.quantity} {m.item?.unit?.name || "Unit"}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-medium mt-0.5">{formatDateTime(m.createdAt)}</div>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:bg-muted hover:text-primary border border-transparent hover:border-border" 
                          onClick={() => handleEditMovement(m)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive border border-transparent hover:border-destructive/20" 
                          onClick={() => { setMovementToDelete(m); setIsDeleteMovementDialogOpen(true); }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {movements.length === 0 && (
              <div className="text-center py-12 text-sm text-muted-foreground italic pl-[2px]">
                Belum ada riwayat pergerakan stok untuk rentang tanggal terpilih.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog for Item Specific History Log */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>Riwayat Stok</span>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border/80 font-normal">{selectedHistoryItem?.sku}</span>
            </DialogTitle>
            <DialogDescription className="font-medium text-foreground">
              {selectedHistoryItem?.name} <span className="text-muted-foreground font-normal">| Stok Saat Ini:</span> <span className="font-semibold text-primary">{selectedHistoryItem?.stock} {selectedHistoryItem?.unit?.name || "Unit"}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="relative pl-6 before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-[2px] before:bg-border/60 space-y-3 max-h-[50vh] overflow-y-auto pr-2 scrollbar-thin mt-2">
            {selectedHistoryItem && movements.filter(m => m.itemId === selectedHistoryItem.id).length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground italic pl-[2px]">
                Belum ada riwayat pergerakan untuk barang ini
              </div>
            ) : (
              movements.filter(m => m.itemId === selectedHistoryItem?.id).map(m => (
                <div key={m.id} className="relative flex items-center justify-between p-3 rounded-xl border border-border/50 bg-card/50 text-xs hover:bg-muted/30 transition-colors">
                  <div className={`absolute -left-[27px] top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center border-4 border-background ${
                    m.type === "IN" ? "bg-success text-success-foreground" : "bg-info text-info-foreground"
                  }`}>
                    {m.type === "IN" ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}
                  </div>

                  <div className="space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <span className={m.type === "IN" ? "text-success" : "text-info"}>
                        Stok {m.type === "IN" ? "Masuk" : "Keluar"} ({m.quantity} {selectedHistoryItem?.unit?.name || "Unit"})
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {m.note || <span className="italic text-muted-foreground/60">Tanpa catatan</span>}
                      <span className="mx-1.5 text-border">•</span>
                      <span className="font-medium text-foreground">{m.actor?.name}</span>
                    </div>
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
                        className="text-[9px] font-semibold text-primary hover:underline mt-0.5 inline-flex items-center gap-1"
                      >
                        <FileImage className="h-2.5 w-2.5" /> Lihat Bukti
                      </button>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-medium">{formatDateTime(m.createdAt)}</div>
                </div>
              ))
            )}
          </div>
          <DialogFooter className="mt-4 border-t border-border/50 pt-3">
            <Button size="sm" variant="outline" className="border-border/60" onClick={() => setIsHistoryDialogOpen(false)}>Tutup</Button>
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
