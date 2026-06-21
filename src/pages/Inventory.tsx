import { useState } from "react";
import { Search, Plus, ArrowDown, ArrowUp, AlertTriangle, Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { items, categories, sites, inventoryMovements, users } from "@/data/mockData";
import { formatNumber, formatDate } from "@/utils/format";

export default function Inventory() {
  const [q, setQ] = useState("");
  const filtered = items.filter(i =>
    !q || `${i.name} ${i.sku}`.toLowerCase().includes(q.toLowerCase())
  );
  const lowCount = items.filter(i => i.stock < i.minStock).length;

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Stok Barang</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{items.length} item • {lowCount} di bawah minimum</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline"><ArrowDown className="h-4 w-4 mr-1.5" />Stock In</Button>
          <Button size="sm" variant="outline"><ArrowUp className="h-4 w-4 mr-1.5" />Stock Out</Button>
          <Button size="sm" className="gradient-primary text-primary-foreground"><Plus className="h-4 w-4 mr-1.5" />Item Baru</Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <Card className="shadow-elegant"><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-primary/10 text-primary flex items-center justify-center"><Package className="h-5 w-5" /></div>
          <div><div className="text-xl font-bold">{items.length}</div><div className="text-[11px] text-muted-foreground">Total Item</div></div>
        </CardContent></Card>
        <Card className="shadow-elegant"><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-warning/10 text-warning flex items-center justify-center"><AlertTriangle className="h-5 w-5" /></div>
          <div><div className="text-xl font-bold">{lowCount}</div><div className="text-[11px] text-muted-foreground">Di Bawah Minimum</div></div>
        </CardContent></Card>
        <Card className="shadow-elegant"><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-success/10 text-success flex items-center justify-center"><Package className="h-5 w-5" /></div>
          <div><div className="text-xl font-bold">{formatNumber(items.reduce((a, b) => a + b.stock, 0))}</div><div className="text-[11px] text-muted-foreground">Total Unit</div></div>
        </CardContent></Card>
      </div>

      <Card className="shadow-elegant"><CardContent className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Cari nama barang atau SKU..." value={q} onChange={e => setQ(e.target.value)} />
        </div>
      </CardContent></Card>

      <Card className="shadow-elegant hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left p-3 font-medium">SKU</th>
                <th className="text-left p-3 font-medium">Nama Barang</th>
                <th className="text-left p-3 font-medium">Kategori</th>
                <th className="text-right p-3 font-medium">Stok</th>
                <th className="text-right p-3 font-medium">Min</th>
                <th className="text-left p-3 font-medium">Unit</th>
                <th className="text-left p-3 font-medium">Lokasi</th>
                <th className="text-left p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(i => {
                const c = categories.find(x => x.id === i.category);
                const s = sites.find(x => x.id === i.location);
                const low = i.stock < i.minStock;
                return (
                  <tr key={i.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-3 font-mono text-xs">{i.sku}</td>
                    <td className="p-3 font-medium">{i.name}</td>
                    <td className="p-3 text-xs text-muted-foreground">{c?.name}</td>
                    <td className={`p-3 text-right font-semibold ${low ? "text-destructive" : ""}`}>{formatNumber(i.stock)}</td>
                    <td className="p-3 text-right text-xs text-muted-foreground">{formatNumber(i.minStock)}</td>
                    <td className="p-3 text-xs">{i.unit}</td>
                    <td className="p-3 text-xs">{s?.name}</td>
                    <td className="p-3">
                      {low ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-destructive/10 text-destructive border border-destructive/30 font-medium">Restock</span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-success/10 text-success border border-success/30 font-medium">Aman</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="md:hidden space-y-2">
        {filtered.map(i => {
          const c = categories.find(x => x.id === i.category);
          const s = sites.find(x => x.id === i.location);
          const low = i.stock < i.minStock;
          return (
            <Card key={i.id} className="shadow-sm"><CardContent className="p-3">
              <div className="flex items-start justify-between mb-1.5">
                <div>
                  <div className="font-mono text-[10px] text-muted-foreground">{i.sku}</div>
                  <div className="text-sm font-medium">{i.name}</div>
                </div>
                {low ? <span className="text-[10px] px-2 py-0.5 rounded-md bg-destructive/10 text-destructive border border-destructive/30">Restock</span> : <span className="text-[10px] px-2 py-0.5 rounded-md bg-success/10 text-success border border-success/30">Aman</span>}
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px] mt-2 pt-2 border-t border-border">
                <div><div className="text-muted-foreground">Stok</div><div className={`font-semibold ${low ? "text-destructive" : ""}`}>{formatNumber(i.stock)} {i.unit}</div></div>
                <div><div className="text-muted-foreground">Min</div><div>{formatNumber(i.minStock)}</div></div>
                <div><div className="text-muted-foreground">Lokasi</div><div className="truncate">{s?.name}</div></div>
              </div>
            </CardContent></Card>
          );
        })}
      </div>

      {/* Movements */}
      <Card className="shadow-elegant">
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm mb-3">Riwayat Pergerakan Stok</h3>
          <div className="space-y-2">
            {inventoryMovements.map(m => {
              const it = items.find(x => x.id === m.itemId);
              const u = users.find(x => x.id === m.actorId);
              return (
                <div key={m.id} className="flex items-center justify-between p-2.5 rounded-md border border-border">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-md flex items-center justify-center ${m.type === "IN" ? "bg-success/10 text-success" : "bg-info/10 text-info"}`}>
                      {m.type === "IN" ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{it?.name}</div>
                      <div className="text-[11px] text-muted-foreground">{m.note} • {u?.name}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">{m.type === "IN" ? "+" : "-"}{m.qty} {it?.unit}</div>
                    <div className="text-[10px] text-muted-foreground">{formatDate(m.date)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
