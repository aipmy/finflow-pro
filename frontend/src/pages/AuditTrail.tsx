import { useEffect, useState, useMemo } from "react";
import { Search, History, User as UserIcon, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { apiClient } from "@/services/apiClient";
import { formatDateTime } from "@/utils/format";
import { toast } from "sonner";

const actionColor: Record<string, string> = {
  APPROVE: "text-success font-semibold",
  REJECT: "text-destructive font-semibold",
  REVISE: "text-warning font-semibold",
  CREATE: "text-info font-semibold",
  UPDATE: "text-primary font-semibold",
  DELETE: "text-destructive font-semibold",
  LOGIN: "text-success font-semibold",
  EXPORT: "text-info font-semibold",
  REALIZED: "text-primary font-semibold",
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
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Memuat log audit...</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1400px] mx-auto">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Audit Trail</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Riwayat aktivitas seluruh pengguna sistem</p>
      </div>

      <Card className="shadow-elegant">
        <CardContent className="p-4">
          <div className="grid sm:grid-cols-3 gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Cari pembuat, target, atau aksi..." value={q} onChange={e => setQ(e.target.value)} />
            </div>
            <Select value={mod} onValueChange={setMod}>
              <SelectTrigger><SelectValue placeholder="Pilih Modul" /></SelectTrigger>
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
              <SelectTrigger><SelectValue placeholder="Pilih Pengguna" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua User</SelectItem>
                {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-elegant">
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {list.length === 0 ? (
              <div className="p-12 text-center text-sm text-muted-foreground">
                <History className="h-10 w-10 mx-auto mb-2 opacity-30" />
                Tidak ada aktivitas audit tercatat.
              </div>
            ) : list.map(l => {
              const uName = l.user?.name || "System";
              return (
                <div key={l.id} className="flex items-center gap-3 p-4 hover:bg-muted/30">
                  <div className="w-9 h-9 rounded-full gradient-accent text-accent-foreground flex items-center justify-center flex-shrink-0">
                    <UserIcon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">
                      <span className="font-semibold">{uName}</span>{" "}
                      <span className={actionColor[l.action] || "text-muted-foreground"}>{l.action.toLowerCase().replace("_", " ")}</span>{" "}
                      {l.target && (
                        <>
                          <span className="text-muted-foreground">pada</span>{" "}
                          <span className="font-mono text-xs px-1.5 py-0.5 bg-muted rounded">{l.target}</span>
                        </>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      Modul: {l.module} {l.ipAddress ? `• IP: ${l.ipAddress}` : ""}
                    </div>
                  </div>
                  <div className="text-[11px] text-muted-foreground text-right whitespace-nowrap">{formatDateTime(l.timestamp)}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
