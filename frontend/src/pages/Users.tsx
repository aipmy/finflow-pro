import { useState, useEffect } from "react";
import { Plus, Edit, Shield, Loader2, Lock, Trash2, Key, X, Check, Users as UsersIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/stores/authStore";
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
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="h-9 w-9 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">Memuat data pengguna...</p>
      </div>
    );
  }

  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.active).length;
  const adminFinanceUsers = users.filter(u => {
    const rName = u.role?.name?.toLowerCase() || "";
    return rName === "admin" || rName === "finance";
  }).length;

  const getAvatarGradient = (name: string) => {
    const code = (name || "").charCodeAt(0) + ((name || "").charCodeAt(1) || 0);
    const gradients = [
      "from-pink-500 to-rose-500 text-white",
      "from-purple-500 to-indigo-500 text-white",
      "from-blue-500 to-cyan-500 text-white",
      "from-teal-500 to-emerald-500 text-white",
      "from-amber-500 to-orange-500 text-white",
    ];
    return gradients[code % gradients.length];
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <UsersIcon className="h-6 w-6 text-primary" />
            Manajemen Pengguna
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
            Kelola data akun pengguna, role, departemen, dan tingkat hak akses sistem
          </p>
        </div>
        {isAdmin && (
          <Button size="sm" className="gradient-primary text-primary-foreground shadow-sm h-9 px-4 font-semibold rounded-lg" onClick={handleOpenAdd}>
            <Plus className="h-4 w-4 mr-1.5" />Pengguna Baru
          </Button>
        )}
      </div>

      {/* Quick Stats Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-border/60 bg-card/60 backdrop-blur-md shadow-elegant relative overflow-hidden rounded-xl">
          <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-primary/10 blur-xl" />
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Pengguna</div>
              <div className="text-3xl font-black text-foreground mt-1">{totalUsers}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Seluruh akun terdaftar</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shadow-sm">
              <UsersIcon className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card/60 backdrop-blur-md shadow-elegant relative overflow-hidden rounded-xl">
          <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-success/10 blur-xl" />
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Pengguna Aktif</div>
              <div className="text-3xl font-black text-success mt-1">{activeUsers}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Memiliki akses ke sistem</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-success/10 border border-success/20 text-success flex items-center justify-center shadow-sm">
              <Check className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card/60 backdrop-blur-md shadow-elegant relative overflow-hidden rounded-xl">
          <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-info/10 blur-xl" />
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Keuangan & Admin</div>
              <div className="text-3xl font-black text-info mt-1">{adminFinanceUsers}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Pengelola & Verifikator</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-info/10 border border-info/20 text-info flex items-center justify-center shadow-sm">
              <Shield className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Desktop Table View */}
      <Card className="border border-border/60 bg-card/60 backdrop-blur-md shadow-elegant rounded-xl overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50">
              <tr>
                <th className="text-left p-4 font-bold">Nama</th>
                <th className="text-left p-4 font-bold">Username</th>
                <th className="text-left p-4 font-bold">Email</th>
                <th className="text-left p-4 font-bold">Role</th>
                <th className="text-left p-4 font-bold">Departemen / Site</th>
                <th className="text-left p-4 font-bold">Last Login</th>
                <th className="text-left p-4 font-bold">Status</th>
                {isAdmin && <th className="text-right p-4 font-bold">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {users.map((u) => {
                const roleName = u.role?.name || "staff";
                return (
                  <tr key={u.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${getAvatarGradient(u.name)} text-[11px] font-black flex items-center justify-center shadow-sm flex-shrink-0 border border-white/10`}>
                          {u.name.split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase()}
                        </div>
                        <span className="font-bold text-foreground">{u.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-xs font-mono font-semibold text-muted-foreground bg-muted/20 px-2.5 py-1 rounded-md max-w-fit">{u.username || "-"}</td>
                    <td className="p-4 text-xs font-medium text-muted-foreground">{u.email}</td>
                    <td className="p-4">
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-bold capitalize tracking-wide ${roleColors[roleName.toLowerCase()] || "bg-muted"}`}>
                        {roleName}
                      </span>
                    </td>
                    <td className="p-4 text-xs">
                      <div className="font-semibold text-foreground">{u.department?.name || "-"}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 font-medium">{u.site?.name || "-"}</div>
                    </td>
                    <td className="p-4 text-xs font-medium text-muted-foreground">{formatLastLogin(u)}</td>
                    <td className="p-4">
                      <button
                        onClick={() => handleToggleStatus(u)}
                        disabled={!isAdmin || u.id === currentUser?.id}
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border transition-all ${
                          u.active
                            ? "bg-success/10 text-success border-success/30 hover:bg-success/20"
                            : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                        }`}
                      >
                        {u.active ? "Aktif" : "Nonaktif"}
                      </button>
                    </td>
                    {isAdmin && (
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent hover:border-border"
                            onClick={() => handleOpenEdit(u)}
                            title="Edit Pengguna"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent hover:border-border"
                            onClick={() => handleOpenChangePw(u)}
                            title="Reset Password"
                          >
                            <Key className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/20"
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
      <div className="md:hidden space-y-3">
        {users.map((u) => {
          const roleName = u.role?.name || "staff";
          return (
            <Card key={u.id} className="border border-border/60 bg-card/60 backdrop-blur-md shadow-elegant rounded-xl overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getAvatarGradient(u.name)} text-xs font-black flex items-center justify-center shadow-sm flex-shrink-0 border border-white/10`}>
                    {u.name.split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-foreground text-sm">{u.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{u.email}</div>
                  </div>
                  <button
                    onClick={() => handleToggleStatus(u)}
                    disabled={!isAdmin || u.id === currentUser?.id}
                    className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border transition-colors ${
                      u.active
                        ? "bg-success/10 text-success border-success/30"
                        : "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {u.active ? "Aktif" : "Nonaktif"}
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50 text-[11px] font-medium">
                  <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold capitalize tracking-wide ${roleColors[roleName.toLowerCase()] || "bg-muted"}`}>
                    {roleName}
                  </span>
                  <span className="text-muted-foreground">{u.department?.name || "-"}</span>
                  <span className="text-border/80 font-normal">•</span>
                  <span className="text-muted-foreground">{u.site?.name || "-"}</span>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50 text-[10px] text-muted-foreground font-semibold">
                  <span>Login: {formatLastLogin(u)}</span>
                  {isAdmin && (
                    <div className="flex items-center gap-1.5">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted border border-border/40" onClick={() => handleOpenEdit(u)}><Edit className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted border border-border/40" onClick={() => handleOpenChangePw(u)}><Key className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10 border border-destructive/20" onClick={() => handleOpenDelete(u)} disabled={u.id === currentUser?.id}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Role list Card */}
      <Card className="border border-border/60 bg-card/60 backdrop-blur-md shadow-elegant rounded-xl overflow-hidden">
        <CardHeader className="border-b border-border/50 bg-muted/20">
          <CardTitle className="text-base flex items-center gap-2 font-bold text-foreground">
            <Shield className="h-4.5 w-4.5 text-primary animate-pulse" />
            Hak Akses & Otoritas Sistem
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {[
              { role: "Admin", perms: ["Kelola data seluruh pengguna", "Konfigurasi parameter sistem", "Akses kontrol penuh log audit"] },
              { role: "Finance", perms: ["Verifikasi realisasi keuangan pengajuan", "Input transaksi kas kecil manual", "Ekspor dokumen laporan laba rugi"] },
              { role: "Supervisor", perms: ["Approve pengajuan level 1 (< Rp 5jt)", "Minta revisi pengajuan dana", "Lihat log aktivitas parsial"] },
              { role: "Manager", perms: ["Approve pengajuan dana level 2 (> Rp 5jt)", "Ekspor data laporan", "Analisis dasbor eksekutif"] },
              { role: "Staff", perms: ["Buat pengajuan dana operasional baru", "Lihat riwayat status pengajuan pribadi", "Upload berkas bukti pembayaran"] },
              { role: "Auditor", perms: ["Lihat seluruh laporan laporan keuangan", "Akses halaman log audit trail", "Analisis distribusi kategori"] },
            ].map(p => (
              <div key={p.role} className="p-3.5 rounded-xl border border-border/60 bg-background/30 hover:border-primary/30 transition-all duration-200">
                <div className={`text-[10px] inline-block px-2.5 py-0.5 rounded-full border font-bold mb-3 capitalize tracking-wide ${roleColors[p.role.toLowerCase()]}`}>{p.role}</div>
                <ul className="space-y-1.5 text-muted-foreground font-medium text-[11px]">
                  {p.perms.map(x => <li key={x} className="flex items-start gap-1"><span>•</span> <span>{x}</span></li>)}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add / Edit User Modal */}
      {showAddEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-foreground/45 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowAddEditModal(false)} />
          <div className="relative bg-card text-card-foreground border border-border/70 w-full max-w-md rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-150 z-10 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-accent to-info" />
            
            <button onClick={() => setShowAddEditModal(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 hover:bg-muted rounded-full transition-colors">
              <X className="h-4 w-4" />
            </button>
            <h2 className="text-base font-bold tracking-tight mb-4 flex items-center gap-2">
              <Shield className="h-4.5 w-4.5 text-primary" />
              {isEditing ? "Edit Pengguna" : "Pengguna Baru"}
            </h2>
            <form onSubmit={handleAddEditSubmit} className="space-y-4">
              <div>
                <Label className="text-xs font-bold text-muted-foreground">Nama Lengkap</Label>
                <Input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Nama Lengkap"
                  className="mt-1 bg-background/50 border-border/80 hover:border-border transition-colors rounded-lg h-9 text-sm"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold text-muted-foreground">Username</Label>
                  <Input
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="username"
                    className="mt-1 bg-background/50 border-border/80 hover:border-border transition-colors rounded-lg h-9 text-sm"
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-muted-foreground">Email</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="email@domain.com"
                    className="mt-1 bg-background/50 border-border/80 hover:border-border transition-colors rounded-lg h-9 text-sm"
                    required
                  />
                </div>
              </div>

              {!isEditing && (
                <div>
                  <Label className="text-xs font-bold text-muted-foreground">Password Awal</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter (default: password123)"
                    className="mt-1 bg-background/50 border-border/80 hover:border-border transition-colors rounded-lg h-9 text-sm"
                  />
                </div>
              )}

              <div>
                <Label className="text-xs font-bold text-muted-foreground">Role</Label>
                <select
                  value={roleId}
                  onChange={e => setRoleId(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-border/80 bg-background/50 hover:border-border transition-colors text-sm focus:outline-none focus:ring-2 focus:ring-primary/45 h-9"
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
                  <Label className="text-xs font-bold text-muted-foreground">Departemen</Label>
                  <select
                    value={departmentId}
                    onChange={e => setDepartmentId(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-border/80 bg-background/50 hover:border-border transition-colors text-sm focus:outline-none focus:ring-2 focus:ring-primary/45 h-9"
                  >
                    <option value="">Non-departemen (Semua)</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs font-bold text-muted-foreground">Site</Label>
                  <select
                    value={siteId}
                    onChange={e => setSiteId(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-border/80 bg-background/50 hover:border-border transition-colors text-sm focus:outline-none focus:ring-2 focus:ring-primary/45 h-9"
                  >
                    <option value="">Non-site (Semua)</option>
                    {sites.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="active"
                  checked={active}
                  onChange={e => setActive(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4 bg-background/50 cursor-pointer"
                />
                <Label htmlFor="active" className="text-xs font-bold text-foreground cursor-pointer select-none">Pengguna Aktif</Label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border/50">
                <Button type="button" variant="outline" size="sm" className="rounded-lg h-9 px-4 font-semibold text-xs" onClick={() => setShowAddEditModal(false)}>
                  Batal
                </Button>
                <Button type="submit" size="sm" className="gradient-primary text-primary-foreground rounded-lg h-9 px-4 font-semibold text-xs" disabled={submitting}>
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
          <div className="absolute inset-0 bg-foreground/45 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowChangePwModal(false)} />
          <div className="relative bg-card text-card-foreground border border-border/70 w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-150 z-10 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-warning to-destructive" />
            
            <button onClick={() => setShowChangePwModal(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 hover:bg-muted rounded-full transition-colors">
              <X className="h-4 w-4" />
            </button>
            <h2 className="text-base font-bold tracking-tight mb-2 flex items-center gap-2">
              <Key className="h-4.5 w-4.5 text-warning" />
              Reset Password
            </h2>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              Masukkan password baru untuk pengguna <strong className="text-foreground">{selectedUser?.name}</strong>.
            </p>
            <form onSubmit={handleChangePwSubmit} className="space-y-4">
              <div>
                <Label className="text-xs font-bold text-muted-foreground">Password Baru</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="mt-1 bg-background/50 border-border/80 hover:border-border transition-colors rounded-lg h-9 text-sm"
                  required
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
                <Button type="button" variant="outline" size="sm" className="rounded-lg h-9 px-4 font-semibold text-xs" onClick={() => setShowChangePwModal(false)}>
                  Batal
                </Button>
                <Button type="submit" size="sm" className="gradient-primary text-primary-foreground rounded-lg h-9 px-4 font-semibold text-xs" disabled={submitting || !newPassword.trim()}>
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
          <div className="absolute inset-0 bg-foreground/45 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative bg-card text-card-foreground border border-border/70 w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-150 z-10 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-destructive" />
            
            <h2 className="text-base font-bold tracking-tight mb-2 text-destructive flex items-center gap-2">
              <Trash2 className="h-4.5 w-4.5" />
              Hapus Pengguna
            </h2>
            <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
              Apakah Anda yakin ingin menghapus pengguna <strong className="text-foreground">{selectedUser?.name}</strong> ({selectedUser?.email})? Tindakan ini bersifat permanen dan tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end gap-2 border-t border-border/50 pt-4">
              <Button type="button" variant="outline" size="sm" className="rounded-lg h-9 px-4 font-semibold text-xs" onClick={() => setShowDeleteConfirm(false)}>
                Batal
              </Button>
              <Button type="button" variant="destructive" size="sm" className="rounded-lg h-9 px-4 font-semibold text-xs" onClick={handleDeleteSubmit} disabled={submitting}>
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
