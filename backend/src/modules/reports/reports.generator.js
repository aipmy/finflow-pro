import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle } from "docx";
import { prisma } from "../../core/database.js";

// Helper to format currency
const formatRupiah = (val) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(val);
};

// Fetch data for reports export
async function getExportData(filters = {}) {
  const where = {
    status: { notIn: ["DRAFT", "REJECTED"] }
  };

  if (filters.startDate && filters.endDate) {
    where.createdAt = {
      gte: new Date(filters.startDate),
      lte: new Date(filters.endDate),
    };
  } else if (filters.year) {
    const year = parseInt(filters.year, 10);
    if (filters.month) {
      const month = parseInt(filters.month, 10);
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59, 999);
      where.createdAt = { gte: start, lte: end };
    } else {
      const start = new Date(year, 0, 1);
      const end = new Date(year, 11, 31, 23, 59, 59, 999);
      where.createdAt = { gte: start, lte: end };
    }
  }

  return prisma.request.findMany({
    where,
    include: {
      category: true,
      department: true,
      site: true,
      requester: true
    },
    orderBy: { createdAt: "desc" }
  });
}

export async function generateExcelReport(filters = {}) {
  const requests = await getExportData(filters);
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Laporan Pengeluaran");

  worksheet.columns = [
    { header: "Kode", key: "code", width: 15 },
    { header: "Judul", key: "title", width: 25 },
    { header: "Tipe", key: "type", width: 18 },
    { header: "Pemohon", key: "requester", width: 20 },
    { header: "Departemen", key: "department", width: 18 },
    { header: "Site", key: "site", width: 15 },
    { header: "Kategori", key: "category", width: 18 },
    { header: "Nominal", key: "amount", width: 18 },
    { header: "Status", key: "status", width: 15 },
    { header: "Tanggal", key: "date", width: 15 }
  ];

  // Style Header Row
  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4F46E5" } // Brand primary Indigo-600
  };

  let totalAmount = 0;
  requests.forEach((req) => {
    const amt = Number(req.amount);
    totalAmount += amt;
    worksheet.addRow({
      code: req.code,
      title: req.title,
      type: req.type,
      requester: req.requester?.name || "-",
      department: req.department?.name || "-",
      site: req.site?.name || "-",
      category: req.category?.name || "-",
      amount: amt,
      status: req.status,
      date: new Date(req.createdAt).toLocaleDateString("id-ID")
    });
  });

  // Apply currency formatting to the amount column
  worksheet.getColumn("amount").numFmt = '"Rp"#,##0';

  // Add summary row
  const totalRow = worksheet.addRow({
    code: "TOTAL",
    amount: totalAmount
  });
  totalRow.getCell("code").font = { bold: true };
  totalRow.getCell("amount").font = { bold: true };

  // Write to buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

export async function generatePdfReport(filters = {}) {
  const requests = await getExportData(filters);
  
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (err) => reject(err));

    // Header Title
    doc.fontSize(20).fillColor("#4f46e5").text("FINFLOW PRO - LAPORAN KEUANGAN", { align: "center" });
    doc.fontSize(10).fillColor("#6b7280").text(`Generated on: ${new Date().toLocaleDateString("id-ID")}`, { align: "center" });
    doc.moveDown(2);

    // Summary Info
    const totalAmount = requests.reduce((sum, r) => sum + Number(r.amount), 0);
    doc.fontSize(12).fillColor("#1f2937").text(`Total Transaksi Disetujui: ${requests.length}`);
    doc.text(`Total Nominal Pengeluaran: ${formatRupiah(totalAmount)}`);
    doc.moveDown(1.5);

    // Draw Table Headers
    const startY = doc.y;
    doc.fontSize(10).fillColor("#111827").font("Helvetica-Bold");
    doc.text("Kode", 40, startY, { width: 90 });
    doc.text("Pemohon", 130, startY, { width: 100 });
    doc.text("Tipe", 230, startY, { width: 90 });
    doc.text("Kategori", 320, startY, { width: 90 });
    doc.text("Nominal", 410, startY, { width: 100 });
    
    doc.moveTo(40, startY + 15).lineTo(550, startY + 15).strokeColor("#e5e7eb").stroke();
    
    // Draw Rows
    let currentY = startY + 22;
    doc.font("Helvetica");

    requests.forEach((req, idx) => {
      // Avoid printing off-page
      if (currentY > 700) {
        doc.addPage();
        currentY = 40;
      }

      doc.text(req.code, 40, currentY, { width: 90 });
      doc.text(req.requester?.name || "-", 130, currentY, { width: 100 });
      doc.text(req.type, 230, currentY, { width: 90 });
      doc.text(req.category?.name || "-", 320, currentY, { width: 90 });
      doc.text(formatRupiah(Number(req.amount)), 410, currentY, { width: 100 });

      currentY += 20;
    });

    doc.end();
  });
}

export async function generateDocxReport(filters = {}) {
  const requests = await getExportData(filters);
  const totalAmount = requests.reduce((sum, r) => sum + Number(r.amount), 0);

  const tableRows = [
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ text: "Kode", style: "HeaderStyle" })], width: { size: 15, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ text: "Pemohon", style: "HeaderStyle" })], width: { size: 25, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ text: "Tipe", style: "HeaderStyle" })], width: { size: 20, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ text: "Kategori", style: "HeaderStyle" })], width: { size: 20, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ text: "Nominal", style: "HeaderStyle" })], width: { size: 20, type: WidthType.PERCENTAGE } })
      ]
    })
  ];

  requests.forEach((req) => {
    tableRows.push(
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(req.code)] }),
          new TableCell({ children: [new Paragraph(req.requester?.name || "-")] }),
          new TableCell({ children: [new Paragraph(req.type)] }),
          new TableCell({ children: [new Paragraph(req.category?.name || "-")] }),
          new TableCell({ children: [new Paragraph(formatRupiah(Number(req.amount)))] })
        ]
      })
    );
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: "FINFLOW PRO - LAPORAN TRANSAKSI KEUANGAN",
                bold: true,
                size: 28,
                color: "4F46E5"
              })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Tanggal Cetak: ${new Date().toLocaleDateString("id-ID")}`,
                italics: true,
                size: 18
              })
            ]
          }),
          new Paragraph({ text: "\n" }),
          new Paragraph({
            children: [
              new TextRun({ text: `Total Transaksi: ${requests.length}`, bold: true }),
              new TextRun({ text: "\n" }),
              new TextRun({ text: `Total Nominal Pengeluaran: ${formatRupiah(totalAmount)}`, bold: true })
            ]
          }),
          new Paragraph({ text: "\n" }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: tableRows
          })
        ]
      }
    ]
  });

  return Packer.toBuffer(doc);
}
