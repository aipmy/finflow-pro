// Mock data simulating the backend repository layer.
// Structure mirrors what a NestJS/Express API would return.

export type Role = "admin" | "finance" | "supervisor" | "manager" | "staff" | "auditor";
export type RequestStatus =
  | "DRAFT" | "SUBMITTED" | "NEED_REVISION"
  | "APPROVED_BY_SUPERVISOR" | "APPROVED_BY_FINANCE"
  | "REJECTED" | "PURCHASED" | "REALIZED" | "WAITING_VERIFICATION" | "CLOSED";
export type RequestType = "PEMBELIAN" | "PETTY_CASH" | "REIMBURSE" | "PERJALANAN_DINAS" | "OPERASIONAL";

export const departments = [
  { id: "d1", name: "Operasional" },
  { id: "d2", name: "Teknik" },
  { id: "d3", name: "Finance" },
  { id: "d4", name: "HRD" },
  { id: "d5", name: "IT" },
];

export const sites = [
  { id: "s1", name: "Site Jakarta" },
  { id: "s2", name: "Site Bandung" },
  { id: "s3", name: "Site Surabaya" },
  { id: "s4", name: "Site Bekasi" },
];

export const categories = [
  { id: "c1", name: "Sparepart", color: "info" },
  { id: "c2", name: "ATK", color: "warning" },
  { id: "c3", name: "Bensin & Tol", color: "accent" },
  { id: "c4", name: "Konsumsi", color: "success" },
  { id: "c5", name: "Maintenance", color: "info" },
  { id: "c6", name: "Perjalanan Dinas", color: "primary" },
  { id: "c7", name: "Petty Cash", color: "warning" },
];

export const users = [
  { id: "u1", name: "Andi Wibowo", email: "andi@company.id", role: "admin" as Role, department: "d5", site: "s1", active: true },
  { id: "u2", name: "Sari Lestari", email: "sari@company.id", role: "finance" as Role, department: "d3", site: "s1", active: true },
  { id: "u3", name: "Budi Santoso", email: "budi@company.id", role: "supervisor" as Role, department: "d2", site: "s2", active: true },
  { id: "u4", name: "Rina Hartati", email: "rina@company.id", role: "manager" as Role, department: "d1", site: "s1", active: true },
  { id: "u5", name: "Joko Prabowo", email: "joko@company.id", role: "staff" as Role, department: "d2", site: "s2", active: true },
  { id: "u6", name: "Dewi Kusuma", email: "dewi@company.id", role: "staff" as Role, department: "d1", site: "s3", active: true },
  { id: "u7", name: "Hendra Saputra", email: "hendra@company.id", role: "auditor" as Role, department: "d3", site: "s1", active: true },
  { id: "u8", name: "Maya Anggraini", email: "maya@company.id", role: "staff" as Role, department: "d4", site: "s4", active: false },
];

export const items = [
  { id: "i1", name: "Oli Mesin SAE 10W-40", sku: "SPR-001", category: "c1", unit: "Liter", stock: 24, minStock: 10, location: "s1" },
  { id: "i2", name: "Filter Udara Tipe A", sku: "SPR-002", category: "c1", unit: "Pcs", stock: 6, minStock: 12, location: "s1" },
  { id: "i3", name: "Kertas A4 80gsm", sku: "ATK-001", category: "c2", unit: "Rim", stock: 32, minStock: 20, location: "s2" },
  { id: "i4", name: "Tinta Printer Hitam", sku: "ATK-002", category: "c2", unit: "Pcs", stock: 4, minStock: 8, location: "s2" },
  { id: "i5", name: "Bearing 6202", sku: "SPR-003", category: "c1", unit: "Pcs", stock: 15, minStock: 5, location: "s3" },
  { id: "i6", name: "Lampu LED 18W", sku: "MNT-001", category: "c5", unit: "Pcs", stock: 2, minStock: 10, location: "s1" },
  { id: "i7", name: "Pulpen Standard", sku: "ATK-003", category: "c2", unit: "Pcs", stock: 120, minStock: 50, location: "s4" },
  { id: "i8", name: "V-Belt Industri B-50", sku: "SPR-004", category: "c1", unit: "Pcs", stock: 8, minStock: 4, location: "s2" },
];

const now = new Date();
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();

export const requests: Array<{
  id: string;
  code: string;
  type: RequestType;
  title: string;
  requesterId: string;
  department: string;
  site: string;
  category: string;
  amount: number;
  realizedAmount?: number;
  status: RequestStatus;
  createdAt: string;
  description: string;
  items: Array<{ name: string; qty: number; unit: string; price: number }>;
  attachments: Array<{ name: string; size: string }>;
}> = [
  { id: "r1", code: "REQ-2026-001", type: "PEMBELIAN", title: "Pembelian Sparepart Mesin Produksi", requesterId: "u5", department: "d2", site: "s2", category: "c1", amount: 4500000, status: "APPROVED_BY_FINANCE", createdAt: daysAgo(2), description: "Penggantian sparepart rutin mesin produksi line 2", items: [{ name: "Bearing 6202", qty: 10, unit: "Pcs", price: 150000 }, { name: "V-Belt B-50", qty: 6, unit: "Pcs", price: 500000 }], attachments: [{ name: "quotation-vendor.pdf", size: "234 KB" }] },
  { id: "r2", code: "REQ-2026-002", type: "PETTY_CASH", title: "Petty Cash Operasional Site Jakarta", requesterId: "u6", department: "d1", site: "s1", category: "c7", amount: 350000, status: "APPROVED_BY_FINANCE", realizedAmount: 342000, createdAt: daysAgo(5), description: "Petty cash untuk keperluan harian site", items: [{ name: "Kebutuhan harian", qty: 1, unit: "Lot", price: 350000 }], attachments: [] },
  { id: "r3", code: "REQ-2026-003", type: "REIMBURSE", title: "Reimburse Bensin Kendaraan Dinas", requesterId: "u5", department: "d2", site: "s2", category: "c3", amount: 850000, status: "SUBMITTED", createdAt: daysAgo(1), description: "Reimburse bensin kunjungan customer Maret", items: [{ name: "Bensin Pertamax", qty: 65, unit: "Liter", price: 13000 }], attachments: [{ name: "struk-pom.jpg", size: "1.2 MB" }] },
  { id: "r4", code: "REQ-2026-004", type: "PERJALANAN_DINAS", title: "Dinas Surabaya - Audit Site", requesterId: "u3", department: "d2", site: "s3", category: "c6", amount: 7500000, status: "APPROVED_BY_SUPERVISOR", createdAt: daysAgo(3), description: "Perjalanan dinas audit teknis 3 hari", items: [{ name: "Tiket pesawat PP", qty: 2, unit: "Pax", price: 2500000 }, { name: "Hotel 3 malam", qty: 3, unit: "Malam", price: 750000 }, { name: "Uang harian", qty: 6, unit: "Hari", price: 50000 }], attachments: [{ name: "itinerary.pdf", size: "180 KB" }] },
  { id: "r5", code: "REQ-2026-005", type: "OPERASIONAL", title: "Konsumsi Meeting Klien", requesterId: "u6", department: "d1", site: "s1", category: "c4", amount: 425000, status: "REALIZED", realizedAmount: 410000, createdAt: daysAgo(7), description: "Konsumsi meeting klien strategis", items: [{ name: "Catering 15 pax", qty: 15, unit: "Pax", price: 28000 }], attachments: [{ name: "invoice-catering.pdf", size: "98 KB" }] },
  { id: "r6", code: "REQ-2026-006", type: "PEMBELIAN", title: "Pembelian ATK Bulanan", requesterId: "u5", department: "d2", site: "s2", category: "c2", amount: 1250000, status: "NEED_REVISION", createdAt: daysAgo(4), description: "Restock ATK kantor Maret", items: [{ name: "Kertas A4", qty: 10, unit: "Rim", price: 65000 }, { name: "Tinta printer", qty: 4, unit: "Pcs", price: 150000 }], attachments: [] },
  { id: "r7", code: "REQ-2026-007", type: "OPERASIONAL", title: "Maintenance AC Ruang Server", requesterId: "u5", department: "d2", site: "s1", category: "c5", amount: 3200000, status: "PURCHASED", createdAt: daysAgo(6), description: "Service rutin AC ruang server", items: [{ name: "Service AC 4 unit", qty: 4, unit: "Unit", price: 800000 }], attachments: [{ name: "kontrak-vendor.pdf", size: "320 KB" }] },
  { id: "r8", code: "REQ-2026-008", type: "REIMBURSE", title: "Reimburse Tol & Parkir", requesterId: "u6", department: "d1", site: "s1", category: "c3", amount: 175000, status: "REJECTED", createdAt: daysAgo(8), description: "Tol & parkir kunjungan internal", items: [{ name: "Tol", qty: 1, unit: "Lot", price: 125000 }, { name: "Parkir", qty: 1, unit: "Lot", price: 50000 }], attachments: [] },
  { id: "r9", code: "REQ-2026-009", type: "PEMBELIAN", title: "Pembelian Lampu LED Workshop", requesterId: "u3", department: "d2", site: "s1", category: "c5", amount: 2400000, status: "DRAFT", createdAt: daysAgo(0), description: "Penggantian lampu workshop yang mati", items: [{ name: "Lampu LED 18W", qty: 30, unit: "Pcs", price: 80000 }], attachments: [] },
  { id: "r10", code: "REQ-2026-010", type: "PERJALANAN_DINAS", title: "Training Vendor di Bandung", requesterId: "u5", department: "d2", site: "s2", category: "c6", amount: 5800000, status: "CLOSED", realizedAmount: 5650000, createdAt: daysAgo(15), description: "Training maintenance vendor 2 hari", items: [{ name: "Transport", qty: 1, unit: "Lot", price: 2000000 }, { name: "Akomodasi", qty: 2, unit: "Malam", price: 900000 }, { name: "Biaya training", qty: 1, unit: "Lot", price: 2000000 }], attachments: [{ name: "sertifikat-training.pdf", size: "240 KB" }] },
  { id: "r11", code: "REQ-2026-011", type: "OPERASIONAL", title: "Konsumsi Lembur Tim Produksi", requesterId: "u6", department: "d1", site: "s3", category: "c4", amount: 540000, status: "APPROVED_BY_FINANCE", createdAt: daysAgo(1), description: "Konsumsi lembur akhir bulan", items: [{ name: "Nasi box", qty: 18, unit: "Box", price: 30000 }], attachments: [] },
  { id: "r12", code: "REQ-2026-012", type: "PEMBELIAN", title: "Pembelian Peralatan Workshop", requesterId: "u3", department: "d2", site: "s4", category: "c1", amount: 12500000, status: "SUBMITTED", createdAt: daysAgo(0), description: "Peralatan workshop tambahan", items: [{ name: "Toolset lengkap", qty: 2, unit: "Set", price: 4500000 }, { name: "Compressor", qty: 1, unit: "Unit", price: 3500000 }], attachments: [{ name: "spek-teknis.pdf", size: "412 KB" }] },
];

export const approvalLogs = [
  { id: "a1", requestId: "r1", actorId: "u3", action: "APPROVE", note: "Sesuai kebutuhan rutin", createdAt: daysAgo(2) },
  { id: "a2", requestId: "r1", actorId: "u2", action: "APPROVE", note: "Anggaran tersedia", createdAt: daysAgo(1) },
  { id: "a3", requestId: "r4", actorId: "u3", action: "APPROVE", note: "Sesuai jadwal audit", createdAt: daysAgo(3) },
  { id: "a4", requestId: "r6", actorId: "u3", action: "REVISION", note: "Lampirkan quotation vendor", createdAt: daysAgo(3) },
  { id: "a5", requestId: "r8", actorId: "u3", action: "REJECT", note: "Bukti tidak lengkap", createdAt: daysAgo(7) },
];

export const pettyCash = {
  balance: 4250000,
  initial: 5000000,
  transactions: [
    { id: "p1", date: daysAgo(0), type: "OUT", description: "Konsumsi meeting", amount: 425000, refRequest: "REQ-2026-005" },
    { id: "p2", date: daysAgo(2), type: "OUT", description: "Bensin operasional", amount: 250000, refRequest: "-" },
    { id: "p3", date: daysAgo(3), type: "OUT", description: "Parkir & tol", amount: 75000, refRequest: "-" },
    { id: "p4", date: daysAgo(5), type: "IN", description: "Top up petty cash", amount: 5000000, refRequest: "-" },
    { id: "p5", date: daysAgo(6), type: "OUT", description: "ATK darurat", amount: 0, refRequest: "-" },
  ],
};

export const auditLogs = [
  { id: "al1", userId: "u2", module: "REQUESTS", action: "APPROVE", target: "REQ-2026-001", timestamp: daysAgo(1), ip: "192.168.1.10" },
  { id: "al2", userId: "u3", module: "REQUESTS", action: "REVISION", target: "REQ-2026-006", timestamp: daysAgo(3), ip: "192.168.1.21" },
  { id: "al3", userId: "u1", module: "USERS", action: "CREATE", target: "u8", timestamp: daysAgo(4), ip: "192.168.1.5" },
  { id: "al4", userId: "u2", module: "FINANCE", action: "REALIZE", target: "REQ-2026-002", timestamp: daysAgo(2), ip: "192.168.1.10" },
  { id: "al5", userId: "u3", module: "REQUESTS", action: "REJECT", target: "REQ-2026-008", timestamp: daysAgo(7), ip: "192.168.1.21" },
  { id: "al6", userId: "u1", module: "INVENTORY", action: "STOCK_IN", target: "SPR-001", timestamp: daysAgo(5), ip: "192.168.1.5" },
  { id: "al7", userId: "u2", module: "FINANCE", action: "CLOSE", target: "REQ-2026-010", timestamp: daysAgo(8), ip: "192.168.1.10" },
  { id: "al8", userId: "u4", module: "APPROVALS", action: "APPROVE", target: "REQ-2026-004", timestamp: daysAgo(3), ip: "192.168.1.30" },
];

export const inventoryMovements = [
  { id: "m1", itemId: "i1", type: "IN", qty: 20, date: daysAgo(5), note: "Pembelian rutin", actorId: "u1" },
  { id: "m2", itemId: "i2", type: "OUT", qty: 4, date: daysAgo(2), note: "Maintenance line 1", actorId: "u5" },
  { id: "m3", itemId: "i6", type: "OUT", qty: 8, date: daysAgo(1), note: "Penggantian lampu", actorId: "u5" },
  { id: "m4", itemId: "i4", type: "OUT", qty: 2, date: daysAgo(3), note: "Refill printer", actorId: "u6" },
  { id: "m5", itemId: "i3", type: "IN", qty: 50, date: daysAgo(10), note: "Restock ATK", actorId: "u1" },
];

export const monthlyTrend = [
  { month: "Sep", value: 38500000 },
  { month: "Okt", value: 42100000 },
  { month: "Nov", value: 39800000 },
  { month: "Des", value: 51200000 },
  { month: "Jan", value: 45600000 },
  { month: "Feb", value: 48900000 },
];
