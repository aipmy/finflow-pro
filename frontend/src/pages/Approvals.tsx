import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { formatRupiah, relativeTime } from "@/utils/format";
import { apiClient } from "@/services/apiClient";
import { CheckCircle2, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/stores/authStore";

export default function Approvals() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRequests(silent = false) {
      try {
        if (!silent) setLoading(true);
        const res = await apiClient.requests.list();
        setRequests(res);
      } catch (err: any) {
        if (!silent) toast.error("Gagal memuat pengajuan approval: " + err.message);
      } finally {
        if (!silent) setLoading(false);
      }
    }
    loadRequests();

    const interval = setInterval(() => {
      loadRequests(true);
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const pending = requests.filter(r => {
    const role = user?.role?.toLowerCase() || "";
    if (r.status === "SUBMITTED") {
      // Supervisor, Manager, Finance, and Admin can see and approve SUBMITTED
      return ["supervisor", "manager", "finance", "admin"].includes(role);
    }
    if (r.status === "APPROVED_BY_SUPERVISOR") {
      // Only Finance and Admin can see and approve APPROVED_BY_SUPERVISOR
      return ["finance", "admin"].includes(role);
    }
    return false;
  });

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
    <div className="p-4 lg:p-6 space-y-5 max-w-[1400px] mx-auto">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Pending Approval</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{pending.length} pengajuan menunggu tindakan Anda</p>
      </div>

      <Card className="border border-info/20 bg-info/5 backdrop-blur-md shadow-elegant relative overflow-hidden rounded-xl">
        <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-info/10 blur-xl" />
        <CardContent className="p-5 flex gap-4">
          <div className="w-10 h-10 rounded-xl bg-info/10 text-info flex items-center justify-center border border-info/20 shadow-sm flex-shrink-0">
            <Info className="h-5 w-5" />
          </div>
          <div className="text-xs space-y-1">
            <div className="font-bold text-info text-sm">Kebijakan Approval FinFlow Pro</div>
            <p className="text-muted-foreground max-w-2xl leading-relaxed">
              Sistem secara otomatis merutekan tingkat persetujuan (approval) pengajuan dana berdasarkan nominal berikut:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-2.5 rounded-lg bg-background/50 border border-border/60">
                <div className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">Kecil (&lt; Rp 500rb)</div>
                <div className="font-bold text-foreground mt-0.5 text-xs">Staff ➔ Finance</div>
              </div>
              <div className="p-2.5 rounded-lg bg-background/50 border border-border/60">
                <div className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">Sedang (Rp 500rb – 5jt)</div>
                <div className="font-bold text-foreground mt-0.5 text-xs">Staff ➔ Atasan ➔ Finance</div>
              </div>
              <div className="p-2.5 rounded-lg bg-background/50 border border-border/60">
                <div className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">Besar (&gt; Rp 5jt)</div>
                <div className="font-bold text-foreground mt-0.5 text-xs">Staff ➔ Atasan ➔ Manager ➔ Finance</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {pending.length === 0 ? (
        <Card className="border border-border/60 bg-card/50 backdrop-blur-md shadow-elegant rounded-xl">
          <CardContent className="p-16 text-center">
            <CheckCircle2 className="h-14 w-14 mx-auto text-success/40 mb-4 animate-bounce" />
            <div className="font-bold text-base mb-1 text-foreground">Semua sudah diproses</div>
            <div className="text-xs text-muted-foreground">Tidak ada pengajuan menunggu approval Anda saat ini</div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3.5">
          {pending.map(r => {
            const uName = r.requester?.name || "System";
            const dName = r.department?.name || "-";
            const sName = r.site?.name || "-";
            
            // Color highlight based on amount tier
            const isLarge = Number(r.amount) > 5000000;
            const highlightColor = isLarge ? "bg-amber-500" : "bg-primary";
            
            return (
              <Card key={r.id} className="relative overflow-hidden border border-border/65 bg-card/60 backdrop-blur-md shadow-elegant hover:-translate-y-0.5 transition-all duration-200 group rounded-xl">
                {/* Status vertical color bar */}
                <div className={`absolute top-0 left-0 w-1.5 h-full ${highlightColor}`} />
                
                <CardContent className="p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-block font-mono text-[10px] px-1.5 py-0.5 rounded bg-secondary/80 text-secondary-foreground border border-border/80 font-semibold tracking-tight shadow-sm">
                          {r.code}
                        </span>
                        <StatusBadge status={r.status} />
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-accent/10 text-accent border border-accent/20">
                          Jalur: {ruleFor(Number(r.amount))}
                        </span>
                      </div>
                      
                      <Link to={`/requests/${r.id}`} className="font-bold text-base text-foreground hover:text-primary transition-colors block leading-tight">
                        {r.title}
                      </Link>
                      
                      <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-1.5 font-medium">
                        <span className="text-foreground font-semibold">{uName}</span>
                        <span className="text-border">•</span>
                        <span>{dName}</span>
                        <span className="text-border">•</span>
                        <span>{sName}</span>
                        <span className="text-border">•</span>
                        <span className="italic text-muted-foreground/80">{relativeTime(r.createdAt)}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between lg:justify-end gap-6 pt-3 lg:pt-0 border-t lg:border-none border-dashed border-border/60">
                      <div className="text-left lg:text-right">
                        <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Jumlah Diajukan</div>
                        <div className="text-lg font-black text-foreground mt-0.5">{formatRupiah(Number(r.amount))}</div>
                      </div>
                      <Button asChild size="sm" className="gradient-primary text-primary-foreground shadow-sm px-4 h-9 font-semibold">
                        <Link to={`/requests/${r.id}`}>Tinjau</Link>
                      </Button>
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
