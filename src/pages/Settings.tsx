import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ThemeToggle, useTheme } from "@/components/ThemeToggle";
import { departments, sites, categories } from "@/data/mockData";
import { Plus, Building2, MapPin, Tag } from "lucide-react";

export default function Settings() {
  const { theme } = useTheme();
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
        <Card className="shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" />Departemen</CardTitle>
            <Button size="icon" variant="ghost" className="h-7 w-7"><Plus className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {departments.map(d => <div key={d.id} className="text-sm py-1.5 px-2 rounded hover:bg-muted/50">{d.name}</div>)}
          </CardContent>
        </Card>
        <Card className="shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4" />Site</CardTitle>
            <Button size="icon" variant="ghost" className="h-7 w-7"><Plus className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {sites.map(s => <div key={s.id} className="text-sm py-1.5 px-2 rounded hover:bg-muted/50">{s.name}</div>)}
          </CardContent>
        </Card>
        <Card className="shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><Tag className="h-4 w-4" />Kategori</CardTitle>
            <Button size="icon" variant="ghost" className="h-7 w-7"><Plus className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {categories.map(c => <div key={c.id} className="text-sm py-1.5 px-2 rounded hover:bg-muted/50">{c.name}</div>)}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
