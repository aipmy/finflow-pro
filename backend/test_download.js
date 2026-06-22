import { prisma } from "./src/core/database.js";
import { generateSingleRequestPdf, generateSingleRequestExcel } from "./src/modules/requests/request.generator.js";
import fs from "fs";

async function main() {
  const req = await prisma.request.findFirst({
    include: {
      requester: { select: { id: true, name: true, email: true } },
      department: true,
      site: true,
      category: true,
      vendor: true,
      items: {
        include: {
          item: true,
          unit: true,
          category: true,
        }
      },
      attachments: true,
      approvalLogs: {
        include: {
          actor: { select: { id: true, name: true, email: true, role: { select: { name: true } } } }
        },
        orderBy: { createdAt: "asc" }
      },
      financeRealization: true,
      realizationProofs: {
        include: {
          uploadedBy: { select: { id: true, name: true } },
          requestItem: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: "asc" }
      },
    }
  });

  if (!req) {
    console.error("No request found in database!");
    return;
  }

  console.log("Generating PDF for request:", req.code);
  const pdfBuffer = await generateSingleRequestPdf(req);
  fs.writeFileSync("./test_out.pdf", pdfBuffer);
  console.log("PDF saved to ./test_out.pdf, size:", pdfBuffer.length);

  console.log("Generating Excel for request:", req.code);
  const excelBuffer = await generateSingleRequestExcel(req);
  fs.writeFileSync("./test_out.xlsx", excelBuffer);
  console.log("Excel saved to ./test_out.xlsx, size:", excelBuffer.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());
