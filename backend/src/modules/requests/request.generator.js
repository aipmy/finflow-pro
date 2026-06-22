import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

// Helper to format currency
const formatRupiah = (val) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(val);
};

export async function generateSingleRequestPdf(request) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ 
      margin: 40,
      info: {
        Title: `${request.code} - ${request.title}`,
        Author: "FinanceFlow",
        Subject: "Formulir Pengajuan Dana",
        Creator: "FinanceFlow System"
      }
    });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (err) => reject(err));

    // Header / Form Title
    doc.fontSize(14).fillColor("#111827").font("Helvetica-Bold").text("FORMULIR PENGAJUAN DANA", { align: "center" });
    doc.fontSize(10).fillColor("#4b5563").font("Helvetica-Bold").text(`Kode Pengajuan: ${request.code}`, { align: "center" });
    doc.moveDown(1.5);

    // Details Grid
    const detailsY = doc.y;
    doc.fontSize(9).font("Helvetica-Bold").fillColor("#4b5563");
    doc.text("Judul Pengajuan:", 40, detailsY);
    doc.font("Helvetica").fillColor("#111827").text(request.title, 140, detailsY);
    
    doc.font("Helvetica-Bold").fillColor("#4b5563").text("Tipe Pengajuan:", 40, detailsY + 18);
    doc.font("Helvetica").fillColor("#111827").text(request.type, 140, detailsY + 18);
    
    doc.font("Helvetica-Bold").fillColor("#4b5563").text("Pemohon:", 40, detailsY + 36);
    doc.font("Helvetica").fillColor("#111827").text(`${request.requester?.name || "-"} (${request.requester?.email || "-"})`, 140, detailsY + 36);

    doc.font("Helvetica-Bold").fillColor("#4b5563").text("Departemen / Site:", 40, detailsY + 54);
    doc.font("Helvetica").fillColor("#111827").text(`${request.department?.name || "-"} / ${request.site?.name || "-"}`, 140, detailsY + 54);

    doc.font("Helvetica-Bold").fillColor("#4b5563").text("Status Pengajuan:", 40, detailsY + 72);
    doc.font("Helvetica-Bold").fillColor("#1e3a8a").text(request.status, 140, detailsY + 72);

    doc.font("Helvetica-Bold").fillColor("#4b5563").text("Tanggal Pengajuan:", 40, detailsY + 90);
    doc.font("Helvetica").fillColor("#111827").text(new Date(request.createdAt).toLocaleDateString("id-ID") + " " + new Date(request.createdAt).toLocaleTimeString("id-ID"), 140, detailsY + 90);

    doc.moveDown(7.5);

    // Items Section
    doc.fontSize(12).font("Helvetica-Bold").fillColor("#111827").text("Detail Barang / Jasa", 40);
    doc.moveDown(0.5);

    const tableStartY = doc.y;
    const colX = [40, 70, 260, 310, 370, 470, 550];

    const drawTableHeader = (startY) => {
      doc.fontSize(9).font("Helvetica-Bold").fillColor("#4b5563");
      doc.text("No", 40 + 4, startY, { width: 30 - 8 });
      doc.text("Nama Item", 70 + 4, startY, { width: 190 - 8 });
      doc.text("Qty", 260 + 2, startY, { width: 40 - 4, align: "right" });
      doc.text("Satuan", 310 + 2, startY, { width: 60 - 4, align: "center" });
      doc.text("Harga Satuan", 370 + 2, startY, { width: 100 - 4, align: "right" });
      doc.text("Subtotal", 470 + 2, startY, { width: 80 - 4, align: "right" });

      // Header border lines
      doc.moveTo(40, startY - 6).lineTo(550, startY - 6).strokeColor("#9ca3af").lineWidth(1).stroke();
      doc.moveTo(40, startY + 15).lineTo(550, startY + 15).strokeColor("#9ca3af").lineWidth(1).stroke();
      
      colX.forEach(x => {
        doc.moveTo(x, startY - 6).lineTo(x, startY + 15).strokeColor("#9ca3af").lineWidth(1).stroke();
      });
    };

    drawTableHeader(tableStartY);
    let rowTopY = tableStartY + 15;
    
    doc.font("Helvetica").fillColor("#111827");
    
    let itemIndex = 1;
    (request.items || []).forEach(it => {
      if (rowTopY > 680) {
        doc.addPage();
        drawTableHeader(40);
        rowTopY = 40 + 15;
        doc.font("Helvetica").fillColor("#111827");
      }
      
      // Draw row text
      doc.text(String(itemIndex++), 40 + 4, rowTopY + 4, { width: 30 - 8 });
      doc.text(it.name, 70 + 4, rowTopY + 4, { width: 190 - 8 });
      doc.text(String(it.qty), 260 + 2, rowTopY + 4, { width: 40 - 4, align: "right" });
      doc.text(it.unit?.name || "Pcs", 310 + 2, rowTopY + 4, { width: 60 - 4, align: "center" });
      doc.text(formatRupiah(Number(it.price)), 370 + 2, rowTopY + 4, { width: 100 - 4, align: "right" });
      doc.text(formatRupiah(it.qty * Number(it.price)), 470 + 2, rowTopY + 4, { width: 80 - 4, align: "right" });
      
      // Draw bottom border
      doc.moveTo(40, rowTopY + 18).lineTo(550, rowTopY + 18).strokeColor("#d1d5db").lineWidth(0.5).stroke();
      
      // Draw vertical borders
      colX.forEach(x => {
        doc.moveTo(x, rowTopY).lineTo(x, rowTopY + 18).strokeColor("#d1d5db").lineWidth(0.5).stroke();
      });

      rowTopY += 18;
    });

    let currentY = rowTopY + 8;

    // Total Nominal
    doc.font("Helvetica-Bold").fillColor("#111827");
    doc.text("Total Pengajuan:", 300, currentY, { width: 170, align: "right" });
    doc.text(formatRupiah(Number(request.amount)), 470, currentY, { width: 80, align: "right" });

    currentY += 25;

    // Timeline / Approval Logs Y check
    if (currentY > 650) {
      doc.addPage();
      currentY = 40;
    }

    doc.fontSize(11).font("Helvetica-Bold").fillColor("#111827").text("Riwayat Persetujuan / Timeline", 40, currentY);
    currentY += 15;

    doc.moveTo(40, currentY).lineTo(550, currentY).strokeColor("#e5e7eb").stroke();
    currentY += 10;

    doc.font("Helvetica");
    const logs = request.approvalLogs || [];
    if (logs.length === 0) {
      doc.fontSize(9).fillColor("#6b7280").text("Belum ada riwayat persetujuan.", 40, currentY);
    } else {
      logs.forEach(l => {
        if (currentY > 720) {
          doc.addPage();
          currentY = 40;
        }
        const timeStr = new Date(l.createdAt).toLocaleString("id-ID");
        const actionLabel = l.action === "SUBMIT" ? "Mengajukan" : l.action === "APPROVE" ? "Menyetujui" : l.action === "REVISE" ? "Meminta Revisi" : l.action;
        doc.fontSize(9).fillColor("#374151").font("Helvetica-Bold").text(`${l.actor?.name || "System"}: `, 40, currentY);
        doc.font("Helvetica").fillColor("#111827").text(`${actionLabel} pada ${timeStr} ${l.note ? `("${l.note}")` : ""}`, 150, currentY);
        currentY += 16;
      });
    }

    doc.end();
  });
}

export async function generateSingleRequestExcel(request) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "FinanceFlow System";
  workbook.title = `${request.code} - ${request.title}`;

  const worksheet = workbook.addWorksheet("Detail Pengajuan");

  // Title Block
  worksheet.mergeCells("A1:F1");
  worksheet.getCell("A1").value = "DETAIL PENGAJUAN DANA";
  worksheet.getCell("A1").font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
  worksheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getCell("A1").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E3A8A" }
  };

  worksheet.addRow([]); // Blank row

  // Details
  const addDetailRow = (label, val) => {
    const row = worksheet.addRow([label, val]);
    row.getCell(1).font = { bold: true };
  };

  addDetailRow("Kode Pengajuan", request.code);
  addDetailRow("Judul Pengajuan", request.title);
  addDetailRow("Tipe Pengajuan", request.type);
  addDetailRow("Pemohon", `${request.requester?.name || "-"} (${request.requester?.email || "-"})`);
  addDetailRow("Departemen / Site", `${request.department?.name || "-"} / ${request.site?.name || "-"}`);
  addDetailRow("Status", request.status);
  addDetailRow("Tanggal Pengajuan", new Date(request.createdAt).toLocaleString("id-ID"));

  worksheet.addRow([]); // Blank row
  worksheet.addRow([]); // Blank row

  // Table Headers
  const headerRow = worksheet.addRow(["No", "Nama Item", "Kuantitas", "Satuan", "Harga Satuan (IDR)", "Subtotal (IDR)"]);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4B5563" }
  };

  let itemIdx = 1;
  (request.items || []).forEach(it => {
    worksheet.addRow([
      itemIdx++,
      it.name,
      it.qty,
      it.unit?.name || "Pcs",
      Number(it.price),
      it.qty * Number(it.price)
    ]);
  });

  // Formatting currency columns
  worksheet.getColumn(5).numFmt = '"Rp"#,##0';
  worksheet.getColumn(6).numFmt = '"Rp"#,##0';

  // Total
  const totalRow = worksheet.addRow(["", "", "", "", "TOTAL PENGAJUAN", Number(request.amount)]);
  totalRow.getCell(5).font = { bold: true };
  totalRow.getCell(6).font = { bold: true };

  // Set widths
  worksheet.getColumn(1).width = 10;
  worksheet.getColumn(2).width = 35;
  worksheet.getColumn(3).width = 15;
  worksheet.getColumn(4).width = 15;
  worksheet.getColumn(5).width = 20;
  worksheet.getColumn(6).width = 20;

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}
