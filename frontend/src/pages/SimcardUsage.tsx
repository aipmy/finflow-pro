import { AppLayout } from "@/components/AppLayout";
import { useState, useEffect } from "react";
import { apiClient } from "@/services/apiClient";
import { toast } from "sonner";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Smartphone, Search, RefreshCw, Wifi, Phone, MessageSquare, AlertTriangle, Info, Calendar
} from "lucide-react";

interface Simcard {
  msisdn: string;
  lokasi: string;
  grup: string;
  kuota_digunakan: string;
  sisa_kuota: string;
  voice_digunakan: string;
  sisa_voice: string;
  sms_digunakan: string;
  sisa_sms: string;
  error?: string;
}

export default function SimcardUsage() {
  const [data, setData] = useState<Simcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("Juni 2026");
  const [expandedMsisdn, setExpandedMsisdn] = useState<string | null>(null);

  const fetchData = async (showToast = false) => {
    try {
      if (showToast) setRefreshing(true);
      else setLoading(true);

      const res = await apiClient.simcard.getUsage();
      if (res.success && res.data) {
        setData(res.data);
        if (res.data.length > 0 && !expandedMsisdn) {
          setExpandedMsisdn(res.data[0].msisdn); // expand first card by default
        }
        if (showToast) toast.success("Data penggunaan kartu berhasil diperbarui!");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Gagal memuat data penggunaan kartu");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    fetchData(true);
  };

  // Filter data based on search
  const filteredData = data.filter(
    (item) =>
      item.msisdn.toLowerCase().includes(search.toLowerCase()) ||
      item.lokasi.toLowerCase().includes(search.toLowerCase()) ||
      (item.grup && item.grup.toLowerCase().includes(search.toLowerCase()))
  );

  // Parse helper for data quota (e.g., "0.0 / 10 GB" -> used: 0, total: 10)
  const parseQuota = (quotaStr: string) => {
    if (!quotaStr || quotaStr === "Tidak Ditemukan") return { used: 0, total: 10, percent: 0, unit: "GB" };
    // match numbers
    const parts = quotaStr.match(/([\d.]+)/g);
    const unitMatch = quotaStr.match(/[A-Za-z]+/);
    const unit = unitMatch ? unitMatch[0] : "GB";
    if (parts && parts.length >= 2) {
      const used = parseFloat(parts[0]);
      const total = parseFloat(parts[1]);
      const percent = total > 0 ? (used / total) * 100 : 0;
      return { used, total, percent, unit };
    }
    return { used: 0, total: 10, percent: 0, unit };
  };

  // Parse voice quota (e.g. "0 / 60 Min")
  const parseVoice = (voiceStr: string) => {
    if (!voiceStr) return { used: 0, total: 60, percent: 0 };
    const parts = voiceStr.match(/(\d+)/g);
    if (parts && parts.length >= 2) {
      const used = parseInt(parts[0]);
      const total = parseInt(parts[1]);
      const percent = total > 0 ? (used / total) * 100 : 0;
      return { used, total, percent };
    }
    return { used: 0, total: 60, percent: 0 };
  };

  // Parse SMS quota (e.g. "0 / 60 SMS")
  const parseSms = (smsStr: string) => {
    if (!smsStr) return { used: 0, total: 60, percent: 0 };
    const parts = smsStr.match(/(\d+)/g);
    if (parts && parts.length >= 2) {
      const used = parseInt(parts[0]);
      const total = parseInt(parts[1]);
      const percent = total > 0 ? (used / total) * 100 : 0;
      return { used, total, percent };
    }
    return { used: 0, total: 60, percent: 0 };
  };

  return (
    <AppLayout>
      <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Smartphone className="h-6 w-6 text-primary" />
              Monitoring Penggunaan Kartu SIM
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Data penggunaan kuota secara real-time yang disinkronkan langsung dari IM3 Platinum Business Hub
            </p>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={loading || refreshing}
            className="self-start sm:self-auto gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Menyinkronkan..." : "Sinkronisasi Live"}
          </Button>
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
            <Card className="h-28" />
            <Card className="h-28" />
            <Card className="h-28" />
            <Card className="md:col-span-3 h-96" />
          </div>
        ) : (
          <>
            {/* Quick Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-card/45 backdrop-blur-sm border-primary/10">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs font-semibold uppercase tracking-wider">Total SIM Aktif</CardDescription>
                  <CardTitle className="text-3xl font-extrabold text-foreground">{data.length} Kartu</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Wifi className="h-3.5 w-3.5 text-emerald-500" />
                    Semua kartu terhubung dengan baik
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/45 backdrop-blur-sm border-primary/10">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs font-semibold uppercase tracking-wider">Total Penggunaan Data</CardDescription>
                  <CardTitle className="text-3xl font-extrabold text-primary">
                    {data.reduce((acc, item) => {
                      const { used } = parseQuota(item.kuota_digunakan);
                      return acc + used;
                    }, 0).toFixed(1)} GB
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground">
                    Dari total kuota gabungan sebesar {" "}
                    {data.reduce((acc, item) => {
                      const { total } = parseQuota(item.kuota_digunakan);
                      return acc + total;
                    }, 0)} GB
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/45 backdrop-blur-sm border-primary/10">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs font-semibold uppercase tracking-wider">Status Quota Kritis</CardDescription>
                  <CardTitle className="text-3xl font-extrabold text-emerald-500">
                    {data.filter(item => {
                      const { percent } = parseQuota(item.kuota_digunakan);
                      return percent > 90;
                    }).length} Kartu
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    Kartu dengan penggunaan kuota di atas 90%
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Area */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Card List Table */}
              <div className="lg:col-span-7 space-y-4">
                <Card className="border-border">
                  <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold">Daftar SIM Card</CardTitle>
                      <CardDescription className="text-xs">Pilih kartu untuk melihat rincian sisa benefit</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Cari MSISDN, Lokasi, atau Grup..."
                        className="pl-9 bg-background/50 border-input"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>

                    <div className="border border-border rounded-lg overflow-hidden bg-background/30">
                      <Table>
                        <TableHeader className="bg-muted/40">
                          <TableRow>
                            <TableHead className="w-12 text-center text-xs">NO</TableHead>
                            <TableHead className="text-xs">MSISDN</TableHead>
                            <TableHead className="text-xs">LABEL / LOKASI</TableHead>
                            <TableHead className="text-xs w-28 text-center">AKSI</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredData.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-xs">
                                Tidak ada data kartu SIM ditemukan.
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredData.map((item, idx) => (
                              <TableRow
                                key={item.msisdn}
                                className={`cursor-pointer hover:bg-accent/40 ${
                                  expandedMsisdn === item.msisdn ? "bg-accent/60" : ""
                                }`}
                                onClick={() => setExpandedMsisdn(item.msisdn)}
                              >
                                <TableCell className="text-center font-medium text-xs">{idx + 1}</TableCell>
                                <TableCell className="font-semibold text-xs tracking-wide">{item.msisdn}</TableCell>
                                <TableCell className="text-xs">
                                  <div className="font-medium text-foreground">{item.lokasi}</div>
                                  {item.grup && (
                                    <Badge variant="outline" className="mt-1 text-[10px] px-1 py-0 border-primary/20 bg-primary/5 text-primary">
                                      {item.grup}
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  <Button
                                    variant="outline"
                                    size="xs"
                                    className="h-7 text-xs border-primary/25 text-primary hover:bg-primary/10"
                                  >
                                    Lihat Detail
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Card Usage Details */}
              <div className="lg:col-span-5">
                {(() => {
                  const selectedSim = data.find((item) => item.msisdn === expandedMsisdn);
                  if (!selectedSim) {
                    return (
                      <Card className="h-full border-border flex items-center justify-center p-8 text-center text-muted-foreground">
                        <div className="space-y-2">
                          <Info className="h-8 w-8 mx-auto text-muted-foreground/50" />
                          <p className="text-xs">Silakan pilih salah satu kartu SIM di daftar sebelah kiri untuk melihat rincian sisa kuota.</p>
                        </div>
                      </Card>
                    );
                  }

                  const dataQuota = parseQuota(selectedSim.kuota_digunakan);
                  const voiceQuota = parseVoice(selectedSim.voice_digunakan);
                  const smsQuota = parseSms(selectedSim.sms_digunakan);

                  return (
                    <Card className="border-border shadow-md overflow-hidden bg-card/60 backdrop-blur-md">
                      <div className="p-5 border-b border-border bg-muted/30">
                        <div className="text-xs font-semibold text-primary uppercase tracking-wider">MSISDN: {selectedSim.msisdn}</div>
                        <h3 className="text-lg font-bold text-foreground mt-1">{selectedSim.lokasi}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">Tipe: Individual | Grup: {selectedSim.grup || "Default"}</p>
                      </div>

                      <CardContent className="p-5 space-y-6">
                        {/* Month filter inside details */}
                        <div className="flex items-center justify-between pb-2 border-b border-border/60">
                          <span className="text-xs font-semibold flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            Periode Benefit
                          </span>
                          <div className="flex gap-1">
                            {["Juni 2026", "Mei 2026", "April 2026"].map((m) => (
                              <button
                                key={m}
                                onClick={() => setSelectedMonth(m)}
                                className={`text-[10px] px-2.5 py-1 rounded-full font-medium transition-all ${
                                  selectedMonth === m
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "bg-muted text-muted-foreground hover:bg-accent"
                                }`}
                              >
                                {m}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-5">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Rincian Sisa Benefit — {selectedMonth}
                          </h4>

                          {/* Data Quota */}
                          <div className="space-y-2 p-4 rounded-xl border border-border/80 bg-background/45">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold flex items-center gap-1.5">
                                <Wifi className="h-4 w-4 text-primary" />
                                Kuota Data
                              </span>
                              <Badge className="bg-primary/10 text-primary hover:bg-primary/20 text-[10px] font-semibold border-none">
                                {(100 - dataQuota.percent).toFixed(0)}% tersisa
                              </Badge>
                            </div>
                            <div className="text-xl font-extrabold mt-1 text-foreground">
                              {dataQuota.used.toFixed(1)} / {dataQuota.total} {dataQuota.unit}
                            </div>
                            <Progress value={dataQuota.percent} className="h-2 bg-muted [&>div]:bg-primary" />
                            <div className="text-[10px] text-muted-foreground font-medium">
                              Sisa Kuota Tersedia: <span className="font-semibold text-foreground">{selectedSim.sisa_kuota}</span>
                            </div>
                          </div>

                          {/* Voice Quota */}
                          <div className="space-y-2 p-4 rounded-xl border border-border/80 bg-background/45">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold flex items-center gap-1.5">
                                <Phone className="h-4 w-4 text-emerald-500" />
                                Kuota Telepon
                              </span>
                              <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 text-[10px] font-semibold border-none">
                                {(100 - voiceQuota.percent).toFixed(0)}% tersisa
                              </Badge>
                            </div>
                            <div className="text-xl font-extrabold mt-1 text-foreground">
                              {voiceQuota.used} / {voiceQuota.total} Min
                            </div>
                            <Progress value={voiceQuota.percent} className="h-2 bg-muted [&>div]:bg-emerald-500" />
                            <div className="text-[10px] text-muted-foreground font-medium">
                              Sisa Kuota Tersedia: <span className="font-semibold text-foreground">{selectedSim.sisa_voice}</span>
                            </div>
                          </div>

                          {/* SMS Quota */}
                          <div className="space-y-2 p-4 rounded-xl border border-border/80 bg-background/45">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold flex items-center gap-1.5">
                                <MessageSquare className="h-4 w-4 text-amber-500" />
                                Kuota SMS
                              </span>
                              <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 text-[10px] font-semibold border-none">
                                {(100 - smsQuota.percent).toFixed(0)}% tersisa
                              </Badge>
                            </div>
                            <div className="text-xl font-extrabold mt-1 text-foreground">
                              {smsQuota.used} / {smsQuota.total} SMS
                            </div>
                            <Progress value={smsQuota.percent} className="h-2 bg-muted [&>div]:bg-amber-500" />
                            <div className="text-[10px] text-muted-foreground font-medium">
                              Sisa Kuota Tersedia: <span className="font-semibold text-foreground">{selectedSim.sisa_sms}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
