import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/stores/authStore";
import { ThemeToggle } from "@/components/ThemeToggle";
import { users } from "@/data/mockData";
import { toast } from "sonner";

const demos = [
  { role: "Admin", id: "u1", desc: "Akses penuh" },
  { role: "Finance", id: "u2", desc: "Verifikasi & realisasi" },
  { role: "Supervisor", id: "u3", desc: "Approval pengajuan" },
  { role: "Manager", id: "u4", desc: "Approval level 2" },
  { role: "Staff", id: "u5", desc: "Buat pengajuan" },
  { role: "Auditor", id: "u7", desc: "View only" },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");

  const doLogin = (id: string) => {
    login(id);
    const u = users.find(x => x.id === id);
    toast.success(`Selamat datang, ${u?.name}`);
    navigate("/");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const u = users.find(x => x.email === email.toLowerCase());
    if (u && pw) doLogin(u.id);
    else toast.error("Email tidak ditemukan. Coba demo login di samping.");
  };

  return (
    <div className="min-h-screen flex bg-background">
      <div className="absolute top-4 right-4 z-10"><ThemeToggle /></div>

      {/* Brand panel */}
      <div className="hidden lg:flex w-1/2 gradient-primary text-primary-foreground p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -left-10 bottom-10 w-72 h-72 rounded-full bg-accent/30 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center font-bold text-2xl">F</div>
            <div>
              <div className="font-bold text-xl tracking-tight">FinanceFlow</div>
              <div className="text-xs opacity-80 uppercase tracking-widest">Internal Finance Suite</div>
            </div>
          </div>
        </div>
        <div className="relative space-y-6">
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-balance">
            Kontrol penuh atas pengeluaran perusahaan, dari pengajuan hingga realisasi.
          </h1>
          <p className="text-primary-foreground/80 text-lg leading-relaxed max-w-md">
            Pengajuan, approval bertingkat, realisasi, inventaris, petty cash, dan audit trail dalam satu sistem terpadu.
          </p>
          <div className="grid grid-cols-2 gap-4 pt-4 max-w-md">
            <div className="bg-white/10 backdrop-blur rounded-lg p-4 border border-white/15">
              <Building2 className="h-5 w-5 mb-2" />
              <div className="text-sm font-semibold">Multi-site</div>
              <div className="text-xs opacity-75">Operasional lintas lokasi</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-4 border border-white/15">
              <ShieldCheck className="h-5 w-5 mb-2" />
              <div className="text-sm font-semibold">Audit Trail</div>
              <div className="text-xs opacity-75">Setiap aksi tercatat</div>
            </div>
          </div>
        </div>
        <div className="relative text-xs opacity-60">© 2026 FinanceFlow Internal</div>
      </div>

      {/* Login form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center font-bold text-primary-foreground">F</div>
            <div>
              <div className="font-bold tracking-tight">FinanceFlow</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Internal Finance</div>
            </div>
          </div>

          <h2 className="text-2xl font-bold tracking-tight mb-1">Masuk ke akun Anda</h2>
          <p className="text-sm text-muted-foreground mb-8">Gunakan kredensial perusahaan untuk mengakses sistem.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="nama@company.id" value={email} onChange={e => setEmail(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="pw">Password</Label>
              <Input id="pw" type="password" placeholder="••••••••" value={pw} onChange={e => setPw(e.target.value)} className="mt-1.5" />
            </div>
            <Button type="submit" className="w-full gradient-primary text-primary-foreground hover:opacity-95 shadow-glow">Masuk</Button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider">Demo Login</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {demos.map(d => (
              <button key={d.id} onClick={() => doLogin(d.id)}
                className="text-left p-3 rounded-md border border-border hover:border-primary hover:bg-primary/5 transition-colors">
                <div className="text-sm font-medium">{d.role}</div>
                <div className="text-[11px] text-muted-foreground">{d.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
