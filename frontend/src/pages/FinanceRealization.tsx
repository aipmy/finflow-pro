import { useEffect, useState } from "react";
import { Wallet, Upload, CheckCircle2, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { formatRupiah, formatDate } from "@/utils/format";
import { apiClient } from "@/services/apiClient";
import { toast } from "sonner";
import { ImagePreviewModal } from "@/components/ImagePreviewModal";

const formatNumberWithDots = (num: number | string) => {
  if (!num) return "";
  const clean = String(num).replace(/[^0-9]/g, "");
  if (!clean) return "";
  return new Intl.NumberFormat("id-ID").format(parseInt(clean, 10));
};

export default function FinanceRealization() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actual, setActual] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState<Record<string, boolean>>({});
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewDetails, setPreviewDetails] = useState<any[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  async function loadRequests() {
    try {
      setLoading(true);
      const reqs = await apiClient.requests.list();
      setRequests(reqs);
    } catch (err: any) {
      toast.error("Gagal memuat pengajuan: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequests();
  }, []);

  const pending = requests.filter(r => r.status === "APPROVED_BY_FINANCE" || r.status === "PURCHASED");
  const closed = requests.filter(r => ["REALIZED", "CLOSED"].includes(r.status));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      toast.info(`Berkas terpilih: ${e.target.files[0].name}`);
    }
  };

  const submit = async (id: string, code: string, maxAmount: number) => {
    const amountNum = parseFloat(actual);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Masukkan jumlah realisasi yang valid");
      return;
    }

    if (!file) {
      toast.error("Bukti lampiran realisasi wajib diunggah");
      return;
    }

    setIsSubmitting(true);
    try {
      let receiptUrl = "";
      if (file) {
        const uploadRes = await apiClient.upload(file);
        receiptUrl = uploadRes.file.url;
      }

      await apiClient.finance.realize(id, amountNum, receiptUrl, notes);
      toast.success(`Realisasi ${code} berhasil disimpan`);
      setActual("");
      setNotes("");
      setFile(null);
      
      // Close dialog for this request
      setIsDialogOpen(prev => ({ ...prev, [id]: false }));
      
      // Refresh requests list
      loadRequests();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan realisasi");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-2">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">Memuat data realisasi...</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1400px] mx-auto">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Realisasi Finance</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Input realisasi aktual dan tutup pengajuan</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-border/60 bg-card/50 backdrop-blur-md shadow-elegant hover:-translate-y-0.5 transition-all duration-200">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-sm">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Menunggu Realisasi</div>
              <div className="text-2xl font-black tracking-tight text-foreground mt-0.5">{pending.length}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card/50 backdrop-blur-md shadow-elegant hover:-translate-y-0.5 transition-all duration-200">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-success/10 text-success flex items-center justify-center border border-success/20 shadow-sm">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sudah Direalisasi</div>
              <div className="text-2xl font-black tracking-tight text-success mt-0.5">{closed.length}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card/50 backdrop-blur-md shadow-elegant hover:-translate-y-0.5 transition-all duration-200">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-warning/10 text-warning flex items-center justify-center border border-warning/20 shadow-sm">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Outstanding</div>
              <div className="text-2xl font-black tracking-tight text-warning mt-0.5">
                {formatRupiah(pending.reduce((acc, curr) => acc + Number(curr.amount), 0))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border/60 bg-card/45 backdrop-blur-md shadow-elegant rounded-xl">
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="text-base font-bold tracking-tight">Antrian Realisasi</CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-3.5">
          {pending.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground italic">Tidak ada pengajuan menunggu realisasi</div>
          ) : pending.map(r => {
            const u = r.requester;
            const s = r.site;
            return (
              <div key={r.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border border-border/50 bg-card/60 hover:bg-muted/30 transition-all duration-150 group">
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-block font-mono text-[10px] px-1.5 py-0.5 rounded bg-secondary/80 text-secondary-foreground border border-border/80 font-semibold tracking-tight shadow-sm">
                      {r.code}
                    </span>
                    <StatusBadge status={r.status} />
                  </div>
                  <div className="text-sm font-bold tracking-tight text-foreground">{r.title}</div>
                  <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-1.5 font-medium">
                    <span className="text-foreground font-semibold">{u?.name}</span>
                    <span className="text-border">•</span>
                    <span>{s?.name}</span>
                    <span className="text-border">•</span>
                    <span className="italic">{formatDate(r.createdAt)}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between md:justify-end gap-5 pt-3 md:pt-0 border-t md:border-none border-dashed border-border/60">
                  <div className="text-left md:text-right">
                    <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Diajukan</div>
                    <div className="text-base font-black text-foreground mt-0.5">{formatRupiah(Number(r.amount))}</div>
                  </div>
                  
                  <Dialog open={isDialogOpen[r.id]} onOpenChange={(open) => setIsDialogOpen(prev => ({ ...prev, [r.id]: open }))}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gradient-primary text-primary-foreground shadow-sm px-4 h-9 font-semibold">
                        <Wallet className="h-3.5 w-3.5 mr-1.5" />Realisasi
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="border border-border">
                      <DialogHeader>
                        <DialogTitle className="text-lg font-bold tracking-tight">Input Realisasi - {r.code}</DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">{r.title}</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Diajukan</Label>
                            <Input value={formatRupiah(Number(r.amount))} disabled className="bg-muted text-foreground/80 h-10 border-border/60" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Realisasi Aktual (Rp) <span className="text-destructive">*</span></Label>
                            <Input 
                              className="h-10 border-border/60 focus-visible:ring-primary/50" 
                              type="text" 
                              inputMode="numeric"
                              placeholder="0" 
                              value={formatNumberWithDots(actual)} 
                              onChange={e => {
                                const cleanVal = e.target.value.replace(/[^0-9]/g, "");
                                setActual(cleanVal);
                              }} 
                            />
                          </div>
                        </div>
                        {actual && (
                          <div className={`p-3 rounded-lg text-xs border font-semibold ${+actual > Number(r.amount) ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-success/10 text-success border-success/20"}`}>
                            Selisih: {formatRupiah(Math.abs(+actual - Number(r.amount)))} {+actual > Number(r.amount) ? "(over budget)" : "(under budget / hemat)"}
                          </div>
                        )}
                        <div className="space-y-1.5">
                          <Label htmlFor={`file-${r.id}`} className="text-xs font-semibold">Upload Bukti / Invoice <span className="text-destructive">*</span></Label>
                          <div className="border-2 border-dashed border-border/70 rounded-xl p-5 text-center cursor-pointer relative hover:bg-muted/30 transition-colors">
                            <input 
                              type="file" 
                              id={`file-${r.id}`} 
                              className="absolute inset-0 opacity-0 cursor-pointer" 
                              onChange={handleFileChange}
                              accept="image/*,.pdf"
                            />
                            <Upload className="h-6 w-6 mx-auto text-muted-foreground/80 mb-2" />
                            <div className="text-xs font-bold text-foreground">
                              {file ? file.name : "Klik atau seret file bukti ke sini"}
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1">Mendukung format gambar JPEG/PNG atau PDF</p>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Catatan</Label>
                          <Textarea 
                            className="resize-none border-border/60 focus-visible:ring-primary/50" 
                            rows={3} 
                            placeholder="Catatan realisasi..." 
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter className="border-t border-border/50 pt-3">
                        <Button 
                          onClick={() => submit(r.id, r.code, Number(r.amount))} 
                          className="gradient-primary text-primary-foreground shadow-sm h-10 px-5 font-semibold"
                          disabled={isSubmitting}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1.5" />
                          {isSubmitting ? "Menyimpan..." : "Tutup Pengajuan"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="border border-border/60 bg-card/45 backdrop-blur-md shadow-elegant rounded-xl">
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="text-base font-bold tracking-tight">Riwayat Realisasi</CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-3.5">
          {closed.map(r => {
            const diff = Number(r.financeRealization?.realizedAmount || 0) - Number(r.amount);
            return (
              <div key={r.id} className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card/60 hover:bg-muted/30 transition-all duration-150 group">
                <div className="min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-block font-mono text-[10px] px-1.5 py-0.5 rounded bg-secondary/80 text-secondary-foreground border border-border/80 font-semibold tracking-tight shadow-sm">
                      {r.code}
                    </span>
                    <StatusBadge status={r.status} />
                  </div>
                  <div className="text-sm font-bold tracking-tight text-foreground">{r.title}</div>
                </div>
                
                <div className="flex items-center justify-end gap-5 pl-4">
                  <div className="text-right">
                    <div className="text-base font-black text-foreground">{formatRupiah(Number(r.financeRealization?.realizedAmount || 0))}</div>
                    <div className={`text-[10px] font-bold mt-0.5 ${diff >= 0 ? "text-destructive" : "text-success"}`}>
                      {diff >= 0 ? "+" : ""}{formatRupiah(diff)}
                    </div>
                    {r.financeRealization?.receiptUrl && (
                      <button 
                        onClick={() => {
                          const url = r.financeRealization?.receiptUrl;
                          if (url?.toLowerCase().endsWith(".pdf")) {
                            window.open(url, "_blank");
                          } else if (url) {
                            setPreviewUrl(url);
                            setPreviewDetails([
                              { label: "Kode Transaksi", value: r.code },
                              { label: "Pengajuan", value: r.title },
                              { label: "Tanggal Realisasi", value: formatDate(r.financeRealization?.createdAt || new Date()) },
                              { label: "Diminta", value: formatRupiah(Number(r.amount)) },
                              { label: "Terealisasi", value: formatRupiah(Number(r.financeRealization?.realizedAmount || 0)) },
                              { label: "Selisih", value: formatRupiah(diff) },
                            ]);
                            setIsPreviewOpen(true);
                          }
                        }}
                        className="inline-flex items-center gap-1 text-[10px] text-primary hover:text-primary-glow font-bold bg-primary/5 border border-primary/20 px-1.5 py-0.5 rounded mt-1.5 transition-colors"
                      >
                        <FileText className="h-3 w-3" />
                        Lihat Bukti
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {closed.length === 0 && <div className="text-center py-12 text-sm text-muted-foreground italic">Belum ada riwayat realisasi transaksi</div>}
        </CardContent>
      </Card>
      <ImagePreviewModal 
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        imageUrl={previewUrl}
        title="Bukti Realisasi"
        details={previewDetails}
      />
    </div>
  );
}
