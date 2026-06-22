import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Coins, ArrowDown, ArrowUp, Plus, TrendingUp, FileText, Upload, Pencil } from "lucide-react";
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
import { formatRupiah, formatDate } from "@/utils/format";
import { apiClient } from "@/services/apiClient";
import { toast } from "sonner";

export default function PettyCash() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [txType, setTxType] = useState<"IN" | "OUT" | string>("OUT");
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

  async function loadPettyCash() {
    try {
      setLoading(true);
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
      toast.error("Gagal memuat saldo petty cash: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPettyCash();
  }, []);

  const handleCreateTransaction = async () => {
    const amtNum = parseFloat(amount);
    if (isNaN(amtNum) || amtNum <= 0) {
      toast.error("Masukkan nominal transaksi yang valid");
      return;
    }

    setIsSubmitting(true);
    try {
      let receiptUrl = existingReceiptUrl;
      if (txType === "OUT" && file) {
        const uploadRes = await apiClient.upload(file);
        if (uploadRes && uploadRes.file && uploadRes.file.url) {
          receiptUrl = uploadRes.file.url;
        }
      }

      let finalDesc = desc;
      if (txType === "OUT") {
        let prefix = "";
        if (selectedCategory) {
          prefix = `[${selectedCategory}] `;
        }
        let suffixes = [];
        if (selectedDept) {
          suffixes.push(`Dept: ${selectedDept}`);
        }
        if (selectedUser) {
          suffixes.push(`Person: ${selectedUser}`);
        }
        if (receiptUrl) {
          suffixes.push(`Receipt: ${receiptUrl}`);
        }
        const suffixStr = suffixes.length > 0 ? ` | ${suffixes.join(" | ")}` : "";
        finalDesc = `${prefix}${desc}${suffixStr}`;
      }

      if (editingTxId) {
        await apiClient.pettyCash.update(editingTxId, amtNum, finalDesc, txType);
        toast.success("Transaksi kas kecil berhasil diperbarui");
      } else {
        await apiClient.pettyCash.topUp(amtNum, finalDesc, txType);
        toast.success("Transaksi kas kecil berhasil disimpan");
      }
      setAmount("");
      setDesc("");
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
                <Label htmlFor="amount">Nominal Transaksi (Rp)</Label>
                <Input 
                  id="amount" 
                  type="number" 
                  placeholder="Contoh: 50000" 
                  value={amount} 
                  onChange={e => setAmount(e.target.value)} 
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
              {txType === "OUT" && (
                <div>
                  <Label htmlFor="receipt">Bukti Nota / Invoice (Opsional)</Label>
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
              )}
            </div>
            <DialogFooter>
              <Button onClick={handleCreateTransaction} className="gradient-primary text-primary-foreground" disabled={isSubmitting}>
                {isSubmitting ? "Memproses..." : "Simpan Transaksi"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-elegant gradient-primary text-primary-foreground border-0 overflow-hidden relative">
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
        <CardContent className="p-6 relative">
          <div className="flex items-center gap-2 mb-2 opacity-80">
            <Coins className="h-4 w-4" />
            <span className="text-xs uppercase tracking-wider">Saldo Petty Cash</span>
          </div>
          <div className="text-3xl lg:text-4xl font-bold tracking-tight">{formatRupiah(balance)}</div>
          <div className="text-xs opacity-80 mt-2">dari awal {formatRupiah(initial)}</div>
          <div className="mt-4 h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(0, usagePct))}%` }} />
          </div>
          <div className="flex justify-between text-[11px] opacity-80 mt-1.5">
            <span>Tersedia {usagePct}%</span>
            <span>Terpakai {100 - usagePct}%</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Card className="shadow-elegant"><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1 text-success">
            <ArrowDown className="h-3.5 w-3.5" />
            <span className="text-[10px] uppercase tracking-wider">Cash In</span>
          </div>
          <div className="text-lg font-bold">{formatRupiah(cashIn)}</div>
        </CardContent></Card>
        <Card className="shadow-elegant"><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1 text-destructive">
            <ArrowUp className="h-3.5 w-3.5" />
            <span className="text-[10px] uppercase tracking-wider">Cash Out</span>
          </div>
          <div className="text-lg font-bold">{formatRupiah(cashOut)}</div>
        </CardContent></Card>
        <Card className="shadow-elegant"><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1 text-info">
            <TrendingUp className="h-3.5 w-3.5" />
            <span className="text-[10px] uppercase tracking-wider">Transaksi</span>
          </div>
          <div className="text-lg font-bold">{transactions.length}</div>
        </CardContent></Card>
      </div>

      <Card className="shadow-elegant">
        <CardHeader><CardTitle className="text-base">Riwayat Transaksi</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {transactions.map(t => (
            <div key={t.id} className="flex items-center justify-between p-3 rounded-md border border-border">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0 ${t.type === "IN" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                  {t.type === "IN" ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium flex items-center gap-1.5 flex-wrap">
                    {(() => {
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
                        <>
                          {category && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary font-medium">
                              {category}
                            </span>
                          )}
                          <span>{cleanDesc}</span>
                          {receiptUrl && (
                            <a 
                              href={receiptUrl} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline ml-1.5 font-medium bg-primary/5 px-1.5 py-0.5 rounded"
                            >
                              <FileText className="h-3 w-3" />
                              Nota
                            </a>
                          )}
                        </>
                      );
                    })()}
                  </div>
                  <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-x-1.5 mt-0.5">
                    <span>{formatDate(t.createdAt)}</span>
                    {(() => {
                      let department: string | null = null;
                      let person: string | null = null;
                      const parts = (t.description || "").split(" | ");
                      for (let i = 1; i < parts.length; i++) {
                        const part = parts[i];
                        if (part.startsWith("Dept: ")) {
                          department = part.replace("Dept: ", "");
                        } else if (part.startsWith("Person: ")) {
                          person = part.replace("Person: ", "");
                        }
                      }
                      const displayDept = department || t.request?.department;
                      const displayPerson = person || t.request?.requester;

                      return (
                        <>
                          {displayDept && (
                            <>
                              <span>•</span>
                              <span className="font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded text-[10px]">{displayDept}</span>
                            </>
                          )}
                          {displayPerson && (
                            <>
                              <span>•</span>
                              <span className="text-muted-foreground">Oleh: <strong className="text-foreground">{displayPerson}</strong></span>
                            </>
                          )}
                        </>
                      );
                    })()}
                    {t.refRequestId && t.refRequestId !== "-" && (
                      <>
                        <span>•</span>
                        <span>Ref: {t.refRequestId}</span>
                      </>
                    )}
                    {t.request && (
                      <>
                        <span>•</span>
                        <Link to={`/requests/${t.request.id}`} className="text-primary hover:underline font-semibold">
                          Detail Pengajuan →
                        </Link>
                      </>
                    )}
                  </div>
                  {t.request && t.request.items && t.request.items.length > 0 && (
                    <div className="mt-1.5 text-[11px] text-muted-foreground bg-muted/40 p-2 rounded border border-border/40 max-w-xl">
                      <span className="font-semibold text-foreground">Detail Pengeluaran:</span>{" "}
                      {t.request.items.map((it: any) => `${it.name} (${it.qty} ${it.unit || 'unit'} @ ${formatRupiah(it.price)})`).join(", ")}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className={`font-semibold text-sm ${t.type === "IN" ? "text-success" : "text-destructive"}`}>
                  {t.type === "IN" ? "+" : "-"}{formatRupiah(Number(t.amount))}
                </div>
                {(!t.refRequestId || t.refRequestId === "-") && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted"
                    onClick={() => handleEditClick(t)}
                    title="Edit Transaksi"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
          {transactions.length === 0 && <div className="text-center py-8 text-sm text-muted-foreground">Belum ada riwayat transaksi kas kecil</div>}
        </CardContent>
      </Card>
    </div>
  );
}
