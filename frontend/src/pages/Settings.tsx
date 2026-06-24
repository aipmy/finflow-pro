import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ThemeToggle, useTheme } from "@/components/ThemeToggle";
import { Plus, Building2, MapPin, Tag, Edit, Trash2, Loader2, X } from "lucide-react";
import { apiClient } from "@/services/apiClient";
import { toast } from "sonner";
import { useAuth } from "@/stores/authStore";

export default function Settings() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [departmentsList, setDepartmentsList] = useState<any[]>([]);
  const [sitesList, setSitesList] = useState<any[]>([]);
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // CRUD Modal states
  const [activeTab, setActiveTab] = useState<"dept" | "site" | "cat" | null>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteItem, setDeleteItem] = useState<any>(null);

  const [inputName, setInputName] = useState("");
  const [inputColor, setInputColor] = useState("primary");
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [depts, sts, cats] = await Promise.all([
        apiClient.meta.departments(),
        apiClient.meta.sites(),
        apiClient.meta.categories()
      ]);
      setDepartmentsList(depts);
      setSitesList(sts);
      setCategoriesList(cats);
    } catch (err: any) {
      toast.error("Gagal mengambil data pengaturan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAdd = (tab: "dept" | "site" | "cat") => {
    setActiveTab(tab);
    setEditItem(null);
    setInputName("");
    setInputColor("primary");
    setShowAddEditModal(true);
  };

  const handleOpenEdit = (tab: "dept" | "site" | "cat", item: any) => {
    setActiveTab(tab);
    setEditItem(item);
    setInputName(item.name);
    setInputColor(item.color || "primary");
    setShowAddEditModal(true);
  };

  const handleOpenDelete = (tab: "dept" | "site" | "cat", item: any) => {
    setActiveTab(tab);
    setDeleteItem(item);
    setShowDeleteConfirm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputName.trim()) return;

    setSubmitting(true);
    try {
      if (activeTab === "dept") {
        if (editItem) {
          await apiClient.meta.updateDepartment(editItem.id, inputName);
          toast.success("Departemen berhasil diperbarui");
        } else {
          await apiClient.meta.createDepartment(inputName);
          toast.success("Departemen berhasil ditambahkan");
        }
      } else if (activeTab === "site") {
        if (editItem) {
          await apiClient.meta.updateSite(editItem.id, inputName);
          toast.success("Site berhasil diperbarui");
        } else {
          await apiClient.meta.createSite(inputName);
          toast.success("Site berhasil ditambahkan");
        }
      } else if (activeTab === "cat") {
        if (editItem) {
          await apiClient.meta.updateCategory(editItem.id, inputName, inputColor);
          toast.success("Kategori berhasil diperbarui");
        } else {
          await apiClient.meta.createCategory(inputName, inputColor);
          toast.success("Kategori berhasil ditambahkan");
        }
      }
      setShowAddEditModal(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan data");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deleteItem) return;
    setSubmitting(true);
    try {
      if (activeTab === "dept") {
        await apiClient.meta.deleteDepartment(deleteItem.id);
        toast.success("Departemen berhasil dihapus");
      } else if (activeTab === "site") {
        await apiClient.meta.deleteSite(deleteItem.id);
        toast.success("Site berhasil dihapus");
      } else if (activeTab === "cat") {
        await apiClient.meta.deleteCategory(deleteItem.id);
        toast.success("Kategori berhasil dihapus");
      }
      setShowDeleteConfirm(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus. Data ini mungkin sedang digunakan oleh user atau transaksi.");
    } finally {
      setSubmitting(false);
    }
  };

  const getModalTitle = () => {
    const action = editItem ? "Edit" : "Tambah";
    if (activeTab === "dept") return `${action} Departemen`;
    if (activeTab === "site") return `${action} Site`;
    return `${action} Kategori`;
  };

  const getDeleteModalMessage = () => {
    const type = activeTab === "dept" ? "departemen" : activeTab === "site" ? "site" : "kategori";
    return `Apakah Anda yakin ingin menghapus ${type} "${deleteItem?.name}"? Tindakan ini tidak dapat dibatalkan.`;
  };

  if (loading && departmentsList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
        <span className="text-sm text-muted-foreground">Memuat data pengaturan...</span>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Pengaturan Sistem</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Konfigurasi global aplikasi</p>
      </div>

      <Card className="shadow-elegant">
        <CardHeader><CardTitle className="text-base">Tampilan</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-md border border-border">
            <div>
              <div className="text-sm font-medium">Tema Aplikasi</div>
              <div className="text-[11px] text-muted-foreground">Mode {theme === "dark" ? "gelap" : "terang"} aktif</div>
            </div>
            <ThemeToggle />
          </div>
          <div className="flex items-center justify-between p-3 rounded-md border border-border">
            <div>
              <div className="text-sm font-medium">Notifikasi</div>
              <div className="text-[11px] text-muted-foreground">Email untuk approval & realisasi</div>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-elegant">
        <CardHeader><CardTitle className="text-base">Threshold Approval</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Batas Approval Atasan (Rp)</Label>
            <Input className="mt-1.5" defaultValue="500000" />
          </div>
          <div>
            <Label className="text-xs">Batas Approval Manager (Rp)</Label>
            <Input className="mt-1.5" defaultValue="5000000" />
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Departemen */}
        <Card className="shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />Departemen
            </CardTitle>
            {isAdmin && (
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleOpenAdd("dept")}>
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-1">
            {departmentsList.map(d => (
              <div key={d.id} className="text-sm py-1.5 px-2 rounded hover:bg-muted/50 flex items-center justify-between group">
                <span className="truncate pr-2">{d.name}</span>
                {isAdmin && (
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => handleOpenEdit("dept", d)}>
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => handleOpenDelete("dept", d)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
            {departmentsList.length === 0 && (
              <div className="text-xs text-muted-foreground py-2 text-center">Belum ada departemen</div>
            )}
          </CardContent>
        </Card>

        {/* Site */}
        <Card className="shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />Site
            </CardTitle>
            {isAdmin && (
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleOpenAdd("site")}>
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-1">
            {sitesList.map(s => (
              <div key={s.id} className="text-sm py-1.5 px-2 rounded hover:bg-muted/50 flex items-center justify-between group">
                <span className="truncate pr-2">{s.name}</span>
                {isAdmin && (
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => handleOpenEdit("site", s)}>
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => handleOpenDelete("site", s)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
            {sitesList.length === 0 && (
              <div className="text-xs text-muted-foreground py-2 text-center">Belum ada site</div>
            )}
          </CardContent>
        </Card>

        {/* Kategori */}
        <Card className="shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" />Kategori
            </CardTitle>
            {isAdmin && (
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleOpenAdd("cat")}>
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-1">
            {categoriesList.map(c => (
              <div key={c.id} className="text-sm py-1.5 px-2 rounded hover:bg-muted/50 flex items-center justify-between group">
                <span className="truncate pr-2">{c.name}</span>
                {isAdmin && (
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => handleOpenEdit("cat", c)}>
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => handleOpenDelete("cat", c)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
            {categoriesList.length === 0 && (
              <div className="text-xs text-muted-foreground py-2 text-center">Belum ada kategori</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add / Edit Modal */}
      {showAddEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setShowAddEditModal(false)} />
          <div className="relative bg-card text-card-foreground border border-border w-full max-w-sm rounded-xl shadow-elevated p-6 animate-in zoom-in-95 duration-150 z-10">
            <button onClick={() => setShowAddEditModal(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
            <h2 className="text-base font-semibold tracking-tight mb-4">{getModalTitle()}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Nama</Label>
                <Input
                  value={inputName}
                  onChange={e => setInputName(e.target.value)}
                  placeholder="Masukkan nama"
                  required
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddEditModal(false)}>
                  Batal
                </Button>
                <Button type="submit" size="sm" disabled={submitting || !inputName.trim()}>
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
            <h2 className="text-base font-semibold tracking-tight mb-2">Konfirmasi Hapus</h2>
            <p className="text-xs text-muted-foreground mb-6">{getDeleteModalMessage()}</p>
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
