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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Smartphone, Search, RefreshCw, Wifi, Phone, MessageSquare, AlertTriangle, Info, Calendar, MapPin, Database
} from "lucide-react";

interface Simcard {
  msisdn: string;
  lokasi: string;
  grup: string;
  site: string;
  siteId: string;
  kuota_digunakan: string;
  sisa_kuota: string;
  voice_digunakan: string;
  sisa_voice: string;
  sms_digunakan: string;
  sisa_sms: string;
  kuotaPercent: number;
  scrapedAt: string | null;
}

interface Site {
  id: string;
  name: string;
}

export default function SimcardUsage() {
  const [data, setData] = useState<Simcard[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  
  // Filters
  const [search, setSearch] = useState("");
  const [selectedSiteId, setSelectedSiteId] = useState<string>("ALL");
  const [selectedGrup, setSelectedGrup] = useState<string>("ALL");
  const [showCriticalOnly, setShowCriticalOnly] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState("");
  
  const [expandedMsisdn, setExpandedMsisdn] = useState<string | null>(null);

  // Get Indonesian Month Year helper
  const getIndonesianMonthYear = () => {
    const months = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    const date = new Date();
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  useEffect(() => {
    setSelectedMonth(getIndonesianMonthYear());
  }, []);

  const loadSitesAndData = async () => {
    try {
      setLoading(true);
      const [usageRes, sitesRes] = await Promise.all([
        apiClient.simcard.getUsage({
          periode: selectedMonth || getIndonesianMonthYear()
        }),
        apiClient.meta.sites()
      ]);

      if (usageRes.success && usageRes.data) {
        setData(usageRes.data);
        if (usageRes.data.length > 0 && !expandedMsisdn) {
          setExpandedMsisdn(usageRes.data[0].msisdn);
        }
      }
      if (sitesRes) {
        setSites(sitesRes);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Gagal memuat data dari database");
    } finally {
      setLoading(false);
    }
  };

  // Reload when month changes
  useEffect(() => {
    if (selectedMonth) {
      loadSitesAndData();
    }
  }, [selectedMonth]);

  const handleSync = async () => {
    try {
      setSyncing(true);
      toast.info("Memulai sinkronisasi background scraper ke database. Mohon tunggu...");
      const res = await apiClient.simcard.sync();
      if (res.success) {
        toast.success(`Sukses mensinkronkan ${res.count} kartu SIM ke database!`);
        loadSitesAndData();
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Gagal mensinkronkan data scraper");
    } finally {
      setSyncing(false);
    }
  };

  // Get unique Tol/Grup list
  const groupsList = Array.from(new Set(data.map(item => item.grup).filter(Boolean)));

  // Filter the cards locally based on state
  const filteredData = data.filter(item => {
    // 1. Text Search
    const matchesSearch =
      item.msisdn.toLowerCase().includes(search.toLowerCase()) ||
      item.lokasi.toLowerCase().includes(search.toLowerCase()) ||
      (item.grup && item.grup.toLowerCase().includes(search.toLowerCase()));

    // 2. Site ID filter
    const matchesSite = selectedSiteId === "ALL" || item.siteId === selectedSiteId;

    // 3. Toll group filter
    const matchesGrup = selectedGrup === "ALL" || item.grup === selectedGrup;

    // 4. Critical only (usage >= 90%)
    const matchesCritical = !showCriticalOnly || item.kuotaPercent >= 90;

    return matchesSearch && matchesSite && matchesGrup && matchesCritical;
  });

  // Parse helper for data quota (used: 0, total: 10)
  const parseQuota = (quotaStr: string) => {
    if (!quotaStr || quotaStr === "Tidak Ditemukan") return { used: 0, total: 10 };
    const parts = quotaStr.match(/([\d.]+)/g);
    if (parts && parts.length >= 2) {
      return { used: parseFloat(parts[0]), total: parseFloat(parts[1]) };
    }
    return { used: 0, total: 10 };
  };

  // Parse voice quota
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

  // Parse SMS quota
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
              Monitoring Modem 4G Traffic Counting
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Data dibaca langsung dari database lokal dan diperbarui secara berkala via background scraper IOH
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={loadSitesAndData}
              disabled={loading || syncing}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              onClick={handleSync}
              disabled={loading || syncing}
              className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
            >
              <Database className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Mensinkronkan..." : "Picu Sinkronisasi Scraper"}
            </Button>
          </div>
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
                  <CardDescription className="text-xs font-semibold uppercase tracking-wider">Total Modem 4G</CardDescription>
                  <CardTitle className="text-3xl font-extrabold text-foreground">{data.length} Perangkat</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Wifi className="h-3.5 w-3.5 text-emerald-500" />
                    Aktif mengirimkan telemetry data traffic
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/45 backdrop-blur-sm border-primary/10">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs font-semibold uppercase tracking-wider">Total Data Digunakan</CardDescription>
                  <CardTitle className="text-3xl font-extrabold text-primary">
                    {data.reduce((acc, item) => {
                      const { used } = parseQuota(item.kuota_digunakan);
                      return acc + used;
                    }, 0).toFixed(1)} GB
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground">
                    Akumulasi penggunaan modem bulan ini
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/45 backdrop-blur-sm border-primary/10">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs font-semibold uppercase tracking-wider">Modem Kuota Kritis</CardDescription>
                  <CardTitle className={`text-3xl font-extrabold ${
                    data.filter(item => item.kuotaPercent >= 90).length > 0 ? "text-destructive" : "text-emerald-500"
                  }`}>
                    {data.filter(item => item.kuotaPercent >= 90).length} Lokasi
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    Perangkat dengan penggunaan kuota &gt;= 90%
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filter Panel */}
            <Card className="border-border/60 bg-muted/20">
              <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 w-full">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari MSISDN, Lokasi..."
                      className="pl-9 bg-background border-input"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>

                  {/* Site Dropdown */}
                  <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Semua Lokasi Site" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Semua Site</SelectItem>
                      {sites.map(site => (
                        <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Toll group dropdown */}
                  <Select value={selectedGrup} onValueChange={setSelectedGrup}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Semua Tol/Grup" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Semua Tol/Grup</SelectItem>
                      {groupsList.map(g => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Month filter */}
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Pilih Periode" />
                    </SelectTrigger>
                    <SelectContent>
                      {["Juni 2026", "Mei 2026", "April 2026"].map(m => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Critical quota switch */}
                <div className="flex items-center gap-2 min-w-[180px] justify-end">
                  <label className="text-xs font-semibold cursor-pointer select-none text-muted-foreground flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={showCriticalOnly}
                      onChange={(e) => setShowCriticalOnly(e.target.checked)}
                      className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                    />
                    Hanya Kuota Kritis (&gt;=90%)
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Main Area */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Card List Table */}
              <div className="lg:col-span-7 space-y-4">
                <Card className="border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold">Daftar Modem Tol</CardTitle>
                    <CardDescription className="text-xs">
                      Menampilkan {filteredData.length} dari {data.length} perangkat terdaftar
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="border border-border rounded-lg overflow-hidden bg-background/30">
                      <Table>
                        <TableHeader className="bg-muted/40">
                          <TableRow>
                            <TableHead className="w-12 text-center text-xs">NO</TableHead>
                            <TableHead className="text-xs">MSISDN</TableHead>
                            <TableHead className="text-xs">LABEL LOKASI MODEM</TableHead>
                            <TableHead className="text-xs w-28 text-center">PENGGUNAAN</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredData.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-xs">
                                Tidak ada data modem ditemukan dengan filter ini.
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
                                  <div className="font-semibold text-foreground flex items-center gap-1">
                                    <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                    {item.lokasi}
                                  </div>
                                  <div className="flex gap-1.5 mt-1.5">
                                    {item.grup && (
                                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-primary/20 bg-primary/5 text-primary">
                                        {item.grup}
                                      </Badge>
                                    )}
                                    {item.site && (
                                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-muted-foreground/20 bg-muted text-muted-foreground">
                                        Site: {item.site}
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <div className="space-y-1">
                                    <div className="text-[10px] font-bold text-foreground">{item.kuota_digunakan}</div>
                                    <Progress
                                      value={item.kuotaPercent}
                                      className={`h-1.5 w-20 mx-auto bg-muted ${
                                        item.kuotaPercent >= 90 ? "[&>div]:bg-destructive" :
                                        item.kuotaPercent >= 75 ? "[&>div]:bg-amber-500" : "[&>div]:bg-primary"
                                      }`}
                                    />
                                  </div>
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
                          <p className="text-xs">Pilih salah satu modem tol di tabel untuk melihat grafik benefit detail.</p>
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
                        <p className="text-xs text-muted-foreground mt-0.5">Tol/Grup: {selectedSim.grup || "Default"} | Site: {selectedSim.site || "N/A"}</p>
                        {selectedSim.scrapedAt && (
                          <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Sinkronisasi terakhir: {new Date(selectedSim.scrapedAt).toLocaleString("id-ID", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </p>
                        )}
                      </div>

                      <CardContent className="p-5 space-y-6">
                        <div className="space-y-5">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Rincian Benefit Aktif — {selectedMonth}
                          </h4>

                          {/* Data Quota */}
                          <div className="space-y-2 p-4 rounded-xl border border-border/80 bg-background/45">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold flex items-center gap-1.5">
                                <Wifi className="h-4 w-4 text-primary" />
                                Kuota Data
                              </span>
                              <Badge className={`${
                                selectedSim.kuotaPercent >= 90 ? "bg-destructive/15 text-destructive border-none" : "bg-primary/10 text-primary border-none"
                              } text-[10px] font-semibold`}>
                                {(100 - selectedSim.kuotaPercent).toFixed(0)}% tersisa
                              </Badge>
                            </div>
                            <div className="text-xl font-extrabold mt-1 text-foreground">
                              {dataQuota.used.toFixed(1)} / {dataQuota.total} GB
                            </div>
                            <Progress
                              value={selectedSim.kuotaPercent}
                              className={`h-2 bg-muted ${
                                selectedSim.kuotaPercent >= 90 ? "[&>div]:bg-destructive" :
                                selectedSim.kuotaPercent >= 75 ? "[&>div]:bg-amber-500" : "[&>div]:bg-primary"
                              }`}
                            />
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
