import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Coins, ArrowDown, ArrowUp, Plus, TrendingUp, FileText, Upload, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { formatRupiah, formatDate } from "@/utils/format";
import { apiClient } from "@/services/apiClient";
import { useAuth } from "@/stores/authStore";
import { toast } from "sonner";
import { ImagePreviewModal } from "@/components/ImagePreviewModal";

export default function PettyCash() {
  const { user } = useAuth();
  const isAdmin = user?.role?.toLowerCase() === "admin";

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [txType, setTxType] = useState<"IN" | "OUT" | string>("OUT");
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>("");
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [existingReceiptUrl, setExistingReceiptUrl] = useState<string>("");

  const [previewUrl, setPreviewUrl] = useState("");
  const [previewDetails, setPreviewDetails] = useState<any[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [txToDelete, setTxToDelete] = useState<any>(null);

  async function loadPettyCash(silent = false) {
    try {
      if (!silent) setLoading(true);
      const [res, cats, depts, usrs] = await Promise.all([
        apiClient.pettyCash.get(),
        apiClient.meta.categories().catch(() => []),
        apiClient.meta.departments().catch(() => []),
        apiClient.users.list().catch(() => [])
      ]);
      setData(res);
      setCategories(cats);
      setDepartments(depts);
      setUsers(usrs);
    } catch (err: any) {
      if (!silent) toast.error("Gagal memuat saldo petty cash: " + err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    loadPettyCash();

    const interval = setInterval(() => {
      loadPettyCash(true);
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const handleDeleteTx = async () => {
    if (!txToDelete) return;
    try {
      await apiClient.pettyCash.delete(txToDelete.id);
      toast.success("Transaksi berhasil dihapus");
      setTxToDelete(null);
      setIsDeleteDialogOpen(false);
      loadPettyCash();
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus transaksi");
    }
  };

  const handleCreateTransaction = async () => {
    const amtNum = parseFloat(amount);
    if (isNaN(amtNum) || amtNum <= 0) {
      toast.error("Masukkan nominal transaksi yang valid");
      return;
    }

    setIsSubmitting(true);
    try {
      let receiptUrl = existingReceiptUrl;
      if (file) {
        const uploadRes = await apiClient.upload(file);
        if (uploadRes && uploadRes.file && uploadRes.file.url) {
          receiptUrl = uploadRes.file.url;
        }
      }

      let finalDesc = desc;
      let prefix = "";
      if (txType === "OUT" && selectedCategory) {
        prefix = `[${selectedCategory}] `;
      }
      let suffixes = [];
      if (txType === "OUT" && selectedDept) {
        suffixes.push(`Dept: ${selectedDept}`);
      }
      if (txType === "OUT" && selectedUser) {
        suffixes.push(`Person: ${selectedUser}`);
      }
      if (receiptUrl) {
        suffixes.push(`Receipt: ${receiptUrl}`);
      }
      const suffixStr = suffixes.length > 0 ? ` | ${suffixes.join(" | ")}` : "";
      finalDesc = `${prefix}${desc}${suffixStr}`;

      if (editingTxId) {
        await apiClient.pettyCash.update(editingTxId, amtNum, finalDesc, txType, date);
        toast.success("Transaksi kas kecil berhasil diperbarui");
      } else {
        await apiClient.pettyCash.topUp(amtNum, finalDesc, txType, date);
        toast.success("Transaksi kas kecil berhasil disimpan");
      }
      setAmount("");
      setDesc("");
      setDate(new Date().toISOString().split("T")[0]);
      setSelectedCategory("");
      setSelectedDept("");
      setSelectedUser("");
      setFile(null);
      setEditingTxId(null);
      setExistingReceiptUrl("");
      setIsOpen(false);
      loadPettyCash();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan transaksi");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (t: any) => {
    let category = "";
    let receiptUrl = "";
    let department = "";
    let person = "";
    let cleanDesc = t.description || "";

    const catMatch = cleanDesc.match(/^\[(.*?)\]\s*(.*)$/);
    if (catMatch) {
      category = catMatch[1];
      cleanDesc = catMatch[2];
    }

    const parts = cleanDesc.split(" | ");
    cleanDesc = parts[0] || "";

    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      if (part.startsWith("Dept: ")) {
        department = part.replace("Dept: ", "");
      } else if (part.startsWith("Person: ")) {
        person = part.replace("Person: ", "");
      } else if (part.startsWith("Receipt: ")) {
        receiptUrl = part.replace("Receipt: ", "");
      }
    }

    setEditingTxId(t.id);
    setAmount(String(t.amount));
    setTxType(t.type);
    setDesc(cleanDesc);
    setSelectedCategory(category);
    setSelectedDept(department);
    setSelectedUser(person);
    setExistingReceiptUrl(receiptUrl);
    setFile(null);
    setDate(new Date(t.date || t.createdAt).toISOString().split("T")[0]);
    setIsOpen(true);
  };

  if (loading || !data) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-2">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">Memuat data petty cash...</p>
      </div>
    );
  }

  const { initial, balance, transactions } = data;
  const usagePct = initial > 0 ? Math.round((balance / initial) * 100) : 0;
  
  const cashIn = transactions.filter(t => t.type === "IN").reduce((acc, t) => acc + Number(t.amount), 0);
  const cashOut = transactions.filter(t => t.type === "OUT").reduce((acc, t) => acc + Number(t.amount), 0);

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Petty Cash</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Kelola kas kecil operasional</p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gradient-primary text-primary-foreground" onClick={() => {
              setEditingTxId(null);
              setExistingReceiptUrl("");
              setAmount("");
              setDesc("");
              setTxType("OUT");
              setDate(new Date().toISOString().split("T")[0]);
              setSelectedCategory("");
              setSelectedDept("");
              setSelectedUser("");
              setFile(null);
            }}>
              <Plus className="h-4 w-4 mr-1.5" />Transaksi
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTxId ? "Edit Transaksi Manual" : "Catat Transaksi Manual"}</DialogTitle>
              <DialogDescription>
                {editingTxId ? "Ubah data nominal, deskripsi, kategori, departemen, atau bukti transaksi manual ini." : "Catat pengeluaran langsung atau pengembalian sisa dana ke kas kecil."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="txType">Tipe Transaksi</Label>
                <Select value={txType} onValueChange={setTxType}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OUT">Pengeluaran Operasional (OUT)</SelectItem>
                    <SelectItem value="IN">Pengembalian Sisa Dana (IN)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="date">Tanggal Transaksi</Label>
                <Input 
                  id="date" 
                  type="date" 
                  className="mt-1.5"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="amount">Nominal Transaksi (Rp)</Label>
                <Input 
                  id="amount" 
                  type="text" 
                  inputMode="numeric"
                  placeholder="Contoh: 50.000" 
                  value={amount ? Number(amount.replace(/\D/g, "")).toLocaleString("id-ID") : ""} 
                  onChange={e => setAmount(e.target.value.replace(/\D/g, ""))} 
                  className="mt-1.5"
                />
              </div>
              {txType === "OUT" && (
                <>
                  <div>
                    <Label htmlFor="category">Kategori Pengeluaran</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Pilih kategori..." />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(c => (
                          <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="department">Departemen (Opsional)</Label>
                    <Select value={selectedDept} onValueChange={setSelectedDept}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Pilih departemen..." />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map(d => (
                          <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="user">Penanggung Jawab (Opsional)</Label>
                    <Select value={selectedUser} onValueChange={setSelectedUser}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Pilih penanggung jawab..." />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map(u => (
                          <SelectItem key={u.id} value={u.name || u.username}>{u.name || u.username}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              <div>
                <Label htmlFor="desc">Keterangan</Label>
                <Input 
                  id="desc" 
                  type="text" 
                  placeholder="Contoh: Beli meteran, pengembalian sisa bensin..." 
                  value={desc} 
                  onChange={e => setDesc(e.target.value)} 
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="receipt">Bukti Transaksi (Opsional)</Label>
                <Input 
                  id="receipt" 
                  type="file" 
                  accept="image/*,.pdf" 
                  onChange={e => {
                    if (e.target.files && e.target.files.length > 0) {
                      setFile(e.target.files[0]);
                    } else {
                      setFile(null);
                    }
                  }} 
                  className="mt-1.5 cursor-pointer file:text-primary file:font-semibold"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateTransaction} className="gradient-primary text-primary-foreground" disabled={isSubmitting}>
                {isSubmitting ? "Memproses..." : "Simpan Transaksi"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border border-primary/20 bg-gradient-to-br from-primary via-primary to-primary-glow text-primary-foreground shadow-glow overflow-hidden relative rounded-2xl">
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
        <CardContent className="p-6 relative">
          <div className="flex items-center gap-2 mb-2 opacity-80">
            <Coins className="h-4 w-4" />
            <span className="text-xs uppercase tracking-wider font-semibold">Saldo Petty Cash</span>
          </div>
          <div className="text-3xl lg:text-4xl font-black tracking-tight">{formatRupiah(balance)}</div>
          <div className="text-xs opacity-80 mt-2 font-medium">dari saldo awal {formatRupiah(initial)}</div>
          <div className="mt-4 h-2 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, usagePct))}%` }} />
          </div>
          <div className="flex justify-between text-[11px] opacity-90 mt-2 font-semibold">
            <span>Tersedia {usagePct}%</span>
            <span>Terpakai {100 - usagePct}%</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-border/60 bg-card/50 backdrop-blur-md shadow-elegant hover:-translate-y-0.5 transition-all duration-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-success/15 text-success border border-success/20 flex items-center justify-center shadow-sm">
              <ArrowDown className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Cash In</div>
              <div className="text-lg font-bold text-success mt-0.5">{formatRupiah(cashIn)}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card/50 backdrop-blur-md shadow-elegant hover:-translate-y-0.5 transition-all duration-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-destructive/15 text-destructive border border-destructive/20 flex items-center justify-center shadow-sm">
              <ArrowUp className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Cash Out</div>
              <div className="text-lg font-bold text-destructive mt-0.5">{formatRupiah(cashOut)}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card/50 backdrop-blur-md shadow-elegant hover:-translate-y-0.5 transition-all duration-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-info/15 text-info border border-info/20 flex items-center justify-center shadow-sm">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Transaksi</div>
              <div className="text-lg font-bold text-foreground mt-0.5">{transactions.length}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border/60 bg-card/40 backdrop-blur-md shadow-elegant rounded-xl">
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="text-base font-bold tracking-tight">Riwayat Transaksi Kas Kecil</CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-3.5">
          {transactions.map(t => {
            let category: string | null = null;
            let receiptUrl: string | null = null;
            let department: string | null = null;
            let person: string | null = null;
            let cleanDesc = t.description || "";

            const catMatch = cleanDesc.match(/^\[(.*?)\]\s*(.*)$/);
            if (catMatch) {
              category = catMatch[1];
              cleanDesc = catMatch[2];
            }

            const parts = cleanDesc.split(" | ");
            cleanDesc = parts[0] || "";

            for (let i = 1; i < parts.length; i++) {
              const part = parts[i];
              if (part.startsWith("Dept: ")) {
                department = part.replace("Dept: ", "");
              } else if (part.startsWith("Person: ")) {
                person = part.replace("Person: ", "");
              } else if (part.startsWith("Receipt: ")) {
                receiptUrl = part.replace("Receipt: ", "");
              }
            }

            const displayDept = department || t.request?.department;
            const displayPerson = person || t.request?.requester;

            return (
              <div key={t.id} className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border/50 bg-card/60 hover:bg-muted/30 transition-all duration-150 group">
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm border ${
                    t.type === "IN" 
                      ? "bg-success/10 text-success border-success/20" 
                      : "bg-destructive/10 text-destructive border-destructive/20"
                  }`}>
                    {t.type === "IN" ? <ArrowDown className="h-4 w-4 stroke-[2.5]" /> : <ArrowUp className="h-4 w-4 stroke-[2.5]" />}
                  </div>
                  
                  <div className="min-w-0 space-y-1">
                    <div className="text-sm font-bold tracking-tight text-foreground flex items-center gap-1.5 flex-wrap">
                      {category && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary border border-primary/20 font-bold">
                          {category}
                        </span>
                      )}
                      <span>{cleanDesc}</span>
                      {receiptUrl && (
                        <button 
                          onClick={() => {
                            if (receiptUrl.toLowerCase().endsWith(".pdf")) {
                              window.open(receiptUrl, "_blank");
                            } else {
                              setPreviewUrl(receiptUrl);
                              setPreviewDetails([
                                { label: "Jenis Transaksi", value: t.type === "IN" ? "Kas Masuk" : "Kas Keluar" },
                                { label: "Tanggal", value: formatDate(t.date || t.createdAt) },
                                { label: "Keterangan", value: cleanDesc },
                                { label: "Nominal", value: formatRupiah(Number(t.amount)) },
                                { label: "Departemen", value: displayDept || "-" },
                                { label: "Penanggung Jawab", value: displayPerson || "-" },
                              ]);
                              setIsPreviewOpen(true);
                            }
                          }}
                          className="inline-flex items-center gap-1 text-[10px] text-primary hover:text-primary-glow font-bold bg-primary/5 border border-primary/20 px-1.5 py-0.5 rounded transition-colors"
                        >
                          <FileText className="h-3 w-3" />
                          Nota
                        </button>
                      )}
                    </div>
                    
                    <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-x-1.5 gap-y-1 font-medium">
                      <span>{formatDate(t.date || t.createdAt)}</span>
                      {displayDept && (
                        <>
                          <span className="text-border">•</span>
                          <span className="font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded text-[10px]">{displayDept}</span>
                        </>
                      )}
                      {displayPerson && (
                        <>
                          <span className="text-border">•</span>
                          <span>Oleh: <strong className="text-foreground font-semibold">{displayPerson}</strong></span>
                        </>
                      )}
                      {t.refRequestId && t.refRequestId !== "-" && (
                        <>
                          <span className="text-border">•</span>
                          <span className="font-mono bg-muted border border-border/80 px-1.5 py-0.2 rounded text-[10px]">Ref: {t.refRequestId}</span>
                        </>
                      )}
                      {t.request && (
                        <>
                          <span className="text-border">•</span>
                          <Link to={`/requests/${t.request.id}`} className="text-primary hover:underline font-bold">
                            Detail Pengajuan →
                          </Link>
                        </>
                      )}
                    </div>
                    
                    {t.request && t.request.items && t.request.items.length > 0 && (
                      <div className="mt-1.5 text-[11px] text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-border/40 max-w-xl italic">
                        <span className="font-semibold text-foreground not-italic">Rincian:</span>{" "}
                        {t.request.items.map((it: any) => `${it.name} (${it.qty} ${it.unit || 'unit'} @ ${formatRupiah(it.price)})`).join(", ")}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between sm:justify-end gap-3.5 pl-12 sm:pl-0 border-t border-dashed border-border/50 sm:border-none pt-2.5 sm:pt-0">
                  <div className={`font-black text-base tracking-tight whitespace-nowrap ${t.type === "IN" ? "text-success" : "text-destructive"}`}>
                    {t.type === "IN" ? "+" : "-"}{formatRupiah(Number(t.amount))}
                  </div>
                  
                  {(!t.refRequestId || t.refRequestId === "-") && (
                    <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent hover:border-border"
                        onClick={() => handleEditClick(t)}
                        title="Edit Transaksi"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {isAdmin && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive border border-transparent hover:border-destructive/20"
                          onClick={() => { setTxToDelete(t); setIsDeleteDialogOpen(true); }}
                          title="Hapus Transaksi"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {transactions.length === 0 && <div className="text-center py-12 text-sm text-muted-foreground italic">Belum ada riwayat transaksi kas kecil</div>}
        </CardContent>
      </Card>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Ini akan menghapus transaksi ini dari riwayat kas kecil.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTx} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ImagePreviewModal 
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        imageUrl={previewUrl}
        title="Bukti Transaksi"
        details={previewDetails}
      />
    </div>
  );
}
