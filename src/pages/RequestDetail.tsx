import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, FileText, Paperclip, CheckCircle2, XCircle, RotateCcw,
  Wallet, Clock, User, MapPin, Building2, Calendar, Download
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
import { useState } from "react";
import { toast } from "sonner";
import { formatRupiah, formatDateTime, formatDate } from "@/utils/format";
import {
  requests, users, departments, sites, categories,
  approvalLogs, auditLogs
} from "@/data/mockData";
import { useAuth, can } from "@/stores/authStore";

const typeLabels: Record<string, string> = {
  PEMBELIAN: "Pembelian Barang/Sparepart",
  PETTY_CASH: "Petty Cash",
  REIMBURSE: "Reimburse",
  PERJALANAN_DINAS: "Perjalanan Dinas",
  OPERASIONAL: "Operasional",
};

export default function RequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const r = requests.find(x => x.id === id);
  const [note, setNote] = useState("");

  if (!r) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-muted-foreground mb-3">Pengajuan tidak ditemukan</p>
        <Button asChild variant="outline"><Link to="/requests">Kembali</Link></Button>
      </div>
    );
  }

  const requester = users.find(u => u.id === r.requesterId);
  const dept = departments.find(d => d.id === r.department);
  const site = sites.find(s => s.id === r.site);
  const cat = categories.find(c => c.id === r.category);
  const logs = approvalLogs.filter(a => a.requestId === r.id);
  const trail = auditLogs.filter(a => a.target === r.code);

  const action = (label: string) => {
    toast.success(`${label} berhasil. Catatan: ${note || "-"}`);
    setNote("");
  };

  const total = r.items.reduce((a, b) => a + b.qty * b.price, 0);
  const diff = r.realizedAmount !== undefined ? r.realizedAmount - r.amount : null;

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-5xl mx-auto pb-24 lg:pb-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="-ml-2"><ArrowLeft className="h-4 w-4" /></Button>
        <span className="text-xs font-mono text-muted-foreground">{r.code}</span>
        <StatusBadge status={r.status} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* Header */}
          <Card className="shadow-elegant">
            <CardContent className="p-5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{typeLabels[r.type]}</div>
              <h1 className="text-xl lg:text-2xl font-bold tracking-tight mb-3">{r.title}</h1>
              <p className="text-sm text-muted-foreground mb-4">{r.description}</p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-muted-foreground" /><span>{requester?.name}</span></div>
                <div className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5 text-muted-foreground" /><span>{dept?.name}</span></div>
                <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-muted-foreground" /><span>{site?.name}</span></div>
                <div className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5 text-muted-foreground" /><span>{formatDate(r.createdAt)}</span></div>
                <div className="flex items-center gap-2 col-span-2"><FileText className="h-3.5 w-3.5 text-muted-foreground" /><span>Kategori: {cat?.name}</span></div>
              </div>
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
                    {r.items.map((it, i) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className="py-2.5">{it.name}</td>
                        <td className="py-2.5 text-right">{it.qty} {it.unit}</td>
                        <td className="py-2.5 text-right text-muted-foreground">{formatRupiah(it.price)}</td>
                        <td className="py-2.5 text-right font-medium">{formatRupiah(it.qty * it.price)}</td>
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
              {r.attachments.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground">Tidak ada lampiran</div>
              ) : (
                <div className="space-y-2">
                  {r.attachments.map((a, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 rounded-md border border-border">
                      <div className="flex items-center gap-2 min-w-0">
                        <Paperclip className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm truncate">{a.name}</div>
                          <div className="text-[10px] text-muted-foreground">{a.size}</div>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7"><Download className="h-3.5 w-3.5" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Realisasi */}
          {r.realizedAmount !== undefined && (
            <Card className="shadow-elegant border-success/30 bg-success/5">
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Wallet className="h-4 w-4 text-success" />Realisasi Finance</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-3 gap-4 text-sm">
                <div><div className="text-xs text-muted-foreground mb-1">Diajukan</div><div className="font-semibold">{formatRupiah(r.amount)}</div></div>
                <div><div className="text-xs text-muted-foreground mb-1">Realisasi</div><div className="font-semibold">{formatRupiah(r.realizedAmount)}</div></div>
                <div><div className="text-xs text-muted-foreground mb-1">Selisih</div><div className={`font-semibold ${(diff || 0) > 0 ? "text-destructive" : "text-success"}`}>{formatRupiah(Math.abs(diff || 0))}</div></div>
              </CardContent>
            </Card>
          )}

          {/* Audit log preview */}
          <Card className="shadow-elegant">
            <CardHeader className="pb-2"><CardTitle className="text-base">Audit Log</CardTitle></CardHeader>
            <CardContent>
              {trail.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-3">Belum ada aktivitas</div>
              ) : (
                <div className="space-y-2">
                  {trail.map(t => {
                    const u = users.find(x => x.id === t.userId);
                    return (
                      <div key={t.id} className="flex items-center justify-between text-xs py-1">
                        <span><span className="font-medium">{u?.name}</span> • {t.action} • {t.module}</span>
                        <span className="text-muted-foreground">{formatDateTime(t.timestamp)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
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
                {logs.map(l => {
                  const u = users.find(x => x.id === l.actorId);
                  const isReject = l.action === "REJECT";
                  const isRev = l.action === "REVISION";
                  return (
                    <div key={l.id} className="relative">
                      <div className={`absolute -left-5 top-0.5 w-4 h-4 rounded-full flex items-center justify-center ${isReject ? "bg-destructive" : isRev ? "bg-warning" : "bg-success"}`}>
                        {isReject ? <XCircle className="h-2.5 w-2.5 text-destructive-foreground" /> : isRev ? <RotateCcw className="h-2.5 w-2.5 text-warning-foreground" /> : <CheckCircle2 className="h-2.5 w-2.5 text-success-foreground" />}
                      </div>
                      <div className="text-sm font-medium">{l.action === "APPROVE" ? "Disetujui" : l.action === "REJECT" ? "Ditolak" : "Diminta revisi"} oleh {u?.name}</div>
                      <div className="text-[11px] text-muted-foreground italic">"{l.note}"</div>
                      <div className="text-[11px] text-muted-foreground">{formatDateTime(l.createdAt)}</div>
                    </div>
                  );
                })}
                {!["REJECTED", "CLOSED", "REALIZED"].includes(r.status) && (
                  <div className="relative">
                    <div className="absolute -left-5 top-0.5 w-4 h-4 rounded-full bg-muted border-2 border-border flex items-center justify-center"><Clock className="h-2.5 w-2.5 text-muted-foreground" /></div>
                    <div className="text-sm text-muted-foreground">Menunggu langkah berikutnya</div>
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
                  <ActionButton label="Setujui" variant="success" onConfirm={() => action("Disetujui")} />
                  <ActionButton label="Revisi" variant="warning" onConfirm={() => action("Diminta revisi")} />
                  <ActionButton label="Tolak" variant="destructive" onConfirm={() => action("Ditolak")} />
                </div>
              </CardContent>
            </Card>
          )}
          {can(user?.role, "finance.realize") && r.status === "APPROVED_BY_FINANCE" && (
            <Button asChild className="w-full gradient-primary text-primary-foreground"><Link to="/finance">Input Realisasi →</Link></Button>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionButton({ label, variant, onConfirm }: { label: string; variant: "success" | "warning" | "destructive"; onConfirm: () => void }) {
  const cls = variant === "success" ? "bg-success text-success-foreground hover:bg-success/90"
            : variant === "warning" ? "bg-warning text-warning-foreground hover:bg-warning/90"
            : "bg-destructive text-destructive-foreground hover:bg-destructive/90";
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button className={cls} size="sm">{label}</Button>
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
