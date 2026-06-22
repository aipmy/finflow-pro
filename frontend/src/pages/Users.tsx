import { useState, useEffect } from "react";
import { Plus, Edit, Shield, Loader2, Lock, Trash2, Key, X, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, can } from "@/stores/authStore";
import { apiClient } from "@/services/apiClient";
import { toast } from "sonner";

const roleColors: Record<string, string> = {
  admin: "bg-destructive/10 text-destructive border-destructive/30",
  finance: "bg-primary/10 text-primary border-primary/30",
  supervisor: "bg-info/10 text-info border-info/30",
  manager: "bg-accent/10 text-accent border-accent/30",
  staff: "bg-muted text-muted-foreground border-border",
  auditor: "bg-warning/10 text-warning border-warning/30",
};

export default function Users() {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role?.toLowerCase() === "admin";

  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const [showChangePwModal, setShowChangePwModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [active, setActive] = useState(true);

  // Reset Password states
  const [newPassword, setNewPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, deptsData, sitesData, rolesData] = await Promise.all([
        apiClient.users.list(),
        apiClient.meta.departments(),
        apiClient.meta.sites(),
        apiClient.meta.roles()
      ]);
      setUsers(usersData);
      setDepartments(deptsData);
      setSites(sitesData);
      setRoles(rolesData);
    } catch (err: any) {
      toast.error(err.message || "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    if (!isAdmin) return;
    setIsEditing(false);
    setSelectedUser(null);
    setName("");
    setUsername("");
    setEmail("");
    setPassword("");
    // Default to staff role if exists
    const staffRole = roles.find(r => r.name.toLowerCase() === "staff");
    setRoleId(staffRole?.id || roles[0]?.id || "");
    setDepartmentId("");
    setSiteId("");
    setActive(true);
    setShowAddEditModal(true);
  };

  const handleOpenEdit = (u: any) => {
    if (!isAdmin) return;
    setIsEditing(true);
    setSelectedUser(u);
    setName(u.name);
    setUsername(u.username || "");
    setEmail(u.email);
    setPassword("");
    setRoleId(u.roleId || "");
    setDepartmentId(u.departmentId || "");
    setSiteId(u.siteId || "");
    setActive(u.active);
    setShowAddEditModal(true);
  };

  const handleOpenChangePw = (u: any) => {
    if (!isAdmin) return;
    setSelectedUser(u);
    setNewPassword("");
    setShowChangePwModal(true);
  };

  const handleOpenDelete = (u: any) => {
    if (!isAdmin) return;
    setSelectedUser(u);
    setShowDeleteConfirm(true);
  };

  const handleToggleStatus = async (u: any) => {
    if (!isAdmin) return;
    try {
      await apiClient.users.update(u.id, {
        name: u.name,
        username: u.username,
        email: u.email,
        roleId: u.roleId,
        departmentId: u.departmentId,
        siteId: u.siteId,
        active: !u.active
      });
      toast.success(`Status ${u.name} berhasil diubah menjadi ${!u.active ? "Aktif" : "Nonaktif"}`);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Gagal mengubah status");
    }
  };

  const handleAddEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim() || !email.trim() || !roleId) {
      toast.error("Semua field wajib diisi");
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        name,
        username,
        email,
        roleId,
        departmentId: departmentId || null,
        siteId: siteId || null,
        active
      };

      if (isEditing && selectedUser) {
        await apiClient.users.update(selectedUser.id, payload);
        toast.success("Pengguna berhasil diperbarui");
      } else {
        payload.password = password || "password123";
        await apiClient.users.create(payload);
        toast.success("Pengguna berhasil ditambahkan");
      }
      setShowAddEditModal(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan data pengguna");
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangePwSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.users.update(selectedUser.id, {
        name: selectedUser.name,
        username: selectedUser.username,
        email: selectedUser.email,
        roleId: selectedUser.roleId,
        departmentId: selectedUser.departmentId,
        siteId: selectedUser.siteId,
        active: selectedUser.active,
        password: newPassword
      });
      toast.success(`Password ${selectedUser.name} berhasil direset`);
      setShowChangePwModal(false);
    } catch (err: any) {
      toast.error(err.message || "Gagal mereset password");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      await apiClient.users.delete(selectedUser.id);
      toast.success("Pengguna berhasil dihapus");
      setShowDeleteConfirm(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus pengguna");
    } finally {
      setSubmitting(false);
    }
  };

  const formatLastLogin = (u: any) => {
    const lastSession = u.sessions?.[0];
    if (!lastSession || !lastSession.createdAt) {
      return "Belum pernah";
    }
    const date = new Date(lastSession.createdAt);
    return date.toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Memuat data pengguna...</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Manajemen Pengguna</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{users.length} pengguna terdaftar</p>
        </div>
        {isAdmin && (
          <Button size="sm" className="gradient-primary text-primary-foreground" onClick={handleOpenAdd}>
            <Plus className="h-4 w-4 mr-1.5" />Pengguna Baru
          </Button>
        )}
      </div>

      <Card className="shadow-elegant hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left p-3 font-medium">Nama</th>
                <th className="text-left p-3 font-medium">Username</th>
                <th className="text-left p-3 font-medium">Email</th>
                <th className="text-left p-3 font-medium">Role</th>
                <th className="text-left p-3 font-medium">Departemen / Site</th>
                <th className="text-left p-3 font-medium">Last Login</th>
                <th className="text-left p-3 font-medium">Status</th>
                {isAdmin && <th className="text-right p-3 font-medium">Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const roleName = u.role?.name || "staff";
                return (
                  <tr key={u.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full gradient-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center">
                          {u.name.split(" ").map((s: string) => s[0]).slice(0, 2).join("")}
                        </div>
                        <span className="font-medium">{u.name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-xs font-mono">{u.username || "-"}</td>
                    <td className="p-3 text-xs text-muted-foreground">{u.email}</td>
                    <td className="p-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-md border font-medium capitalize ${roleColors[roleName] || "bg-muted"}`}>
                        {roleName}
                      </span>
                    </td>
                    <td className="p-3 text-xs">
                      <div>{u.department?.name || "-"}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{u.site?.name || "-"}</div>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">{formatLastLogin(u)}</td>
                    <td className="p-3">
                      <button
                        onClick={() => handleToggleStatus(u)}
                        disabled={!isAdmin || u.id === currentUser?.id}
                        className={`text-[10px] px-2 py-0.5 rounded-md font-medium border transition-colors ${
                          u.active
                            ? "bg-success/10 text-success border-success/30 hover:bg-success/20"
                            : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                        }`}
                      >
                        {u.active ? "Aktif" : "Nonaktif"}
                      </button>
                    </td>
                    {isAdmin && (
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => handleOpenEdit(u)}
                            title="Edit Pengguna"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => handleOpenChangePw(u)}
                            title="Reset Password"
                          >
                            <Key className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                            onClick={() => handleOpenDelete(u)}
                            disabled={u.id === currentUser?.id}
                            title="Hapus Pengguna"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Mobile view */}
      <div className="md:hidden space-y-2">
        {users.map((u) => {
          const roleName = u.role?.name || "staff";
          return (
            <Card key={u.id} className="shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full gradient-accent text-accent-foreground text-xs font-bold flex items-center justify-center">
                    {u.name.split(" ").map((s: string) => s[0]).slice(0, 2).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{u.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{u.email}</div>
                  </div>
                  <button
                    onClick={() => handleToggleStatus(u)}
                    disabled={!isAdmin || u.id === currentUser?.id}
                    className={`text-[10px] px-2 py-0.5 rounded-md font-medium border ${
                      u.active
                        ? "bg-success/10 text-success border-success/30"
                        : "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {u.active ? "Aktif" : "Nonaktif"}
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border text-[11px]">
                  <span className={`text-[10px] px-2 py-0.5 rounded-md border capitalize ${roleColors[roleName] || "bg-muted"}`}>
                    {roleName}
                  </span>
                  <span className="text-muted-foreground">{u.department?.name || "-"}</span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">{u.site?.name || "-"}</span>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border text-[10px] text-muted-foreground">
                  <span>Login: {formatLastLogin(u)}</span>
                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleOpenEdit(u)}><Edit className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleOpenChangePw(u)}><Key className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleOpenDelete(u)} disabled={u.id === currentUser?.id}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Role list Card */}
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

      {/* Add / Edit User Modal */}
      {showAddEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setShowAddEditModal(false)} />
          <div className="relative bg-card text-card-foreground border border-border w-full max-w-md rounded-xl shadow-elevated p-6 animate-in zoom-in-95 duration-150 z-10">
            <button onClick={() => setShowAddEditModal(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
            <h2 className="text-base font-semibold tracking-tight mb-4">
              {isEditing ? "Edit Pengguna" : "Pengguna Baru"}
            </h2>
            <form onSubmit={handleAddEditSubmit} className="space-y-3.5">
              <div>
                <Label className="text-xs">Nama Lengkap</Label>
                <Input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Nama Lengkap"
                  className="mt-1"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Username</Label>
                  <Input
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="username"
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="email@domain.com"
                    className="mt-1"
                    required
                  />
                </div>
              </div>

              {!isEditing && (
                <div>
                  <Label className="text-xs">Password Awal</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter (default: password123)"
                    className="mt-1"
                  />
                </div>
              )}

              <div>
                <Label className="text-xs">Role</Label>
                <select
                  value={roleId}
                  onChange={e => setRoleId(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                >
                  <option value="" disabled>Pilih Role</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Departemen</Label>
                  <select
                    value={departmentId}
                    onChange={e => setDepartmentId(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Non-departemen (Semua)</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Site</Label>
                  <select
                    value={siteId}
                    onChange={e => setSiteId(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Non-site (Semua)</option>
                    {sites.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={active}
                  onChange={e => setActive(e.target.checked)}
                  className="rounded border-input text-primary focus:ring-ring h-4 w-4"
                />
                <Label htmlFor="active" className="text-xs font-medium cursor-pointer">Pengguna Aktif</Label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddEditModal(false)}>
                  Batal
                </Button>
                <Button type="submit" size="sm" disabled={submitting}>
                  {submitting && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
                  Simpan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showChangePwModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setShowChangePwModal(false)} />
          <div className="relative bg-card text-card-foreground border border-border w-full max-w-sm rounded-xl shadow-elevated p-6 animate-in zoom-in-95 duration-150 z-10">
            <button onClick={() => setShowChangePwModal(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
            <h2 className="text-base font-semibold tracking-tight mb-2">Reset Password</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Masukkan password baru untuk pengguna <strong>{selectedUser?.name}</strong>.
            </p>
            <form onSubmit={handleChangePwSubmit} className="space-y-4">
              <div>
                <Label className="text-xs">Password Baru</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="mt-1"
                  required
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowChangePwModal(false)}>
                  Batal
                </Button>
                <Button type="submit" size="sm" disabled={submitting || !newPassword.trim()}>
                  {submitting && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
                  Simpan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative bg-card text-card-foreground border border-border w-full max-w-sm rounded-xl shadow-elevated p-6 animate-in zoom-in-95 duration-150 z-10">
            <h2 className="text-base font-semibold tracking-tight mb-2">Konfirmasi Hapus Pengguna</h2>
            <p className="text-xs text-muted-foreground mb-6">
              Apakah Anda yakin ingin menghapus pengguna <strong>{selectedUser?.name}</strong> ({selectedUser?.email})? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowDeleteConfirm(false)}>
                Batal
              </Button>
              <Button type="button" variant="destructive" size="sm" onClick={handleDeleteSubmit} disabled={submitting}>
                {submitting && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
                Hapus
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
