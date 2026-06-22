import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, FileText, Paperclip, CheckCircle2, XCircle, RotateCcw,
  Wallet, Clock, User, MapPin, Building2, Calendar, Download, Loader2,
  Upload, ImageIcon, ShieldCheck, AlertTriangle, Eye, FileSpreadsheet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { formatRupiah, formatDateTime, formatDate } from "@/utils/format";
import { useAuth, can } from "@/stores/authStore";
import { apiClient } from "@/services/apiClient";

const typeLabels: Record<string, string> = {
  PEMBELIAN: "Pembelian Barang/Sparepart",
  PETTY_CASH: "Petty Cash",
  REIMBURSE: "Reimburse",
  PERJALANAN_DINAS: "Perjalanan Dinas",
  OPERASIONAL: "Operasional",
  TOP_UP_PETTY_CASH: "Top Up Petty Cash",
};

export default function RequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [r, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);
  const submittingRef = useRef(false);
 
  // Itemized realization states
  const [itemRealizations, setItemRealizations] = useState<{
    id: string;
    name: string;
    qty: number;
    price: number;
    actualAmount: string;
    description: string;
    files: { file: File; preview: string; name: string }[];
    unitName: string;
  }[]>([]);

  const [uploadingProof, setUploadingProof] = useState(false);

  // Refund transfer states
  const [refundFiles, setRefundFiles] = useState<{ file: File; preview: string }[]>([]);
  const refundInputRef = useRef<HTMLInputElement>(null);
 
  // Verification state
  const [verifyNote, setVerifyNote] = useState("");
  const [rejectNote, setRejectNote] = useState("");
  const [verifying, setVerifying] = useState(false);
 
  // Image preview state
  const [previewImage, setPreviewImage] = useState<string | null>(null);
 
  const totalSpentAmount = itemRealizations.reduce((acc, it) => acc + (parseFloat(it.actualAmount) || 0), 0);

  const loadRequest = async () => {
    try {
      setLoading(true);
      const data = await apiClient.requests.get(id!);
      setRequest(data);
      if (data && data.items) {
        setItemRealizations(
          data.items.map((it: any) => ({
            id: it.id,
            name: it.name,
            qty: it.qty,
            price: Number(it.price),
            actualAmount: String(it.qty * Number(it.price)),
            description: "",
            files: [],
            unitName: it.unit?.name || "Pcs"
          }))
        );
      }
    } catch (err: any) {
      toast.error("Gagal memuat data pengajuan: " + err.message);
    } finally {
      setLoading(false);
    }
  };
 
  useEffect(() => {
    if (id) loadRequest();
  }, [id]);
 
  const handleApprove = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmittingAction(true);
    try {
      await apiClient.approvals.approve(id!, note);
      toast.success("Pengajuan disetujui");
      setNote("");
      await loadRequest();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyetujui pengajuan");
    } finally {
      submittingRef.current = false;
      setSubmittingAction(false);
    }
  };
 
  const handleReject = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmittingAction(true);
    try {
      await apiClient.approvals.reject(id!, note);
      toast.success("Pengajuan ditolak");
      setNote("");
      await loadRequest();
    } catch (err: any) {
      toast.error(err.message || "Gagal menolak pengajuan");
    } finally {
      submittingRef.current = false;
      setSubmittingAction(false);
    }
  };
 
  const handleRevise = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmittingAction(true);
    try {
      await apiClient.approvals.revise(id!, note);
      toast.success("Permintaan revisi dikirim");
      setNote("");
      await loadRequest();
    } catch (err: any) {
      toast.error(err.message || "Gagal meminta revisi");
    } finally {
      submittingRef.current = false;
      setSubmittingAction(false);
    }
  };

  const handleDeleteRequest = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmittingAction(true);
    try {
      await apiClient.requests.delete(id!);
      toast.success("Pengajuan berhasil dihapus");
      navigate("/requests");
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus pengajuan");
    } finally {
      submittingRef.current = false;
      setSubmittingAction(false);
    }
  };

  const handleExportRequest = async (format: "pdf" | "excel") => {
    try {
      toast.loading(`Mengekspor pengajuan ke ${format.toUpperCase()}...`, { id: "export-req-toast" });
      const token = localStorage.getItem("finflow:access_token") || "";
      const url = `/api/requests/${id}/export/${format}?token=${encodeURIComponent(token)}`;
      window.location.href = url;
      toast.success(`Export ${format.toUpperCase()} berhasil`, { id: "export-req-toast" });
    } catch (err: any) {
      toast.error(`Gagal mengekspor pengajuan: ${err.message || err}`, { id: "export-req-toast" });
    }
  };

  const handleItemAmountChange = (index: number, val: string) => {
    setItemRealizations(prev => prev.map((item, idx) => idx === index ? { ...item, actualAmount: val } : item));
  };

  const handleItemDescriptionChange = (index: number, val: string) => {
    setItemRealizations(prev => prev.map((item, idx) => idx === index ? { ...item, description: val } : item));
  };

  const handleItemFileSelect = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles = Array.from(files).map(file => ({
      file,
      preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
      name: file.name
    }));
    setItemRealizations(prev => prev.map((item, idx) => idx === index ? { ...item, files: [...item.files, ...newFiles] } : item));
    e.target.value = "";
  };

  const removeItemFile = (itemIndex: number, fileIndex: number) => {
    setItemRealizations(prev => prev.map((item, idx) => {
      if (idx !== itemIndex) return item;
      const fileToRem = item.files[fileIndex];
      if (fileToRem.preview) URL.revokeObjectURL(fileToRem.preview);
      return {
        ...item,
        files: item.files.filter((_, fIdx) => fIdx !== fileIndex)
      };
    }));
  };

  const handleRefundSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const newFiles = Array.from(files).map(file => ({
      file,
      preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : ""
    }));
    setRefundFiles(prev => [...prev, ...newFiles]);
    if (refundInputRef.current) refundInputRef.current.value = "";
  };

  const removeRefundFile = (idx: number) => {
    setRefundFiles(prev => {
      const removed = prev[idx];
      if (removed.preview) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleSubmitProof = async () => {
    const realizedAmt = r.financeRealization ? Number(r.financeRealization.realizedAmount) : undefined;
    const hasRefund = realizedAmt !== undefined && totalSpentAmount < realizedAmt;

    // Validate inputs
    for (const it of itemRealizations) {
      const amt = parseFloat(it.actualAmount);
      if (isNaN(amt) || amt < 0) {
        toast.error(`Masukkan harga riil yang valid untuk item: ${it.name}`);
        return;
      }
      if (it.files.length === 0 && !it.description.trim()) {
        toast.error(`Harap isi deskripsi pertanggungjawaban untuk item "${it.name}" jika tidak ada file bukti`);
        return;
      }
    }

    if (hasRefund && refundFiles.length === 0) {
      toast.error("Wajib mengunggah bukti transfer pengembalian sisa dana");
      return;
    }

    setUploadingProof(true);
    try {
      const uploadedProofs: { fileUrl: string; fileName: string; description?: string; requestItemId?: string; isRefundProof?: boolean }[] = [];

      // 1. Upload item proofs
      for (const it of itemRealizations) {
        if (it.files.length > 0) {
          for (const pf of it.files) {
            const uploaded = await apiClient.upload(pf.file);
            uploadedProofs.push({
              fileUrl: uploaded.file.url,
              fileName: uploaded.file.name,
              description: it.description || undefined,
              requestItemId: it.id
            });
          }
        } else if (it.description.trim()) {
          uploadedProofs.push({
            fileUrl: "none",
            fileName: "Tanpa Nota",
            description: it.description,
            requestItemId: it.id
          });
        }
      }

      // 2. Upload refund proofs
      for (const rf of refundFiles) {
        const uploaded = await apiClient.upload(rf.file);
        uploadedProofs.push({
          fileUrl: uploaded.file.url,
          fileName: uploaded.file.name,
          description: "Bukti Transfer Pengembalian Selisih Dana",
          isRefundProof: true
        });
      }
      
      // Submit to API
      await apiClient.finance.submitProof(id!, uploadedProofs, totalSpentAmount);
      toast.success("Pertanggungjawaban berhasil dikirim");
      setRefundFiles([]);
      await loadRequest();
    } catch (err: any) {
      toast.error(err.message || "Gagal mengirim pertanggungjawaban");
    } finally {
      setUploadingProof(false);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    try {
      await apiClient.finance.verifyRealization(id!, verifyNote);
      toast.success("Bukti diverifikasi, pengajuan ditutup");
      setVerifyNote("");
      await loadRequest();
    } catch (err: any) {
      toast.error(err.message || "Gagal memverifikasi");
    } finally {
      setVerifying(false);
    }
  };

  const handleRejectVerification = async () => {
    if (!rejectNote.trim()) {
      toast.error("Catatan alasan penolakan wajib diisi");
      return;
    }
    setVerifying(true);
    try {
      await apiClient.finance.rejectVerification(id!, rejectNote);
      toast.success("Bukti ditolak, pengaju harus upload ulang");
      setRejectNote("");
      await loadRequest();
    } catch (err: any) {
      toast.error(err.message || "Gagal menolak bukti");
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
        <span className="text-sm text-muted-foreground">Memuat detail pengajuan...</span>
      </div>
    );
  }

  if (!r) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-muted-foreground mb-3">Pengajuan tidak ditemukan</p>
        <Button asChild variant="outline"><Link to="/requests">Kembali</Link></Button>
      </div>
    );
  }

  const requester = r.requester;
  const dept = r.department;
  const site = r.site;
  const logs = r.approvalLogs || [];
  const proofs = r.realizationProofs || [];
  
  const total = r.items ? r.items.reduce((a: number, b: any) => a + (b.qty * Number(b.price)), 0) : 0;
  const realizedAmt = r.financeRealization ? Number(r.financeRealization.realizedAmount) : undefined;
  const diff = realizedAmt !== undefined ? realizedAmt - Number(r.amount) : null;

  const isRequester = (user?.userId || user?.id) === r.requesterId;
  const isAdmin = user?.role?.toLowerCase() === "admin";
  const canVerify = can(user?.role, "finance.verify");
  const showUploadProof = (isRequester || isAdmin) && r.status === "REALIZED";
  const showVerificationActions = canVerify && r.status === "WAITING_VERIFICATION";
  const showEditButton = (isRequester || isAdmin) && ["DRAFT", "NEED_REVISION"].includes(r.status);
  const showDeleteButton = isAdmin || (isRequester && r.status === "DRAFT");
 
  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-5xl mx-auto pb-24 lg:pb-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="-ml-2"><ArrowLeft className="h-4 w-4" /></Button>
        <span className="text-xs font-mono text-muted-foreground">{r.code}</span>
        <StatusBadge status={r.status} />
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExportRequest("pdf")}>
            <FileText className="h-4 w-4 mr-1 text-destructive" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExportRequest("excel")}>
            <FileSpreadsheet className="h-4 w-4 mr-1 text-success" /> Excel
          </Button>

          {showEditButton && (
            <Button asChild size="sm" className="gradient-primary text-primary-foreground shadow-glow">
              <Link to={`/requests/${r.id}/edit`}>Edit & Ajukan Ulang</Link>
            </Button>
          )}
          {showDeleteButton && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  Hapus Pengajuan
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Hapus Pengajuan</AlertDialogTitle>
                  <AlertDialogDescription>
                    Apakah Anda yakin ingin menghapus pengajuan <strong>{r.code}</strong>? Tindakan ini akan menghapus semua item, lampiran, dan riwayat terkait pengajuan ini secara permanen.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteRequest} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Ya, Hapus Permanen
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* Header */}
          <Card className="shadow-elegant">
            <CardContent className="p-5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{typeLabels[r.type] || r.type}</div>
              <h1 className="text-xl lg:text-2xl font-bold tracking-tight mb-3">{r.title}</h1>
              <p className="text-sm text-muted-foreground mb-4">{r.description}</p>
              
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-muted-foreground" /><span>{requester?.name}</span></div>
                <div className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5 text-muted-foreground" /><span>{dept?.name}</span></div>
                <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-muted-foreground" /><span>{site?.name}</span></div>
                <div className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5 text-muted-foreground" /><span>{formatDate(r.createdAt)}</span></div>
              </div>

              {/* Perjalanan Dinas Dates info display */}
              {r.type === "PERJALANAN_DINAS" && (r.departureDate || r.returnDate) && (
                <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/10 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
                  {r.departureDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <div>
                        <span className="text-muted-foreground block text-[9px] uppercase tracking-wider">Tanggal Pergi</span>
                        <span className="font-semibold">{formatDate(r.departureDate)}</span>
                      </div>
                    </div>
                  )}
                  {r.returnDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <div>
                        <span className="text-muted-foreground block text-[9px] uppercase tracking-wider">Tanggal Pulang</span>
                        <span className="font-semibold">{formatDate(r.returnDate)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Items */}
          <Card className="shadow-elegant">
            <CardHeader className="pb-2"><CardTitle className="text-base">Detail Item</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground border-b border-border">
                    <tr>
                      <th className="text-left py-2 font-medium">Item</th>
                      <th className="text-right py-2 font-medium">Qty</th>
                      <th className="text-right py-2 font-medium">Harga</th>
                      <th className="text-right py-2 font-medium">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.items && r.items.map((it: any, i: number) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className="py-2.5">
                          <div className="font-medium text-sm">{it.name}</div>
                          {it.category && (
                            <span className="inline-block text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-full mt-0.5 font-normal">
                              {it.category.name}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 text-right">{it.qty} {it.unit?.name || "Pcs"}</td>
                        <td className="py-2.5 text-right text-muted-foreground">{formatRupiah(Number(it.price))}</td>
                        <td className="py-2.5 text-right font-medium">{formatRupiah(it.qty * Number(it.price))}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3} className="py-3 text-right text-sm font-medium">Total Pengajuan</td>
                      <td className="py-3 text-right text-lg font-bold text-primary">{formatRupiah(total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Attachments */}
          <Card className="shadow-elegant">
            <CardHeader className="pb-2"><CardTitle className="text-base">Lampiran</CardTitle></CardHeader>
            <CardContent>
              {!r.attachments || r.attachments.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground">Tidak ada lampiran</div>
              ) : (
                <div className="space-y-2">
                  {r.attachments.map((a: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-2.5 rounded-md border border-border">
                      <div className="flex items-center gap-2 min-w-0">
                        <Paperclip className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm truncate">{a.name}</div>
                          <div className="text-[10px] text-muted-foreground">{a.size || ""}</div>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                        <a href={a.url} target="_blank" rel="noopener noreferrer"><Download className="h-3.5 w-3.5" /></a>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Realisasi */}
          {realizedAmt !== undefined && (
            <Card className="shadow-elegant border-success/30 bg-success/5">
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Wallet className="h-4 w-4 text-success" />Realisasi Finance</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><div className="text-xs text-muted-foreground mb-1 font-medium">Diajukan</div><div className="font-semibold">{formatRupiah(Number(r.amount))}</div></div>
                <div><div className="text-xs text-muted-foreground mb-1 font-medium">Realisasi Finance</div><div className="font-semibold">{formatRupiah(realizedAmt)}</div></div>
                <div><div className="text-xs text-muted-foreground mb-1 font-medium">Pengeluaran Aktual</div><div className="font-semibold">{r.actualAmount ? formatRupiah(Number(r.actualAmount)) : "Belum diinput"}</div></div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1 font-medium">Sisa Pengembalian</div>
                  <div className={`font-bold ${r.actualAmount && Number(r.actualAmount) < realizedAmt ? "text-success" : "text-muted-foreground"}`}>
                    {r.actualAmount && Number(r.actualAmount) < realizedAmt ? formatRupiah(realizedAmt - Number(r.actualAmount)) : "Rp 0"}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bukti Pertanggungjawaban */}
          {(proofs.length > 0 || showUploadProof || r.status === "WAITING_VERIFICATION" || r.status === "CLOSED") && (
            <Card className={`shadow-elegant ${r.status === "CLOSED" ? "border-success/30 bg-success/5" : r.status === "WAITING_VERIFICATION" ? "border-warning/30 bg-warning/5" : "border-primary/30 bg-primary/5"}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  {r.status === "CLOSED" ? (
                    <><ShieldCheck className="h-4 w-4 text-success" />Bukti Pertanggungjawaban — Terverifikasi</>
                  ) : r.status === "WAITING_VERIFICATION" ? (
                    <><AlertTriangle className="h-4 w-4 text-warning" />Bukti Pertanggungjawaban — Menunggu Verifikasi</>
                  ) : (
                    <><Upload className="h-4 w-4 text-primary" />Bukti Pertanggungjawaban</>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Display existing proofs */}
                {proofs.length > 0 && (
                  <div className="space-y-3">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">File Bukti ({proofs.length})</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {proofs.map((p: any) => {
                        const noFile = p.fileUrl === "none";
                        const isImage = !noFile && /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(p.fileName);
                        return (
                          <div key={p.id} className="group relative rounded-lg border border-border bg-background overflow-hidden">
                            {isImage ? (
                              <div className="aspect-square relative cursor-pointer" onClick={() => setPreviewImage(p.fileUrl)}>
                                <img src={p.fileUrl} alt={p.fileName} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                  <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              </div>
                            ) : noFile ? (
                              <div className="aspect-square flex flex-col items-center justify-center bg-secondary/30 p-3 text-center">
                                <FileText className="h-8 w-8 text-muted-foreground/65 mb-1.5" />
                                <span className="text-[10px] font-semibold text-muted-foreground">Tanpa Nota / Bukti Fisik</span>
                              </div>
                            ) : (
                              <div className="aspect-square flex flex-col items-center justify-center bg-muted/30 p-3">
                                <FileText className="h-10 w-10 text-muted-foreground mb-2" />
                                <span className="text-[10px] text-muted-foreground text-center truncate w-full">{p.fileName}</span>
                              </div>
                            )}
                            <div className="p-2 border-t border-border">
                              <div className="text-[11px] font-medium truncate">{p.fileName}</div>
                              {p.requestItem && (
                                <div className="text-[10px] text-primary font-semibold mt-0.5 bg-primary/10 px-1.5 py-0.5 rounded inline-block">Item: {p.requestItem.name}</div>
                              )}
                              {p.isRefundProof && (
                                <div className="text-[10px] text-warning font-semibold mt-0.5 bg-warning/10 px-1.5 py-0.5 rounded inline-block">Bukti Pengembalian Dana</div>
                              )}
                              <div className="text-[10px] text-muted-foreground mt-1">
                                {p.uploadedBy?.name} • {formatDate(p.createdAt)}
                              </div>
                              {p.description && (
                                <div className="text-[10px] text-muted-foreground italic mt-0.5 line-clamp-2">{p.description}</div>
                              )}
                            </div>
                            {!noFile && (
                              <a href={p.fileUrl} target="_blank" rel="noopener noreferrer" className="absolute top-1.5 right-1.5 p-1 rounded bg-background/80 backdrop-blur-sm border border-border opacity-0 group-hover:opacity-100 transition-opacity">
                                <Download className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Upload form - only for requester when REALIZED */}
                {showUploadProof && (
                  <div className="space-y-6 pt-3 border-t border-border">
                    <div className="text-xs font-semibold uppercase tracking-wider text-primary">Form Pertanggungjawaban</div>
                    
                    {/* Itemized list / table */}
                    <div className="overflow-x-auto border border-border rounded-lg bg-background/50">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-muted text-muted-foreground font-semibold uppercase tracking-wider border-b border-border">
                          <tr>
                            <th className="p-3">Item</th>
                            <th className="p-3 text-right">Pengajuan</th>
                            <th className="p-3">Harga Real / Aktual (Rp)</th>
                            <th className="p-3">Deskripsi / Keterangan</th>
                            <th className="p-3 text-center">Nota / Bukti</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {itemRealizations.map((it, idx) => (
                            <tr key={it.id} className="hover:bg-muted/10">
                              {/* Item name and Qty */}
                              <td className="p-3 font-medium">
                                <div>{it.name}</div>
                                <div className="text-[10px] text-muted-foreground mt-0.5">{it.qty} {it.unitName}</div>
                              </td>
                              
                              {/* Harga Pengajuan (subtotal) */}
                              <td className="p-3 text-right font-semibold text-muted-foreground whitespace-nowrap">
                                {formatRupiah(it.qty * it.price)}
                              </td>

                              {/* Harga Real (input field) */}
                              <td className="p-3 min-w-[120px]">
                                <Input
                                  type="number"
                                  className="h-8 text-xs font-semibold"
                                  value={it.actualAmount}
                                  onChange={e => handleItemAmountChange(idx, e.target.value)}
                                  placeholder="Harga riil..."
                                />
                              </td>

                              {/* Description (textarea/input) */}
                              <td className="p-3 min-w-[180px]">
                                <Input
                                  type="text"
                                  className="h-8 text-xs"
                                  value={it.description}
                                  onChange={e => handleItemDescriptionChange(idx, e.target.value)}
                                  placeholder="Keterangan (opsional)..."
                                />
                              </td>

                              {/* Upload files per item */}
                              <td className="p-3">
                                <div className="flex flex-col items-center gap-1.5 min-w-[120px]">
                                  <input
                                    id={`file-input-${it.id}`}
                                    type="file"
                                    multiple
                                    accept="image/*,.pdf"
                                    className="hidden"
                                    onChange={e => handleItemFileSelect(idx, e)}
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-[10px] font-medium"
                                    onClick={() => document.getElementById(`file-input-${it.id}`)?.click()}
                                  >
                                    <Upload className="h-3 w-3 mr-1" />Pilih File
                                  </Button>
                                  
                                  {it.files.length > 0 && (
                                    <div className="w-full space-y-1 mt-1 bg-secondary/20 p-1.5 rounded border border-border">
                                      {it.files.map((fileObj, fIdx) => (
                                        <div key={fIdx} className="flex items-center justify-between text-[9px] gap-2 border-b border-border last:border-0 pb-0.5">
                                          <span className="truncate max-w-[80px]" title={fileObj.name}>{fileObj.name}</span>
                                          <button
                                            type="button"
                                            onClick={() => removeItemFile(idx, fIdx)}
                                            className="text-destructive font-bold hover:underline"
                                          >
                                            Hapus
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Excess Fund Refund warning & upload */}
                    {realizedAmt !== undefined && totalSpentAmount < realizedAmt && (
                      <div className="p-4 bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/35 rounded-lg text-xs text-amber-600 dark:text-amber-400 space-y-2 animate-in fade-in duration-200 shadow-sm">
                        <div className="font-semibold flex items-center gap-1.5"><AlertTriangle className="h-4 w-4 text-amber-500" />Terdapat Kelebihan Dana!</div>
                        <div>
                          Finance menyerahkan <strong>{formatRupiah(realizedAmt)}</strong>, sedangkan total pengeluaran riil Anda adalah <strong>{formatRupiah(totalSpentAmount)}</strong>.
                          Sisa dana <strong>{formatRupiah(realizedAmt - totalSpentAmount)}</strong> wajib ditransfer kembali ke rekening perusahaan.
                        </div>
                        <div className="font-medium pt-1">Silakan unggah Bukti Transfer Pengembalian Dana:</div>
                        
                        <div className="flex items-center gap-2">
                          <Button type="button" size="sm" variant="outline" className="bg-background border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 text-xs" onClick={() => refundInputRef.current?.click()}>
                            <Upload className="h-3 w-3 mr-1" />Pilih File Bukti Transfer
                          </Button>
                          <input
                            ref={refundInputRef}
                            type="file"
                            className="hidden"
                            multiple
                            accept="image/*,.pdf"
                            onChange={handleRefundSelect}
                          />
                          <span className="text-[10px] text-muted-foreground">{refundFiles.length > 0 ? `${refundFiles.length} file dipilih` : "Belum ada file"}</span>
                        </div>

                        {refundFiles.length > 0 && (
                          <div className="space-y-1 bg-background/50 p-2 rounded border border-amber-500/20">
                            {refundFiles.map((rf, i) => (
                              <div key={i} className="flex items-center justify-between text-[10px] py-0.5 border-b border-amber-500/10 last:border-0">
                                <span className="truncate max-w-[180px] font-mono text-muted-foreground">{rf.file.name}</span>
                                <button type="button" onClick={() => removeRefundFile(i)} className="text-destructive font-bold hover:underline">Hapus</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <Button
                      onClick={handleSubmitProof}
                      disabled={
                        uploadingProof ||
                        (realizedAmt !== undefined && totalSpentAmount < realizedAmt && refundFiles.length === 0)
                      }
                      className="w-full gradient-primary text-primary-foreground shadow-glow"
                    >
                      {uploadingProof ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Mengirim...</>
                      ) : (
                        <><Upload className="h-4 w-4 mr-2" />Kirim Pertanggungjawaban</>
                      )}
                    </Button>
                  </div>
                )}

                {/* Message for non-requester when REALIZED */}
                {r.status === "REALIZED" && !isRequester && (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    <Clock className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                    Menunggu pengaju upload bukti pertanggungjawaban...
                  </div>
                )}

                {/* Verification actions for finance/supervisor */}
                {showVerificationActions && (
                  <div className="space-y-3 pt-3 border-t border-border">
                    <div className="text-xs font-semibold uppercase tracking-wider text-warning">Aksi Verifikasi</div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Verify & Close */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button className="bg-success text-success-foreground hover:bg-success/90 w-full" disabled={verifying}>
                            <ShieldCheck className="h-4 w-4 mr-2" />Verifikasi & Tutup
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Verifikasi Bukti Pertanggungjawaban</AlertDialogTitle>
                            <AlertDialogDescription>
                              Pastikan bukti sudah sesuai. Setelah diverifikasi, pengajuan akan ditutup secara permanen.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <Textarea
                            placeholder="Catatan verifikasi (opsional)..."
                            rows={2}
                            value={verifyNote}
                            onChange={e => setVerifyNote(e.target.value)}
                          />
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={handleVerify} className="bg-success text-success-foreground hover:bg-success/90">
                              Ya, Verifikasi
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      {/* Reject Verification */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive/10 w-full" disabled={verifying}>
                            <XCircle className="h-4 w-4 mr-2" />Tolak Bukti
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Tolak Bukti Pertanggungjawaban</AlertDialogTitle>
                            <AlertDialogDescription>
                              Jelaskan alasan penolakan. Pengaju akan diminta upload ulang bukti baru.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <Textarea
                            placeholder="Alasan penolakan (wajib diisi)..."
                            rows={3}
                            value={rejectNote}
                            onChange={e => setRejectNote(e.target.value)}
                          />
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleRejectVerification}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              disabled={!rejectNote.trim()}
                            >
                              Ya, Tolak Bukti
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Approval timeline */}
          <Card className="shadow-elegant">
            <CardHeader className="pb-2"><CardTitle className="text-base">Timeline Approval</CardTitle></CardHeader>
            <CardContent>
              <div className="relative pl-6 space-y-4">
                <div className="absolute left-2 top-1.5 bottom-1.5 w-px bg-border" />
                <div className="relative">
                  <div className="absolute -left-5 top-0.5 w-4 h-4 rounded-full bg-success flex items-center justify-center"><CheckCircle2 className="h-2.5 w-2.5 text-success-foreground" /></div>
                  <div className="text-sm font-medium">Pengajuan dibuat</div>
                  <div className="text-[11px] text-muted-foreground">{requester?.name} • {formatDateTime(r.createdAt)}</div>
                </div>
                {logs.map((l: any) => {
                  const u = l.actor;
                  const isReject = l.action === "REJECT" || l.action === "REJECT_PROOF";
                  const isRev = l.action === "REVISION" || l.action === "REVISE";
                  const isProof = l.action === "SUBMIT_PROOF";
                  const isVerify = l.action === "VERIFY";
                  
                  let label = "";
                  if (l.action === "APPROVE") label = "Disetujui";
                  else if (l.action === "REJECT") label = "Ditolak";
                  else if (l.action === "REVISE" || l.action === "REVISION") label = "Diminta revisi";
                  else if (l.action === "SUBMIT_PROOF") label = "Bukti di-upload";
                  else if (l.action === "VERIFY") label = "Diverifikasi & ditutup";
                  else if (l.action === "REJECT_PROOF") label = "Bukti ditolak";
                  else if (l.action === "SUBMIT") label = "Diajukan";
                  else label = l.action;

                  const bgColor = isReject ? "bg-destructive" 
                    : isRev ? "bg-warning" 
                    : isProof ? "bg-info" 
                    : isVerify ? "bg-success"
                    : "bg-success";
                  
                  const Icon = isReject ? XCircle 
                    : isRev ? RotateCcw 
                    : isProof ? Upload 
                    : isVerify ? ShieldCheck
                    : CheckCircle2;
                  
                  const iconColor = isReject ? "text-destructive-foreground" 
                    : isRev ? "text-warning-foreground" 
                    : isProof ? "text-info-foreground"
                    : "text-success-foreground";

                  return (
                    <div key={l.id} className="relative">
                      <div className={`absolute -left-5 top-0.5 w-4 h-4 rounded-full flex items-center justify-center ${bgColor}`}>
                        <Icon className={`h-2.5 w-2.5 ${iconColor}`} />
                      </div>
                      <div className="text-sm font-medium">{label} oleh {u?.name} ({u?.role?.name || u?.role || ""})</div>
                      {l.note && <div className="text-[11px] text-muted-foreground italic">"{l.note}"</div>}
                      <div className="text-[11px] text-muted-foreground">{formatDateTime(l.createdAt)}</div>
                    </div>
                  );
                })}
                {!["REJECTED", "CLOSED"].includes(r.status) && (
                  <div className="relative">
                    <div className="absolute -left-5 top-0.5 w-4 h-4 rounded-full bg-muted border-2 border-border flex items-center justify-center"><Clock className="h-2.5 w-2.5 text-muted-foreground" /></div>
                    <div className="text-sm text-muted-foreground">
                      {r.status === "REALIZED" ? "Menunggu upload bukti" 
                        : r.status === "WAITING_VERIFICATION" ? "Menunggu verifikasi"
                        : "Menunggu langkah berikutnya"}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          {can(user?.role, "request.approve") && ["SUBMITTED", "APPROVED_BY_SUPERVISOR"].includes(r.status) && (
            <Card className="shadow-elegant lg:static fixed bottom-16 inset-x-0 lg:bottom-auto lg:inset-auto z-20 lg:z-auto rounded-none lg:rounded-lg border-t-2 lg:border">
              <CardHeader className="pb-2 hidden lg:block"><CardTitle className="text-base">Aksi Approval</CardTitle></CardHeader>
              <CardContent className="p-3 lg:p-6 space-y-2">
                <Textarea placeholder="Catatan approval (opsional)..." className="hidden lg:block" rows={3} value={note} onChange={e => setNote(e.target.value)} />
                <div className="grid grid-cols-3 gap-2">
                  <ActionButton label="Setujui" variant="success" onConfirm={handleApprove} disabled={submittingAction} />
                  <ActionButton label="Revisi" variant="warning" onConfirm={handleRevise} disabled={submittingAction} />
                  <ActionButton label="Tolak" variant="destructive" onConfirm={handleReject} disabled={submittingAction} />
                </div>
              </CardContent>
            </Card>
          )}
          {can(user?.role, "finance.realize") && r.status === "APPROVED_BY_FINANCE" && (
            <Button asChild className="w-full gradient-primary text-primary-foreground"><Link to="/finance">Input Realisasi →</Link></Button>
          )}
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-4xl max-h-[90vh]">
            <img src={previewImage} alt="Preview" className="max-w-full max-h-[85vh] object-contain rounded-lg" />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 p-1.5 rounded-full bg-background border border-border shadow-lg"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionButton({ label, variant, onConfirm, disabled }: { label: string; variant: "success" | "warning" | "destructive"; onConfirm: () => void; disabled?: boolean }) {
  const cls = variant === "success" ? "bg-success text-success-foreground hover:bg-success/90"
            : variant === "warning" ? "bg-warning text-warning-foreground hover:bg-warning/90"
            : "bg-destructive text-destructive-foreground hover:bg-destructive/90";
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button className={cls} size="sm" disabled={disabled}>{label}</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Konfirmasi {label}</AlertDialogTitle>
          <AlertDialogDescription>Aksi ini akan tercatat di audit trail. Lanjutkan?</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Ya, {label}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
