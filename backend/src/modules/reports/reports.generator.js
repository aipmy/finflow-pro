import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle } from "docx";

// Helper to format currency
const formatRupiah = (val) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(val);
};

// Helper to format period label
function getPeriodLabel(filters) {
  if (filters.startDate && filters.endDate) {
    return `Periode: ${new Date(filters.startDate).toLocaleDateString("id-ID")} - ${new Date(filters.endDate).toLocaleDateString("id-ID")}`;
  }
  if (filters.year && filters.year !== "all") {
    if (filters.month && filters.month !== "all") {
      const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
      return `Periode: ${monthNames[parseInt(filters.month, 10) - 1]} ${filters.year}`;
    }
    return `Periode: Tahun ${filters.year}`;
  }
  return "Periode: Semua Waktu";
}

export async function generateExcelReport(data, filters = {}) {
  const transactions = data.allTransactions || [];
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Laporan Pengeluaran");

  // Title Row
  worksheet.mergeCells("A1:J1");
  const titleCell = worksheet.getCell("A1");
  titleCell.value = "FINFLOW PRO - LAPORAN AUDIT TRANSAKSI KEUANGAN";
  titleCell.font = { bold: true, size: 14, color: { argb: "FF4F46E5" } };
  titleCell.alignment = { vertical: "middle", horizontal: "center" };
  worksheet.getRow(1).height = 30;

  // Period Row
  worksheet.mergeCells("A2:J2");
  const periodCell = worksheet.getCell("A2");
  periodCell.value = getPeriodLabel(filters);
  periodCell.font = { italic: true, size: 10, color: { argb: "FF6B7280" } };
  periodCell.alignment = { vertical: "middle", horizontal: "center" };
  worksheet.getRow(2).height = 20;

  // Blank row
  worksheet.addRow([]);

  worksheet.columns = [
    { header: "Kode", key: "code", width: 18 },
    { header: "Judul", key: "title", width: 30 },
    { header: "Tipe", key: "type", width: 18 },
    { header: "Pemohon", key: "requester", width: 22 },
    { header: "Departemen", key: "department", width: 18 },
    { header: "Site", key: "site", width: 15 },
    { header: "Kategori", key: "category", width: 18 },
    { header: "Nominal", key: "amount", width: 18 },
    { header: "Status", key: "status", width: 15 },
    { header: "Tanggal", key: "date", width: 15 }
  ];

  // Style Header Row (Row 4)
  const headerRow = worksheet.getRow(4);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4F46E5" } // Brand primary Indigo-600
  };
  headerRow.height = 25;

  let totalAmount = 0;
  transactions.forEach((tx) => {
    const amt = Number(tx.amount);
    totalAmount += amt;
    worksheet.addRow({
      code: tx.code,
      title: tx.title,
      type: tx.type === "PETTY_CASH" ? "Kas Kecil" : tx.type,
      requester: tx.requesterName,
      department: tx.departmentName,
      site: tx.siteName,
      category: tx.categoryName,
      amount: amt,
      status: tx.status,
      date: new Date(tx.date).toLocaleDateString("id-ID")
    });
  });

  // Apply currency formatting to the amount column
  worksheet.getColumn("amount").numFmt = '"Rp"#,##0';

  // Add summary row
  const totalRow = worksheet.addRow({
    code: "TOTAL REALISASI",
    amount: totalAmount
  });
  totalRow.getCell("code").font = { bold: true };
  totalRow.getCell("amount").font = { bold: true };
  totalRow.height = 20;

  // Write to buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

export async function generatePdfReport(data, filters = {}) {
  const transactions = data.allTransactions || [];
  const stats = data.stats || {};
  
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (err) => reject(err));

    // Header Title
    doc.fontSize(18).fillColor("#4f46e5").text("FINFLOW PRO - LAPORAN AUDIT KEUANGAN", { align: "center" });
    doc.fontSize(10).fillColor("#6b7280").text(getPeriodLabel(filters), { align: "center" });
    doc.text(`Dicetak pada: ${new Date().toLocaleDateString("id-ID")} ${new Date().toLocaleTimeString("id-ID")}`, { align: "center" });
    doc.moveDown(1.5);

    // Summary Info
    const totalAmount = stats.totalRealizedAmount || 0;
    doc.fontSize(11).fillColor("#1f2937").text(`Total Transaksi Terealisasi: ${transactions.length}`);
    doc.text(`Total Realisasi Pengeluaran: ${formatRupiah(totalAmount)}`);
    doc.text(`Rata-rata Nominal Transaksi: ${formatRupiah(stats.avgAmount || 0)}`);
    doc.moveDown(1.5);

    // Draw Table Headers
    const startY = doc.y;
    doc.fontSize(9).fillColor("#111827").font("Helvetica-Bold");
    doc.text("Kode", 40, startY, { width: 85 });
    doc.text("Pemohon", 125, startY, { width: 95 });
    doc.text("Tipe", 220, startY, { width: 75 });
    doc.text("Kategori", 295, startY, { width: 85 });
    doc.text("Nominal", 380, startY, { width: 90 });
    doc.text("Tanggal", 470, startY, { width: 80 });
    
    doc.moveTo(40, startY + 12).lineTo(550, startY + 12).strokeColor("#e5e7eb").stroke();
    
    // Draw Rows
    let currentY = startY + 18;
    doc.font("Helvetica").fontSize(8.5);

    transactions.forEach((tx) => {
      // Avoid printing off-page
      if (currentY > 720) {
        doc.addPage();
        currentY = 40;
      }

      doc.text(tx.code, 40, currentY, { width: 85 });
      doc.text(tx.requesterName, 125, currentY, { width: 95 });
      doc.text(tx.type === "PETTY_CASH" ? "Kas Kecil" : tx.type, 220, currentY, { width: 75 });
      doc.text(tx.categoryName, 295, currentY, { width: 85 });
      doc.text(formatRupiah(Number(tx.amount)), 380, currentY, { width: 90 });
      doc.text(new Date(tx.date).toLocaleDateString("id-ID"), 470, currentY, { width: 80 });

      currentY += 18;
    });

    doc.end();
  });
}

export async function generateDocxReport(data, filters = {}) {
  const transactions = data.allTransactions || [];
  const totalAmount = data.stats?.totalRealizedAmount || 0;

  const tableRows = [
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ text: "Kode", style: "HeaderStyle" })], width: { size: 15, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ text: "Pemohon", style: "HeaderStyle" })], width: { size: 20, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ text: "Tipe", style: "HeaderStyle" })], width: { size: 15, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ text: "Kategori", style: "HeaderStyle" })], width: { size: 20, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ text: "Nominal", style: "HeaderStyle" })], width: { size: 18, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ text: "Tanggal", style: "HeaderStyle" })], width: { size: 12, type: WidthType.PERCENTAGE } })
      ]
    })
  ];

  transactions.forEach((tx) => {
    tableRows.push(
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(tx.code)] }),
          new TableCell({ children: [new Paragraph(tx.requesterName)] }),
          new TableCell({ children: [new Paragraph(tx.type === "PETTY_CASH" ? "Kas Kecil" : tx.type)] }),
          new TableCell({ children: [new Paragraph(tx.categoryName)] }),
          new TableCell({ children: [new Paragraph(formatRupiah(Number(tx.amount)))] }),
          new TableCell({ children: [new Paragraph(new Date(tx.date).toLocaleDateString("id-ID"))] })
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
                size: 24,
                color: "4F46E5"
              })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `${getPeriodLabel(filters)}`,
                bold: true,
                size: 18,
                color: "6B7280"
              })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Tanggal Cetak: ${new Date().toLocaleDateString("id-ID")} ${new Date().toLocaleTimeString("id-ID")}`,
                italics: true,
                size: 14
              })
            ]
          }),
          new Paragraph({ text: "\n" }),
          new Paragraph({
            children: [
              new TextRun({ text: `Total Transaksi: ${transactions.length}`, bold: true }),
              new TextRun({ text: "\n" }),
              new TextRun({ text: `Total Realisasi Pengeluaran: ${formatRupiah(totalAmount)}`, bold: true })
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
