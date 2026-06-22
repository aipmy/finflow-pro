import { prisma } from "../src/core/database.js";

async function main() {
  // 1. Get user (Ariep Maulana Yassar / admin)
  const user = await prisma.user.findFirst({
    where: { name: { contains: "Ariep" } }
  });
  if (!user) throw new Error("User Ariep not found");

  // 2. Get department (Teknik / Operasional)
  let dept = await prisma.department.findFirst({
    where: { name: "Teknik" }
  });
  if (!dept) dept = await prisma.department.findFirst();

  // 3. Get site (Cawang / first site)
  let site = await prisma.site.findFirst({
    where: { name: { contains: "Cawang" } }
  });
  if (!site) site = await prisma.site.findFirst();

  // 4. Get category (Sparepart / first category)
  let cat = await prisma.expenseCategory.findFirst({
    where: { name: "Sparepart" }
  });
  if (!cat) cat = await prisma.expenseCategory.findFirst();

  // 5. Get Unit Pcs
  const unitPcs = await prisma.unit.findFirst({
    where: { name: "Pcs" }
  });
  const unitId = unitPcs ? unitPcs.id : null;

  // 6. Generate next request code
  const currentYear = new Date().getFullYear();
  const latest = await prisma.request.findFirst({
    where: { code: { startsWith: `REQ-${currentYear}-` } },
    orderBy: { code: "desc" }
  });
  let nextNum = 1;
  if (latest) {
    const parts = latest.code.split("-");
    const currentNum = parseInt(parts[2], 10);
    if (!isNaN(currentNum)) nextNum = currentNum + 1;
  }
  const code = `REQ-${currentYear}-${String(nextNum).padStart(3, "0")}`;

  // 7. Define items
  const items = [
    { name: "raspberry", qty: 4, price: 4225000 },
    { name: "mikrotik", qty: 4, price: 1535000 },
    { name: "modem", qty: 4, price: 1600000 },
    { name: "sdcard", qty: 4, price: 350000 },
    { name: "durabox junction box", qty: 4, price: 130000 },
    { name: "durabox panel", qty: 4, price: 700000 },
    { name: "MCB 2pole 2A", qty: 4, price: 146898 },
    { name: "PSU Meanwell 12v 5a", qty: 4, price: 175000 },
    { name: "stepdown dc to dc 12v5a", qty: 4, price: 21000 },
    { name: "buck converter 5v", qty: 4, price: 42000 },
    { name: "chip radar", qty: 1, price: 0 },
    { name: "pcb radar", qty: 2, price: 0 },
    { name: "bms charger 20a", qty: 1, price: 0 },
    { name: "battery 18650", qty: 3, price: 0 },
    { name: "battery holder 3 slot", qty: 1, price: 0 },
    { name: "relay 5 kaki 12v", qty: 1, price: 0 },
    { name: "terminal blok 4 pole", qty: 1, price: 0 },
    { name: "terminal blok pcb 2pole", qty: 1, price: 0 },
    { name: "terminal blok pcb 3pole", qty: 4, price: 0 },
    { name: "kipas dc 40x40x10 5v", qty: 1, price: 0 },
    { name: "dioda 10a10", qty: 3, price: 0 },
    { name: "socket IDC 10pin 2x5", qty: 4, price: 0 },
    { name: "flat cabel 10pin", qty: 2, price: 0 },
    { name: "spacer pcb 3cm", qty: 4, price: 0 },
    { name: "spacer pcb 2cm", qty: 2, price: 0 },
    { name: "spacer pcb 1cm", qty: 8, price: 0 },
    { name: "cable gland PG9", qty: 2, price: 0 }
  ];

  const totalAmount = items.reduce((sum, item) => sum + (item.qty * item.price), 0);

  // 8. Create Request in transaction
  const newRequest = await prisma.$transaction(async (tx) => {
    const req = await tx.request.create({
      data: {
        code,
        type: "PEMBELIAN",
        title: "Pengadaan Komponen Pembuatan 4 Unit Radar Traffic Counting",
        description: "Draft pengajuan pengadaan komponen untuk pembuatan 4 buah unit Radar Traffic Counting.",
        requesterId: user.id,
        departmentId: dept.id,
        siteId: site.id,
        categoryId: cat ? cat.id : null,
        amount: totalAmount,
        status: "DRAFT"
      }
    });

    await tx.requestItem.createMany({
      data: items.map(it => ({
        requestId: req.id,
        name: it.name,
        qty: it.qty,
        price: it.price,
        unitId,
        categoryId: cat ? cat.id : null
      }))
    });

    await tx.approvalLog.create({
      data: {
        requestId: req.id,
        actorId: user.id,
        action: "SUBMIT",
        note: "Draft created"
      }
    });

    return req;
  });

  console.log("Draft created successfully with code:", newRequest.code);
}

main().catch(console.error).finally(() => prisma.$disconnect());
