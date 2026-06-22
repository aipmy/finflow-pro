import { prisma } from "../src/core/database.js";

async function main() {
  const result = await prisma.unit.updateMany({
    where: { name: "Malam" },
    data: { name: "Hari" }
  });
  console.log("Renamed units count:", result.count);
}

main().catch(console.error).finally(() => prisma.$disconnect());
