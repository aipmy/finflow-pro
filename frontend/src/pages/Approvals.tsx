import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { formatRupiah, relativeTime } from "@/utils/format";
import { apiClient } from "@/services/apiClient";
import { CheckCircle2, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Approvals() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRequests() {
      try {
        setLoading(true);
        const res = await apiClient.requests.list();
        setRequests(res);
      } catch (err: any) {
        toast.error("Gagal memuat pengajuan approval: " + err.message);
      } finally {
        setLoading(false);
      }
    }
    loadRequests();
  }, []);

  const pending = requests.filter(r => ["SUBMITTED", "APPROVED_BY_SUPERVISOR"].includes(r.status));

  const ruleFor = (amount: number) => {
    if (amount < 500000) return "Staff → Finance";
    if (amount <= 5000000) return "Staff → Atasan → Finance";
    return "Staff → Atasan → Manager → Finance";
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Memuat data approval...</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1400px] mx-auto">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Pending Approval</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{pending.length} pengajuan menunggu tindakan Anda</p>
      </div>

      <Card className="shadow-elegant bg-info/5 border-info/30">
        <CardContent className="p-4 flex gap-3">
          <Info className="h-5 w-5 text-info flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <div className="font-semibold text-info mb-1">Aturan Approval Otomatis</div>
            <div className="space-y-0.5 text-muted-foreground">
              <div>• &lt; Rp 500.000: Staff → Finance</div>
              <div>• Rp 500.000 – Rp 5.000.000: Staff → Atasan → Finance</div>
              <div>• &gt; Rp 5.000.000: Staff → Atasan → Manager → Finance</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {pending.length === 0 ? (
        <Card className="shadow-elegant">
          <CardContent className="p-12 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto text-success/40 mb-3" />
            <div className="font-medium text-sm mb-1">Semua sudah diproses</div>
            <div className="text-xs text-muted-foreground">Tidak ada pengajuan menunggu approval</div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {pending.map(r => {
            const uName = r.requester?.name || "System";
            const dName = r.department?.name || "-";
            const sName = r.site?.name || "-";
            return (
              <Card key={r.id} className="shadow-elegant hover:shadow-elevated transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-mono text-muted-foreground">{r.code}</span>
                        <StatusBadge status={r.status} />
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{ruleFor(Number(r.amount))}</span>
                      </div>
                      <Link to={`/requests/${r.id}`} className="font-medium text-sm hover:text-primary block">{r.title}</Link>
                      <div className="text-[11px] text-muted-foreground mt-1">{uName} • {dName} • {sName} • {relativeTime(r.createdAt)}</div>
                    </div>
                    <div className="flex items-center justify-between lg:justify-end gap-3">
                      <div className="text-right">
                        <div className="text-[10px] text-muted-foreground">Jumlah</div>
                        <div className="font-bold">{formatRupiah(Number(r.amount))}</div>
                      </div>
                      <Button asChild size="sm" className="gradient-primary text-primary-foreground"><Link to={`/requests/${r.id}`}>Tinjau</Link></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
