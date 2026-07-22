import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Coins, ArrowDown, ArrowUp, Plus, TrendingUp, FileText, Upload, Pencil, Trash2, Search, ArrowUpDown, Camera, X } from "lucide-react";
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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";

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
  const [isDragging, setIsDragging] = useState(false);

  // Camera states
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
      setIsCameraOpen(true);
    } catch (err) {
      toast.error("Gagal mengakses kamera. Pastikan Anda telah memberikan izin.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const takePhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const newFile = new File([blob], `receipt-${Date.now()}.jpg`, { type: 'image/jpeg' });
            setFile(newFile);
            stopCamera();
            toast.success("Foto berhasil diambil!");
          }
        }, 'image/jpeg', 0.8);
      }
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
    }
  }, [isOpen]);

  const [previewUrl, setPreviewUrl] = useState("");
  const [previewDetails, setPreviewDetails] = useState<any[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [txToDelete, setTxToDelete] = useState<any>(null);

  const currentYear = new Date().getFullYear();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState(`${currentYear}-12-31`);

  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" }>({ key: "date", direction: "desc" });

  const requestSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown className="h-3 w-3 ml-1 inline opacity-30" />;
    return sortConfig.direction === "asc" ? <ArrowUp className="h-3 w-3 ml-1 inline" /> : <ArrowDown className="h-3 w-3 ml-1 inline" />;
  };

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

    if (t.type === "OUT") {
      const catMatch = cleanDesc.match(/^\[(.*?)\]\s*(.*)$/);
      if (catMatch) {
        category = catMatch[1];
        cleanDesc = catMatch[2];
      }
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



  // Filter transactions dynamically
  const filteredTransactions = (transactions || []).filter((t: any) => {
    let category = "";
    let person = "";
    let cleanDesc = t.description || "";

    if (t.type === "OUT") {
      const catMatch = cleanDesc.match(/^\[(.*?)\]\s*(.*)$/);
      if (catMatch) {
        category = catMatch[1];
        cleanDesc = catMatch[2];
      }
    }

    const parts = cleanDesc.split(" | ");
    cleanDesc = parts[0] || "";

    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      if (part.startsWith("Person: ")) {
        person = part.replace("Person: ", "");
      }
    }

    const displayPerson = person || t.request?.requester || "";

    const matchesSearch = 
      displayPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cleanDesc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.refRequestId || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = filterCategory === "all" || category.toLowerCase() === filterCategory.toLowerCase();

    const txDateStr = (t.date || t.createdAt).split("T")[0];
    const matchesDate = (!startDate || txDateStr >= startDate) && (!endDate || txDateStr <= endDate);

    return matchesSearch && matchesCategory && matchesDate;
  });

  // Sort transactions dynamically
  const sortedTransactions = [...filteredTransactions].sort((a: any, b: any) => {
    let valA: any = "";
    let valB: any = "";

    // Parse category, person, and description for sorting
    const getDetails = (t: any) => {
      let category = "";
      let person = "";
      let cleanDesc = t.description || "";

      if (t.type === "OUT") {
        const catMatch = cleanDesc.match(/^\[(.*?)\]\s*(.*)$/);
        if (catMatch) {
          category = catMatch[1];
          cleanDesc = catMatch[2];
        }
      }

      const parts = cleanDesc.split(" | ");
      cleanDesc = parts[0] || "";

      for (let i = 1; i < parts.length; i++) {
        const part = parts[i];
        if (part.startsWith("Person: ")) {
          person = part.replace("Person: ", "");
        }
      }

      const displayPerson = person || t.request?.requester || "";

      return { category, cleanDesc, displayPerson };
    };

    if (sortConfig.key === "date") {
      valA = new Date(a.date || a.createdAt).getTime();
      valB = new Date(b.date || b.createdAt).getTime();
    } else if (sortConfig.key === "type") {
      valA = a.type || "";
      valB = b.type || "";
    } else if (sortConfig.key === "category") {
      valA = getDetails(a).category;
      valB = getDetails(b).category;
    } else if (sortConfig.key === "description") {
      valA = getDetails(a).cleanDesc;
      valB = getDetails(b).cleanDesc;
    } else if (sortConfig.key === "person") {
      valA = getDetails(a).displayPerson;
      valB = getDetails(b).displayPerson;
    } else if (sortConfig.key === "amount") {
      valA = Number(a.amount);
      valB = Number(b.amount);
    }

    if (typeof valA === "string" && typeof valB === "string") {
      return sortConfig.direction === "asc" 
        ? valA.localeCompare(valB) 
        : valB.localeCompare(valA);
    }
    
    return sortConfig.direction === "asc" ? valA - valB : valB - valA;
  });

  const renderMobileCards = () => {
    return (
      <div className="md:hidden space-y-2 mt-4">
        {sortedTransactions.map((t) => {
          let category: string | null = null;
          let receiptUrl: string | null = null;
          let department: string | null = null;
          let person: string | null = null;
          let cleanDesc = t.description || "";

          if (t.type === "OUT") {
            const catMatch = cleanDesc.match(/^\[(.*?)\]\s*(.*)$/);
            if (catMatch) {
              category = catMatch[1];
              cleanDesc = catMatch[2];
            }
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
            <Card key={t.id} className="shadow-sm border border-border/80 bg-card/60">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider ${
                      t.type === "IN" 
                        ? "bg-success/10 text-success border border-success/20" 
                        : "bg-destructive/10 text-destructive border border-destructive/20"
                    }`}>
                      {t.type === "IN" ? "IN" : "OUT"}
                    </span>
                    {category && (
                      <span className="px-2 py-0.5 rounded text-[9px] bg-primary/10 text-primary border border-primary/20 font-extrabold uppercase">
                        {category}
                      </span>
                    )}
                    {displayDept && (
                      <span className="font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded text-[8px] uppercase border border-primary/20">
                        {displayDept}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className={`font-black text-sm tracking-tight ${t.type === "IN" ? "text-success" : "text-destructive"}`}>
                      {t.type === "IN" ? "+" : "-"}{formatRupiah(Number(t.amount))}
                    </span>
                  </div>
                </div>

                <div className="font-semibold text-xs text-foreground mb-1 line-clamp-2">{cleanDesc}</div>

                {t.request && t.request.items && t.request.items.length > 0 && (
                  <div className="text-[10px] text-muted-foreground bg-muted/40 p-2 rounded border border-border/20 italic mt-2 mb-1.5 line-clamp-2">
                    <span className="font-semibold text-foreground not-italic">Rincian:</span>{" "}
                    {t.request.items.map((it: any) => `${it.name} (${it.qty} ${it.unit || 'unit'})`).join(", ")}
                  </div>
                )}

                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border/50 text-[10px] text-muted-foreground">
                  <div>
                    <span className="font-medium">PJ:</span> {displayPerson || "-"} • {formatDate(t.date || t.createdAt)}
                  </div>
                  <div className="flex items-center gap-1">
                    {t.refRequestId && t.refRequestId !== "-" && (
                      <span className="font-mono bg-muted border border-border/80 px-1.5 py-0.2 rounded text-[8px]">Ref: {t.refRequestId}</span>
                    )}
                    {t.request && (
                      <Link to={`/requests/${t.request.id}`} className="text-primary hover:underline font-bold">
                        Detail →
                      </Link>
                    )}
                    {receiptUrl && (
                      <Button 
                        size="icon" 
                        variant="ghost"
                        className="h-6 w-6 text-primary hover:bg-primary/10"
                        onClick={() => {
                          if (receiptUrl.toLowerCase().endsWith(".pdf")) {
                            window.open(receiptUrl, "_blank");
                          } else {
                            setPreviewUrl(receiptUrl);
                            setPreviewDetails([
                              { label: "Jenis", value: t.type === "IN" ? "Kas Masuk" : "Kas Keluar" },
                              { label: "Tanggal", value: formatDate(t.date || t.createdAt) },
                              { label: "Keterangan", value: cleanDesc },
                              { label: "Nominal", value: formatRupiah(Number(t.amount)) },
                              { label: "Departemen", value: displayDept || "-" },
                              { label: "Penanggung Jawab", value: displayPerson || "-" },
                            ]);
                            setIsPreviewOpen(true);
                          }
                        }}
                      >
                        <FileText className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {(!t.refRequestId || t.refRequestId === "-") && (
                      <div className="flex items-center gap-0.5 border-l border-border/80 pl-1 ml-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-muted-foreground"
                          onClick={() => handleEditClick(t)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        {isAdmin && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-destructive"
                            onClick={() => { setTxToDelete(t); setIsDeleteDialogOpen(true); }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {sortedTransactions.length === 0 && (
          <div className="p-8 text-center text-xs text-muted-foreground italic bg-card/30 rounded-lg border border-dashed border-border">
            Tidak ada transaksi kas kecil yang cocok dengan filter
          </div>
        )}
      </div>
    );
  };

  const cashIn = filteredTransactions.filter(t => t.type === "IN").reduce((acc, t) => acc + Number(t.amount), 0);
  const cashOut = filteredTransactions.filter(t => t.type === "OUT").reduce((acc, t) => acc + Number(t.amount), 0);

  // Group filtered transactions by month (YYYY-MM)
  const monthlySummaries = Object.values(
    filteredTransactions.reduce((acc: any, t: any) => {
      const date = new Date(t.date || t.createdAt);
      const year = date.getFullYear();
      const month = date.getMonth(); // 0-11
      const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
      const monthName = date.toLocaleDateString("id-ID", { month: "long", year: "numeric" });

      if (!acc[monthKey]) {
        acc[monthKey] = {
          key: monthKey,
          name: monthName,
          in: 0,
          out: 0,
        };
      }

      const amt = Number(t.amount);
      if (t.type === "IN") {
        acc[monthKey].in += amt;
      } else {
        acc[monthKey].out += amt;
      }

      return acc;
    }, {})
  ).sort((a: any, b: any) => b.key.localeCompare(a.key)) as any[];

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
          <DialogContent 
            className="overflow-hidden"
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                setFile(e.dataTransfer.files[0]);
                toast.success(`File ${e.dataTransfer.files[0].name} dipilih`);
              }
            }}
          >
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
                <Label>Bukti Transaksi (Opsional)</Label>
                <div 
                  className="mt-1.5 border-2 border-dashed border-border hover:border-primary/50 bg-background/50 rounded-md p-4 flex flex-col items-center justify-center transition-colors cursor-pointer"
                  onClick={() => document.getElementById("receipt-upload")?.click()}
                >
                  <input 
                    id="receipt-upload" 
                    type="file" 
                    accept="image/*,.pdf" 
                    className="hidden"
                    onChange={e => {
                      if (e.target.files && e.target.files.length > 0) {
                        setFile(e.target.files[0]);
                      }
                    }} 
                  />
                  {file ? (
                    <div className="flex items-center gap-3 w-full max-w-full">
                      <FileText className="h-8 w-8 text-primary shrink-0" />
                      <div className="flex-1 truncate">
                        <p className="text-sm font-semibold truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive h-8 w-8 shrink-0 hover:bg-destructive/10" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                          const input = document.getElementById("receipt-upload") as HTMLInputElement;
                          if (input) input.value = "";
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : existingReceiptUrl ? (
                    <div className="text-center w-full">
                      <p className="text-sm font-medium text-foreground">File sebelumnya telah tersimpan</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Klik atau drop file baru untuk mengganti</p>
                    </div>
                  ) : isCameraOpen ? (
                    <div className="w-full flex flex-col items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <div className="relative w-full max-w-[200px] rounded-md overflow-hidden bg-black aspect-[3/4] sm:aspect-video flex items-center justify-center">
                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                        <canvas ref={canvasRef} className="hidden" />
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Button type="button" size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); stopCamera(); }}>
                          <X className="h-4 w-4 mr-1" /> Batal
                        </Button>
                        <Button type="button" size="sm" className="gradient-primary text-primary-foreground" onClick={takePhoto}>
                          <Camera className="h-4 w-4 mr-1" /> Ambil Foto
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center w-full flex flex-col items-center">
                      <Upload className="mx-auto h-6 w-6 text-muted-foreground mb-2 pointer-events-none" />
                      <p className="text-sm font-medium text-foreground pointer-events-none">Klik atau drag & drop file ke sini</p>
                      <p className="text-xs text-muted-foreground mt-0.5 mb-3 pointer-events-none">Atau drop langsung di mana saja pada popup ini</p>
                      <Button type="button" size="sm" variant="secondary" onClick={startCamera}>
                        <Camera className="h-4 w-4 mr-1.5" /> Buka Kamera
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateTransaction} className="gradient-primary text-primary-foreground" disabled={isSubmitting}>
                {isSubmitting ? "Memproses..." : "Simpan Transaksi"}
              </Button>
            </DialogFooter>
            {isDragging && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm border-2 border-dashed border-primary m-1 rounded-lg pointer-events-none">
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-primary animate-bounce mb-2" />
                  <p className="font-bold text-primary text-lg">Lepaskan File di Sini</p>
                  <p className="text-sm text-muted-foreground mt-1">File akan dijadikan bukti transaksi</p>
                </div>
              </div>
            )}
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
              <div className="text-lg font-bold text-foreground mt-0.5">{filteredTransactions.length}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border/60 bg-card/50 backdrop-blur-md shadow-elegant rounded-xl">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Cari penanggung jawab atau keterangan..." 
                className="pl-9 bg-background/50 border-border/80 focus:border-primary/50" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[160px] bg-background/50 border-border/80">
                  <SelectValue placeholder="Semua Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium">Dari</span>
                <Input 
                  type="date" 
                  className="bg-background/50 border-border/80 w-[140px] px-2" 
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium">Sampai</span>
                <Input 
                  type="date" 
                  className="bg-background/50 border-border/80 w-[140px] px-2" 
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                />
              </div>

              {(searchQuery || filterCategory !== "all" || startDate !== `${currentYear}-01-01` || endDate !== `${currentYear}-12-31`) && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setSearchQuery("");
                    setFilterCategory("all");
                    setStartDate(`${currentYear}-01-01`);
                    setEndDate(`${currentYear}-12-31`);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground font-semibold"
                >
                  Reset
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3">
          {/* Desktop Table View */}
          <Card className="border border-border/60 bg-card/40 backdrop-blur-md shadow-elegant rounded-xl overflow-hidden hidden md:block">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="text-base font-bold tracking-tight">Riwayat Transaksi Kas Kecil</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="w-12 text-center text-xs font-bold uppercase tracking-wider hidden sm:table-cell">No</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider w-[120px] md:w-[140px] cursor-pointer select-none" onClick={() => requestSort("date")}>
                        Tanggal <SortIcon columnKey="date" />
                      </TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider w-[80px] md:w-[100px] cursor-pointer select-none hidden sm:table-cell" onClick={() => requestSort("type")}>
                        Tipe <SortIcon columnKey="type" />
                      </TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider w-[120px] md:w-[140px] cursor-pointer select-none hidden md:table-cell" onClick={() => requestSort("category")}>
                        Kategori <SortIcon columnKey="category" />
                      </TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider cursor-pointer select-none" onClick={() => requestSort("description")}>
                        Keterangan <SortIcon columnKey="description" />
                      </TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider w-[140px] md:w-[180px] cursor-pointer select-none hidden lg:table-cell" onClick={() => requestSort("person")}>
                        Penanggung Jawab <SortIcon columnKey="person" />
                      </TableHead>
                      <TableHead className="text-right text-xs font-bold uppercase tracking-wider w-[120px] md:w-[160px] cursor-pointer select-none" onClick={() => requestSort("amount")}>
                        Nominal <SortIcon columnKey="amount" />
                      </TableHead>
                      <TableHead className="text-center text-xs font-bold uppercase tracking-wider w-[60px] md:w-[80px]">Nota</TableHead>
                      <TableHead className="text-center text-xs font-bold uppercase tracking-wider w-[80px] md:w-[100px]">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedTransactions.map((t, idx) => {
                      let category: string | null = null;
                      let receiptUrl: string | null = null;
                      let department: string | null = null;
                      let person: string | null = null;
                      let cleanDesc = t.description || "";

                      if (t.type === "OUT") {
                        const catMatch = cleanDesc.match(/^\[(.*?)\]\s*(.*)$/);
                        if (catMatch) {
                          category = catMatch[1];
                          cleanDesc = catMatch[2];
                        }
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
                        <TableRow key={t.id} className="hover:bg-muted/20 transition-colors">
                          <TableCell className="text-center font-medium text-xs text-muted-foreground hidden sm:table-cell">{idx + 1}</TableCell>
                          <TableCell className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                            {formatDate(t.date || t.createdAt)}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider ${
                              t.type === "IN" 
                                ? "bg-success/10 text-success border border-success/20" 
                                : "bg-destructive/10 text-destructive border border-destructive/20"
                            }`}>
                              {t.type === "IN" ? "IN" : "OUT"}
                            </span>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {category ? (
                              <span className="px-2 py-0.5 rounded text-[10px] bg-primary/10 text-primary border border-primary/20 font-extrabold uppercase whitespace-nowrap">
                                {category}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-[10px] italic">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1.5 min-w-[200px] max-w-[280px] md:max-w-sm lg:max-w-none">
                              {/* Mobile-only tags for hidden columns */}
                              <div className="flex md:hidden items-center gap-1.5 flex-wrap">
                                <span className={`sm:hidden px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider ${t.type === "IN" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                                  {t.type === "IN" ? "IN" : "OUT"}
                                </span>
                                {category && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] bg-primary/10 text-primary font-bold">
                                    {category}
                                  </span>
                                )}
                              </div>

                              <div className="text-xs font-semibold text-foreground flex items-center gap-1.5 flex-wrap">
                                <span className="line-clamp-2" title={cleanDesc}>{cleanDesc}</span>
                                {displayDept && (
                                  <span className="font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded text-[9px] uppercase border border-primary/20">
                                    {displayDept}
                                  </span>
                                )}
                                {t.refRequestId && t.refRequestId !== "-" && (
                                  <span className="font-mono bg-muted border border-border/80 px-1.5 py-0.2 rounded text-[9px] whitespace-nowrap">Ref: {t.refRequestId}</span>
                                )}
                                {t.request && (
                                  <Link to={`/requests/${t.request.id}`} className="text-primary hover:underline font-bold text-[10px] whitespace-nowrap">
                                    Detail →
                                  </Link>
                                )}
                              </div>
                              
                              {/* Mobile-only person display */}
                              <div className="lg:hidden text-[10px] text-muted-foreground mt-0.5">
                                <span className="font-medium">PJ:</span> {displayPerson || <span className="italic">-</span>}
                              </div>

                              {t.request && t.request.items && t.request.items.length > 0 && (
                                <div 
                                  className="text-[10px] text-muted-foreground bg-muted/30 p-1.5 rounded border border-border/20 italic line-clamp-2" 
                                  title={t.request.items.map((it: any) => `${it.name} (${it.qty} ${it.unit || 'unit'} @ ${formatRupiah(it.price)})`).join(", ")}
                                >
                                  <span className="font-semibold text-foreground not-italic">Rincian:</span>{" "}
                                  {t.request.items.map((it: any) => `${it.name} (${it.qty} ${it.unit || 'unit'})`).join(", ")}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-semibold text-foreground hidden lg:table-cell">
                            {displayPerson || <span className="text-muted-foreground text-xs italic">-</span>}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`font-black text-sm tracking-tight whitespace-nowrap ${t.type === "IN" ? "text-success" : "text-destructive"}`}>
                              {t.type === "IN" ? "+" : "-"}{formatRupiah(Number(t.amount))}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            {receiptUrl ? (
                              <Button 
                                size="icon" 
                                variant="ghost"
                                className="h-8 w-8 text-primary hover:text-primary-glow hover:bg-primary/10 border border-transparent hover:border-primary/20"
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
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            ) : (
                              <span className="text-muted-foreground text-[10px] italic">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {(!t.refRequestId || t.refRequestId === "-") ? (
                              <div className="flex items-center justify-center gap-0.5">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7 text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent hover:border-border"
                                  onClick={() => handleEditClick(t)}
                                  title="Edit Transaksi"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                {isAdmin && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive border border-transparent hover:border-destructive/20"
                                    onClick={() => { setTxToDelete(t); setIsDeleteDialogOpen(true); }}
                                    title="Hapus Transaksi"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-[10px] italic">Sistem</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {sortedTransactions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-12 text-sm text-muted-foreground italic">
                          Tidak ada transaksi kas kecil yang cocok dengan filter
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Mobile Cards View */}
          <div className="md:hidden">
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-sm font-black tracking-tight text-muted-foreground uppercase">Riwayat Transaksi</h3>
            </div>
            {renderMobileCards()}
          </div>
        </div>

        <div className="xl:col-span-1">
          <Card className="border border-border/60 bg-card/40 backdrop-blur-md shadow-elegant rounded-xl overflow-hidden">
            <CardHeader className="border-b border-border/50 pb-3.5">
              <CardTitle className="text-sm font-bold tracking-tight">Rekap Saldo Bulanan</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="text-xs font-bold uppercase tracking-wider">Bulan</TableHead>
                      <TableHead className="text-right text-xs font-bold uppercase tracking-wider">In / Out</TableHead>
                      <TableHead className="text-right text-xs font-bold uppercase tracking-wider">Selisih</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlySummaries.map((m: any) => {
                      const diff = m.in - m.out;
                      return (
                        <TableRow key={m.key} className="hover:bg-muted/10 transition-colors">
                          <TableCell className="text-xs font-bold text-foreground py-3">{m.name}</TableCell>
                          <TableCell className="text-right py-3">
                            <div className="text-[10px] text-success font-bold">+{formatRupiah(m.in)}</div>
                            <div className="text-[10px] text-destructive font-bold">-{formatRupiah(m.out)}</div>
                          </TableCell>
                          <TableCell className="text-right py-3">
                            <span className={`text-xs font-black tracking-tight ${diff >= 0 ? "text-success" : "text-destructive"}`}>
                              {diff >= 0 ? "+" : ""}{formatRupiah(diff)}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {monthlySummaries.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-xs text-muted-foreground italic">
                          Tidak ada rekap bulanan
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

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
