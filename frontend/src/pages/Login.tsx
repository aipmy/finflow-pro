import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, ShieldCheck, Eye, EyeOff, Check, X, UserPlus, LogIn, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/stores/authStore";
import { ThemeToggle } from "@/components/ThemeToggle";
import { apiClient } from "@/services/apiClient";
import { toast } from "sonner";

export default function Login() {
  const { login, setup } = useAuth();
  const navigate = useNavigate();
  
  // App state
  const [needSetup, setNeedSetup] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Common inputs
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [pw, setPw] = useState("");
  
  // Setup inputs
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  // Visibility toggles
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);

  useEffect(() => {
    async function checkSetup() {
      try {
        const res = await apiClient.auth.setupStatus();
        setNeedSetup(res.needSetup);
      } catch (err) {
        console.error("Gagal memeriksa status setup:", err);
      } finally {
        setCheckingSetup(false);
      }
    }
    checkSetup();
  }, []);

  // Password Validation Checklists
  const hasMinLength = pw.length >= 8;
  const hasUppercase = /[A-Z]/.test(pw);
  const hasLowercase = /[a-z]/.test(pw);
  const hasNumber = /[0-9]/.test(pw);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(pw);
  const passwordsMatch = pw === confirmPw && pw.length > 0;

  const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar;
  const canSubmitSetup = isPasswordValid && passwordsMatch && name && username.trim().length >= 3 && email;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrUsername || !pw) {
      toast.error("Silakan isi email/username dan password");
      return;
    }

    setIsLoading(true);
    try {
      const user = await login(emailOrUsername, pw);
      toast.success(`Selamat datang, ${user.name}`);
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "Email/username atau password salah");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmitSetup) {
      toast.error("Silakan penuhi semua persyaratan registrasi terlebih dahulu.");
      return;
    }

    setIsLoading(true);
    try {
      const user = await setup(name, username, email, pw);
      toast.success(`Setup berhasil! Akun Admin ${user.name} telah dibuat.`);
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "Gagal melakukan setup admin");
    } finally {
      setIsLoading(false);
    }
  };

  if (checkingSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Memeriksa konfigurasi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      <div className="absolute top-4 right-4 z-10"><ThemeToggle /></div>

      {/* Left Brand Panel */}
      <div className="hidden lg:flex w-1/2 gradient-primary text-primary-foreground p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -left-10 bottom-10 w-72 h-72 rounded-full bg-accent/30 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center font-bold text-2xl">F</div>
            <div>
              <div className="font-bold text-xl tracking-tight">Finance Radar</div>
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
        <div className="relative text-xs opacity-60">© 2026 Finance Radar Internal</div>
      </div>

      {/* Right Form Panel */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 overflow-y-auto">
        <div className="w-full max-w-md space-y-6 py-8">
          <div className="lg:hidden flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center font-bold text-primary-foreground">F</div>
            <div>
              <div className="font-bold tracking-tight">Finance Radar</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Internal Finance</div>
            </div>
          </div>

          {needSetup ? (
            // Setup First Time Administrator Screen
            <div>
              <div className="flex items-center gap-2 mb-2 text-primary">
                <UserPlus className="h-5 w-5" />
                <span className="text-xs font-semibold uppercase tracking-wider">Deploy Awal</span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight mb-1">Registrasi Admin Utama</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Tidak ada pengguna terdaftar. Silakan buat akun Administrator pertama untuk mengelola sistem.
              </p>

              <form onSubmit={handleSetupSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="setup-name">Nama Lengkap</Label>
                  <Input
                    id="setup-name"
                    type="text"
                    required
                    placeholder="Contoh: Andi Wibowo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1.5"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <Label htmlFor="setup-username">Username</Label>
                  <Input
                    id="setup-username"
                    type="text"
                    required
                    placeholder="Contoh: superadmin"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="mt-1.5"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <Label htmlFor="setup-email">Email Administrator</Label>
                  <Input
                    id="setup-email"
                    type="email"
                    required
                    placeholder="admin@company.id"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1.5"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <Label htmlFor="setup-pw">Password</Label>
                  <div className="relative mt-1.5">
                    <Input
                      id="setup-pw"
                      type={showPw ? "text" : "password"}
                      required
                      placeholder="Buat password kuat"
                      value={pw}
                      onChange={(e) => setPw(e.target.value)}
                      onFocus={() => setShowChecklist(true)}
                      onBlur={() => {
                        if (pw.length === 0 && confirmPw.length === 0) setShowChecklist(false);
                      }}
                      className="pr-10"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="setup-confirm-pw">Konfirmasi Password</Label>
                  <div className="relative mt-1.5">
                    <Input
                      id="setup-confirm-pw"
                      type={showConfirmPw ? "text" : "password"}
                      required
                      placeholder="Ketik ulang password"
                      value={confirmPw}
                      onChange={(e) => setConfirmPw(e.target.value)}
                      onFocus={() => setShowChecklist(true)}
                      onBlur={() => {
                        if (pw.length === 0 && confirmPw.length === 0) setShowChecklist(false);
                      }}
                      className="pr-10"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPw(!showConfirmPw)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Password Strength Checklist */}
                {(showChecklist || pw.length > 0 || confirmPw.length > 0) && (
                  <div className="bg-muted/40 rounded-lg p-3.5 border border-border space-y-2 text-xs transition-all duration-200">
                    <div className="font-semibold text-muted-foreground mb-1">Kriteria Keamanan Password:</div>
                    
                    <ValidationRule isValid={hasMinLength} text="Minimal 8 karakter" />
                    <ValidationRule isValid={hasUppercase} text="Mengandung huruf besar (A-Z)" />
                    <ValidationRule isValid={hasLowercase} text="Mengandung huruf kecil (a-z)" />
                    <ValidationRule isValid={hasNumber} text="Mengandung angka (0-9)" />
                    <ValidationRule isValid={hasSpecialChar} text="Mengandung simbol karakter khusus (!@#$...)" />
                    <ValidationRule isValid={passwordsMatch} text="Password konfirmasi cocok" />
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={!canSubmitSetup || isLoading}
                  className="w-full gradient-primary text-primary-foreground hover:opacity-95 shadow-glow pt-2.5 pb-2.5"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Membuat Admin...
                    </>
                  ) : (
                    "Selesaikan Setup & Masuk"
                  )}
                </Button>
              </form>
            </div>
          ) : (
            // Standard User Login Screen
            <div>
              <div className="flex items-center gap-2 mb-2 text-primary">
                <LogIn className="h-5 w-5" />
                <span className="text-xs font-semibold uppercase tracking-wider">Akses Masuk</span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight mb-1">Masuk ke akun Anda</h2>
              <p className="text-sm text-muted-foreground mb-6">Gunakan kredensial perusahaan untuk mengakses sistem.</p>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="emailOrUsername">Username atau Email</Label>
                  <Input
                    id="emailOrUsername"
                    type="text"
                    placeholder="nama@company.id atau username"
                    value={emailOrUsername}
                    onChange={(e) => setEmailOrUsername(e.target.value)}
                    className="mt-1.5"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <Label htmlFor="pw">Password</Label>
                  <div className="relative mt-1.5">
                    <Input
                      id="pw"
                      type={showPw ? "text" : "password"}
                      placeholder="••••••••"
                      value={pw}
                      onChange={(e) => setPw(e.target.value)}
                      className="pr-10"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full gradient-primary text-primary-foreground hover:opacity-95 shadow-glow"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Memverifikasi...
                    </>
                  ) : (
                    "Masuk"
                  )}
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ValidationRule({ isValid, text }: { isValid: boolean; text: string }) {
  return (
    <div className={`flex items-center gap-2 transition-colors ${isValid ? "text-success font-medium" : "text-muted-foreground"}`}>
      {isValid ? (
        <Check className="h-4 w-4 text-success flex-shrink-0" />
      ) : (
        <X className="h-4 w-4 text-destructive opacity-60 flex-shrink-0" />
      )}
      <span>{text}</span>
    </div>
  );
}
