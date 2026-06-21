import { Plus, Edit, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { users, departments, sites } from "@/data/mockData";

const roleColors: Record<string, string> = {
  admin: "bg-destructive/10 text-destructive border-destructive/30",
  finance: "bg-primary/10 text-primary border-primary/30",
  supervisor: "bg-info/10 text-info border-info/30",
  manager: "bg-accent/10 text-accent border-accent/30",
  staff: "bg-muted text-muted-foreground border-border",
  auditor: "bg-warning/10 text-warning border-warning/30",
};

export default function Users() {
  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Manajemen Pengguna</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{users.length} pengguna terdaftar</p>
        </div>
        <Button size="sm" className="gradient-primary text-primary-foreground"><Plus className="h-4 w-4 mr-1.5" />Pengguna Baru</Button>
      </div>

      <Card className="shadow-elegant hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left p-3 font-medium">Nama</th>
                <th className="text-left p-3 font-medium">Email</th>
                <th className="text-left p-3 font-medium">Role</th>
                <th className="text-left p-3 font-medium">Departemen</th>
                <th className="text-left p-3 font-medium">Site</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-right p-3 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const d = departments.find(x => x.id === u.department);
                const s = sites.find(x => x.id === u.site);
                return (
                  <tr key={u.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full gradient-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center">
                          {u.name.split(" ").map(s => s[0]).slice(0, 2).join("")}
                        </div>
                        <span className="font-medium">{u.name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">{u.email}</td>
                    <td className="p-3"><span className={`text-[10px] px-2 py-0.5 rounded-md border font-medium capitalize ${roleColors[u.role]}`}>{u.role}</span></td>
                    <td className="p-3 text-xs">{d?.name}</td>
                    <td className="p-3 text-xs">{s?.name}</td>
                    <td className="p-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${u.active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                        {u.active ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7"><Edit className="h-3.5 w-3.5" /></Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="md:hidden space-y-2">
        {users.map(u => {
          const d = departments.find(x => x.id === u.department);
          return (
            <Card key={u.id} className="shadow-sm"><CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full gradient-accent text-accent-foreground text-xs font-bold flex items-center justify-center">
                  {u.name.split(" ").map(s => s[0]).slice(0, 2).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{u.name}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{u.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
                <span className={`text-[10px] px-2 py-0.5 rounded-md border capitalize ${roleColors[u.role]}`}>{u.role}</span>
                <span className="text-[10px] text-muted-foreground">{d?.name}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-md ml-auto ${u.active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                  {u.active ? "Aktif" : "Nonaktif"}
                </span>
              </div>
            </CardContent></Card>
          );
        })}
      </div>

      <Card className="shadow-elegant">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4" />Role & Permissions</CardTitle></CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {[
              { role: "Admin", perms: ["Manage users", "Manage settings", "Full access"] },
              { role: "Finance", perms: ["Verify expenses", "Input realization", "Export reports"] },
              { role: "Supervisor", perms: ["Approve requests", "Request revision"] },
              { role: "Manager", perms: ["Approve level 2", "View reports"] },
              { role: "Staff", perms: ["Create requests", "View own data"] },
              { role: "Auditor", perms: ["View reports", "View audit trail"] },
            ].map(p => (
              <div key={p.role} className="p-3 rounded-md border border-border">
                <div className={`text-[10px] inline-block px-2 py-0.5 rounded mb-2 capitalize ${roleColors[p.role.toLowerCase()]}`}>{p.role}</div>
                <ul className="space-y-1 text-muted-foreground">
                  {p.perms.map(x => <li key={x}>• {x}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
