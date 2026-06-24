import { prisma } from "./core/database.js";

async function main() {
  const requests = await prisma.request.findMany();
  const manualPettyCashOut = []; // assume 0 for now
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
  const now = new Date("2026-06-25T00:00:00.000Z"); // simulate current date

  const trend = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mIndex = d.getMonth();
    const mName = months[mIndex];
    const year = d.getFullYear();
    
    const sum = requests
      .filter(r => {
        const rDate = new Date(r.createdAt);
        const match = rDate.getMonth() === mIndex && rDate.getFullYear() === year && ["APPROVED_BY_FINANCE", "PURCHASED", "REALIZED", "CLOSED"].includes(r.status);
        console.log(`Checking request ${r.code}: date=${r.createdAt}, status=${r.status}, match=${match}`);
        return match;
      })
      .reduce((acc, r) => acc + Number(r.amount), 0);

    trend.push({ month: `${mName}`, value: sum });
  }

  console.log('=== Simulated Trend ===');
  console.log(trend);
}

main().catch(console.error).finally(() => prisma.$disconnect());
