import pkg from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import dotenv from "dotenv";

dotenv.config();

const { PrismaClient } = pkg;
const adapter = new PrismaMariaDb(process.env.DATABASE_URL);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Purging all transaction and user data...");

  // Delete dependent items first to avoid foreign key constraint errors
  await prisma.userSession.deleteMany({});
  await prisma.requestAttachment.deleteMany({});
  await prisma.requestItem.deleteMany({});
  await prisma.approvalLog.deleteMany({});
  await prisma.financeRealization.deleteMany({});
  await prisma.pettyCashTransaction.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.exportLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.inventoryMovement.deleteMany({});
  await prisma.inventoryStock.deleteMany({});
  await prisma.request.deleteMany({});
  await prisma.item.deleteMany({});
  await prisma.user.deleteMany({});

  console.log("Database cleared successfully!");
}

main()
  .catch((e) => {
    console.error("Purging error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
