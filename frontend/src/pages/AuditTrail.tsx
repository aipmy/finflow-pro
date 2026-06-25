import { useEffect, useState, useMemo } from "react";
import { 
  Search, History, Loader2, LogIn, Trash2, PlusCircle, 
  Edit3, CheckCircle2, XCircle, AlertCircle, Download, Clock, Shield
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { apiClient } from "@/services/apiClient";
import { formatDateTime } from "@/utils/format";
import { toast } from "sonner";

const actionConfigs: Record<string, { badge: string; icon: any; iconColor: string; iconBg: string }> = {
  APPROVE: { badge: "bg-success/10 text-success border-success/20", icon: CheckCircle2, iconColor: "text-success", iconBg: "bg-success/10" },
  REJECT: { badge: "bg-destructive/10 text-destructive border-destructive/20", icon: XCircle, iconColor: "text-destructive", iconBg: "bg-destructive/10" },
  REVISE: { badge: "bg-warning/10 text-warning border-warning/20", icon: AlertCircle, iconColor: "text-warning", iconBg: "bg-warning/10" },
  CREATE: { badge: "bg-info/10 text-info border-info/20", icon: PlusCircle, iconColor: "text-info", iconBg: "bg-info/10" },
  UPDATE: { badge: "bg-primary/10 text-primary border-primary/20", icon: Edit3, iconColor: "text-primary", iconBg: "bg-primary/10" },
  DELETE: { badge: "bg-destructive/10 text-destructive border-destructive/20", icon: Trash2, iconColor: "text-destructive", iconBg: "bg-destructive/10" },
  LOGIN: { badge: "bg-success/10 text-success border-success/20", icon: LogIn, iconColor: "text-success", iconBg: "bg-success/10" },
  EXPORT: { badge: "bg-info/10 text-info border-info/20", icon: Download, iconColor: "text-info", iconBg: "bg-info/10" },
  REALIZED: { badge: "bg-primary/10 text-primary border-primary/20", icon: CheckCircle2, iconColor: "text-primary", iconBg: "bg-primary/10" },
};

const getActionConfig = (action: string) => {
  const normalized = action.toUpperCase();
  return actionConfigs[normalized] || {
    badge: "bg-muted text-muted-foreground border-border",
    icon: History,
    iconColor: "text-muted-foreground",
    iconBg: "bg-muted"
  };
};

export default function AuditTrail() {
  const [q, setQ] = useState("");
  const [mod, setMod] = useState("all");
  const [selectedUser, setSelectedUser] = useState("all");
  const [logs, setLogs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData(silent = false) {
      try {
        if (!silent) setLoading(true);
        const [logsRes, usersRes] = await Promise.all([
          apiClient.audit.list(),
          apiClient.users.list()
        ]);
        setLogs(logsRes);
        setUsers(usersRes);
      } catch (err: any) {
        if (!silent) toast.error("Gagal memuat log audit: " + err.message);
      } finally {
        if (!silent) setLoading(false);
      }
    }
    loadData();

    const interval = setInterval(() => {
      loadData(true);
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const list = useMemo(() => {
    return logs.filter(l => {
      const actorName = l.user?.name || "Sistem / Tamu";
      const targetText = l.target || "";
      const actionText = l.action || "";
      const textMatch = `${actorName} ${targetText} ${actionText}`.toLowerCase().includes(q.toLowerCase());
      if (q && !textMatch) return false;
      if (mod !== "all" && l.module !== mod) return false;
      if (selectedUser !== "all" && l.userId !== selectedUser) return false;
      return true;
    });
  }, [q, mod, selectedUser, logs]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="h-9 w-9 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">Memuat log audit...</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Audit Trail
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
            Riwayat log aktivitas keamanan dan operasional seluruh pengguna sistem
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 border border-border/60 px-3 py-1.5 rounded-lg w-fit self-start">
          <Clock className="h-3.5 w-3.5" />
          <span>Auto-refresh setiap 15 detik</span>
        </div>
      </div>

      {/* Filter Card */}
      <Card className="border border-border/60 bg-card/60 backdrop-blur-md shadow-elegant rounded-xl overflow-hidden">
        <CardContent className="p-4">
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                className="pl-9 bg-background/50 border-border/80 hover:border-border transition-colors rounded-lg" 
                placeholder="Cari pembuat, target, atau aksi..." 
                value={q} 
                onChange={e => setQ(e.target.value)} 
              />
            </div>
            <Select value={mod} onValueChange={setMod}>
              <SelectTrigger className="bg-background/50 border-border/80 hover:border-border transition-colors rounded-lg">
                <SelectValue placeholder="Pilih Modul" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Modul</SelectItem>
                <SelectItem value="REQUESTS">Pengajuan</SelectItem>
                <SelectItem value="APPROVALS">Approval</SelectItem>
                <SelectItem value="FINANCE">Finance</SelectItem>
                <SelectItem value="INVENTORY">Inventory</SelectItem>
                <SelectItem value="USERS">Pengguna</SelectItem>
                <SelectItem value="REPORTS">Laporan</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="bg-background/50 border-border/80 hover:border-border transition-colors rounded-lg">
                <SelectValue placeholder="Pilih Pengguna" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua User</SelectItem>
                {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Timeline List */}
      <div className="relative pl-6 md:pl-8 border-l border-border/70 ml-4 md:ml-6 space-y-6 py-2">
        {list.length === 0 ? (
          <Card className="border border-border/60 bg-card/50 backdrop-blur-md shadow-elegant rounded-xl -ml-6 md:-ml-8">
            <CardContent className="p-16 text-center">
              <History className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <div className="font-bold text-base mb-1 text-foreground">Tidak ada aktivitas</div>
              <div className="text-xs text-muted-foreground">Tidak ada riwayat audit tercatat yang sesuai kriteria pencarian.</div>
            </CardContent>
          </Card>
        ) : (
          list.map(l => {
            const uName = l.user?.name || "System / Tamu";
            const config = getActionConfig(l.action);
            const ActionIcon = config.icon;

            return (
              <div key={l.id} className="relative group">
                {/* Timeline Dot with Action Icon */}
                <div className={`absolute -left-[38px] md:-left-[46px] top-1 flex items-center justify-center w-8 h-8 rounded-full border border-background bg-card shadow-sm transition-all duration-200 group-hover:scale-115 ${config.iconBg} ${config.iconColor}`}>
                  <ActionIcon className="h-4 w-4" />
                </div>

                {/* Audit Card Box */}
                <Card className="border border-border/60 bg-card/50 backdrop-blur-md shadow-elegant hover:shadow-elevated transition-all duration-200 hover:-translate-y-0.5 rounded-xl overflow-hidden">
                  <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-bold text-foreground tracking-tight">{uName}</span>
                        
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${config.badge}`}>
                          {l.action.replace("_", " ")}
                        </span>

                        {l.target && (
                          <span className="text-muted-foreground flex items-center gap-1 text-xs">
                            pada
                            <code className="font-mono text-xs px-1.5 py-0.5 bg-muted/80 text-foreground border border-border/50 rounded font-semibold">
                              {l.target}
                            </code>
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-bold px-1.5 py-0.5 rounded bg-primary/5 text-primary border border-primary/10 text-[9px] uppercase font-mono tracking-wider">
                          Modul: {l.module}
                        </span>
                        {l.ipAddress && (
                          <>
                            <span className="text-border/80 font-normal">•</span>
                            <span className="font-mono text-muted-foreground/80 bg-muted/40 px-1 rounded">IP: {l.ipAddress}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="text-right whitespace-nowrap shrink-0 border-t md:border-t-0 border-dashed border-border/50 pt-2.5 md:pt-0">
                      <span className="text-xs font-bold text-muted-foreground tracking-tight bg-secondary/60 border border-border/50 px-2 py-1 rounded">
                        {formatDateTime(l.timestamp)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

