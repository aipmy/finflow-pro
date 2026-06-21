import { Coins, ArrowDown, ArrowUp, Plus, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { pettyCash } from "@/data/mockData";
import { formatRupiah, formatDate } from "@/utils/format";

export default function PettyCash() {
  const usagePct = Math.round(pettyCash.balance / pettyCash.initial * 100);

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Petty Cash</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Kelola kas kecil operasional</p>
        </div>
        <Button size="sm" className="gradient-primary text-primary-foreground"><Plus className="h-4 w-4 mr-1.5" />Transaksi</Button>
      </div>

      <Card className="shadow-elegant gradient-primary text-primary-foreground border-0 overflow-hidden relative">
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
        <CardContent className="p-6 relative">
          <div className="flex items-center gap-2 mb-2 opacity-80">
            <Coins className="h-4 w-4" />
            <span className="text-xs uppercase tracking-wider">Saldo Petty Cash</span>
          </div>
          <div className="text-3xl lg:text-4xl font-bold tracking-tight">{formatRupiah(pettyCash.balance)}</div>
          <div className="text-xs opacity-80 mt-2">dari awal {formatRupiah(pettyCash.initial)}</div>
          <div className="mt-4 h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all" style={{ width: `${usagePct}%` }} />
          </div>
          <div className="flex justify-between text-[11px] opacity-80 mt-1.5">
            <span>Tersedia {usagePct}%</span>
            <span>Terpakai {100 - usagePct}%</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Card className="shadow-elegant"><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1 text-success"><ArrowDown className="h-3.5 w-3.5" /><span className="text-[10px] uppercase tracking-wider">Cash In</span></div>
          <div className="text-lg font-bold">{formatRupiah(pettyCash.transactions.filter(t => t.type === "IN").reduce((a, b) => a + b.amount, 0))}</div>
        </CardContent></Card>
        <Card className="shadow-elegant"><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1 text-destructive"><ArrowUp className="h-3.5 w-3.5" /><span className="text-[10px] uppercase tracking-wider">Cash Out</span></div>
          <div className="text-lg font-bold">{formatRupiah(pettyCash.transactions.filter(t => t.type === "OUT").reduce((a, b) => a + b.amount, 0))}</div>
        </CardContent></Card>
        <Card className="shadow-elegant"><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1 text-info"><TrendingUp className="h-3.5 w-3.5" /><span className="text-[10px] uppercase tracking-wider">Transaksi</span></div>
          <div className="text-lg font-bold">{pettyCash.transactions.length}</div>
        </CardContent></Card>
      </div>

      <Card className="shadow-elegant">
        <CardHeader><CardTitle className="text-base">Riwayat Transaksi</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {pettyCash.transactions.map(t => (
            <div key={t.id} className="flex items-center justify-between p-3 rounded-md border border-border">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0 ${t.type === "IN" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                  {t.type === "IN" ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{t.description}</div>
                  <div className="text-[11px] text-muted-foreground">{formatDate(t.date)} • Ref: {t.refRequest}</div>
                </div>
              </div>
              <div className={`font-semibold text-sm ${t.type === "IN" ? "text-success" : "text-destructive"}`}>
                {t.type === "IN" ? "+" : "-"}{formatRupiah(t.amount)}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
