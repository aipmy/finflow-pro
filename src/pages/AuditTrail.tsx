import { useMemo, useState } from "react";
import { Search, History, User as UserIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { auditLogs, users } from "@/data/mockData";
import { formatDateTime } from "@/utils/format";

const actionColor: Record<string, string> = {
  APPROVE: "text-success",
  REJECT: "text-destructive",
  REVISION: "text-warning",
  CREATE: "text-info",
  REALIZE: "text-primary",
  CLOSE: "text-success",
  STOCK_IN: "text-success",
  STOCK_OUT: "text-info",
};

export default function AuditTrail() {
  const [q, setQ] = useState("");
  const [mod, setMod] = useState("all");
  const [user, setUser] = useState("all");

  const list = useMemo(() => auditLogs.filter(l => {
    if (q && !`${l.target} ${l.action}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (mod !== "all" && l.module !== mod) return false;
    if (user !== "all" && l.userId !== user) return false;
    return true;
  }), [q, mod, user]);

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1400px] mx-auto">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Audit Trail</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Riwayat aktivitas seluruh pengguna sistem</p>
      </div>

      <Card className="shadow-elegant"><CardContent className="p-4">
        <div className="grid sm:grid-cols-3 gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Cari target atau aksi..." value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <Select value={mod} onValueChange={setMod}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Modul</SelectItem>
              <SelectItem value="REQUESTS">Pengajuan</SelectItem>
              <SelectItem value="APPROVALS">Approval</SelectItem>
              <SelectItem value="FINANCE">Finance</SelectItem>
              <SelectItem value="INVENTORY">Inventory</SelectItem>
              <SelectItem value="USERS">Pengguna</SelectItem>
            </SelectContent>
          </Select>
          <Select value={user} onValueChange={setUser}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua User</SelectItem>
              {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CardContent></Card>

      <Card className="shadow-elegant"><CardContent className="p-0">
        <div className="divide-y divide-border">
          {list.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              <History className="h-10 w-10 mx-auto mb-2 opacity-30" />
              Tidak ada aktivitas
            </div>
          ) : list.map(l => {
            const u = users.find(x => x.id === l.userId);
            return (
              <div key={l.id} className="flex items-center gap-3 p-4 hover:bg-muted/30">
                <div className="w-9 h-9 rounded-full gradient-accent text-accent-foreground flex items-center justify-center flex-shrink-0">
                  <UserIcon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm">
                    <span className="font-medium">{u?.name}</span>{" "}
                    <span className={actionColor[l.action] || "text-muted-foreground"}>{l.action.toLowerCase().replace("_", " ")}</span>{" "}
                    <span className="text-muted-foreground">pada</span>{" "}
                    <span className="font-mono text-xs px-1.5 py-0.5 bg-muted rounded">{l.target}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {l.module} • IP {l.ip}
                  </div>
                </div>
                <div className="text-[11px] text-muted-foreground text-right whitespace-nowrap">{formatDateTime(l.timestamp)}</div>
              </div>
            );
          })}
        </div>
      </CardContent></Card>
    </div>
  );
}
