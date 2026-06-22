import { useEffect, useState } from "react";
import { Wallet, Upload, CheckCircle2 } from "lucide-react";
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

export default function FinanceRealization() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actual, setActual] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState<Record<string, boolean>>({});

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

      <div className="grid sm:grid-cols-3 gap-3">
        <Card className="shadow-elegant"><CardContent className="p-4">
          <div className="text-[11px] text-muted-foreground mb-1">Menunggu Realisasi</div>
          <div className="text-2xl font-bold">{pending.length}</div>
        </CardContent></Card>
        <Card className="shadow-elegant"><CardContent className="p-4">
          <div className="text-[11px] text-muted-foreground mb-1">Sudah Direalisasi</div>
          <div className="text-2xl font-bold text-success">{closed.length}</div>
        </CardContent></Card>
        <Card className="shadow-elegant"><CardContent className="p-4">
          <div className="text-[11px] text-muted-foreground mb-1">Total Outstanding</div>
          <div className="text-2xl font-bold text-warning">
            {formatRupiah(pending.reduce((acc, curr) => acc + Number(curr.amount), 0))}
          </div>
        </CardContent></Card>
      </div>

      <Card className="shadow-elegant">
        <CardHeader><CardTitle className="text-base">Antrian Realisasi</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {pending.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Tidak ada pengajuan menunggu realisasi</div>
          ) : pending.map(r => {
            const u = r.requester;
            const s = r.site;
            return (
              <div key={r.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-md border border-border">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono text-muted-foreground">{r.code}</span>
                    <StatusBadge status={r.status} />
                  </div>
                  <div className="text-sm font-medium">{r.title}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {u?.name} • {s?.name} • {formatDate(r.createdAt)}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-[10px] text-muted-foreground">Diajukan</div>
                    <div className="font-semibold">{formatRupiah(Number(r.amount))}</div>
                  </div>
                  <Dialog open={isDialogOpen[r.id]} onOpenChange={(open) => setIsDialogOpen(prev => ({ ...prev, [r.id]: open }))}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gradient-primary text-primary-foreground">
                        <Wallet className="h-3.5 w-3.5 mr-1" />Realisasi
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Input Realisasi - {r.code}</DialogTitle>
                        <DialogDescription>{r.title}</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Diajukan</Label>
                            <Input value={formatRupiah(Number(r.amount))} disabled className="mt-1.5" />
                          </div>
                          <div>
                            <Label>Realisasi Aktual</Label>
                            <Input 
                              className="mt-1.5" 
                              type="number" 
                              placeholder="0" 
                              value={actual} 
                              onChange={e => setActual(e.target.value)} 
                            />
                          </div>
                        </div>
                        {actual && (
                          <div className={`p-3 rounded-md text-xs ${+actual > Number(r.amount) ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"}`}>
                            Selisih: {formatRupiah(Math.abs(+actual - Number(r.amount)))} {+actual > Number(r.amount) ? "(over budget)" : "(under budget)"}
                          </div>
                        )}
                        <div>
                          <Label htmlFor={`file-${r.id}`}>Upload Bukti / Invoice</Label>
                          <div className="mt-1.5 border-2 border-dashed rounded-md p-4 text-center cursor-pointer relative hover:bg-muted/20">
                            <input 
                              type="file" 
                              id={`file-${r.id}`} 
                              className="absolute inset-0 opacity-0 cursor-pointer" 
                              onChange={handleFileChange}
                              accept="image/*,.pdf"
                            />
                            <Upload className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                            <div className="text-xs text-muted-foreground">
                              {file ? file.name : "Klik atau seret file bukti ke sini"}
                            </div>
                          </div>
                        </div>
                        <div>
                          <Label>Catatan</Label>
                          <Textarea 
                            className="mt-1.5" 
                            rows={2} 
                            placeholder="Catatan realisasi..." 
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button 
                          onClick={() => submit(r.id, r.code, Number(r.amount))} 
                          className="gradient-primary text-primary-foreground"
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

      <Card className="shadow-elegant">
        <CardHeader><CardTitle className="text-base">Riwayat Realisasi</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {closed.map(r => {
            const diff = Number(r.financeRealization?.realizedAmount || 0) - Number(r.amount);
            return (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-md border border-border">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-mono text-muted-foreground">{r.code}</span>
                    <StatusBadge status={r.status} />
                  </div>
                  <div className="text-sm font-medium truncate">{r.title}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">{formatRupiah(Number(r.financeRealization?.realizedAmount || 0))}</div>
                  <div className={`text-[10px] ${diff >= 0 ? "text-destructive" : "text-success"}`}>
                    {diff >= 0 ? "+" : ""}{formatRupiah(diff)}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
