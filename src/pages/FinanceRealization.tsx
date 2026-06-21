import { useState } from "react";
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
import { requests, users, sites } from "@/data/mockData";
import { toast } from "sonner";

export default function FinanceRealization() {
  const pending = requests.filter(r => r.status === "APPROVED_BY_FINANCE" || r.status === "PURCHASED");
  const closed = requests.filter(r => ["REALIZED", "CLOSED"].includes(r.status));
  const [actual, setActual] = useState("");

  const submit = (code: string) => {
    toast.success(`Realisasi ${code} berhasil disimpan`);
    setActual("");
  };

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
          <div className="text-2xl font-bold text-warning">{formatRupiah(pending.reduce((a, b) => a + b.amount, 0))}</div>
        </CardContent></Card>
      </div>

      <Card className="shadow-elegant">
        <CardHeader><CardTitle className="text-base">Antrian Realisasi</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {pending.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Tidak ada pengajuan menunggu realisasi</div>
          ) : pending.map(r => {
            const u = users.find(x => x.id === r.requesterId);
            const s = sites.find(x => x.id === r.site);
            return (
              <div key={r.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-md border border-border">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono text-muted-foreground">{r.code}</span>
                    <StatusBadge status={r.status} />
                  </div>
                  <div className="text-sm font-medium">{r.title}</div>
                  <div className="text-[11px] text-muted-foreground">{u?.name} • {s?.name} • {formatDate(r.createdAt)}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-[10px] text-muted-foreground">Diajukan</div>
                    <div className="font-semibold">{formatRupiah(r.amount)}</div>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild><Button size="sm" className="gradient-primary text-primary-foreground"><Wallet className="h-3.5 w-3.5 mr-1" />Realisasi</Button></DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Input Realisasi - {r.code}</DialogTitle>
                        <DialogDescription>{r.title}</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Diajukan</Label>
                            <Input value={formatRupiah(r.amount)} disabled className="mt-1.5" />
                          </div>
                          <div>
                            <Label>Realisasi Aktual</Label>
                            <Input className="mt-1.5" type="number" placeholder="0" value={actual} onChange={e => setActual(e.target.value)} />
                          </div>
                        </div>
                        {actual && (
                          <div className={`p-3 rounded-md text-xs ${+actual > r.amount ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"}`}>
                            Selisih: {formatRupiah(Math.abs(+actual - r.amount))} {+actual > r.amount ? "(over budget)" : "(under budget)"}
                          </div>
                        )}
                        <div>
                          <Label>Upload Bukti / Invoice</Label>
                          <div className="mt-1.5 border-2 border-dashed rounded-md p-4 text-center">
                            <Upload className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                            <div className="text-xs text-muted-foreground">Klik untuk upload</div>
                          </div>
                        </div>
                        <div>
                          <Label>Catatan</Label>
                          <Textarea className="mt-1.5" rows={2} placeholder="Catatan realisasi..." />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={() => submit(r.code)} className="gradient-primary text-primary-foreground">
                          <CheckCircle2 className="h-4 w-4 mr-1.5" />Tutup Pengajuan
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
            const diff = (r.realizedAmount || 0) - r.amount;
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
                  <div className="text-sm font-semibold">{formatRupiah(r.realizedAmount || 0)}</div>
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
