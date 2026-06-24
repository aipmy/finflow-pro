import { prisma } from "../src/core/database.js";

async function main() {
  const unitName = "Minggu";
  const existing = await prisma.unit.findUnique({
    where: { name: unitName },
  });

  if (!existing) {
    await prisma.unit.create({
      data: { name: unitName },
    });
    console.log(`Unit '${unitName}' added successfully.`);
  } else {
    console.log(`Unit '${unitName}' already exists.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
