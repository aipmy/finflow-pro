import * as reportsService from "./reports.service.js";
import * as reportsGenerator from "./reports.generator.js";

export async function getAggregates(req, res, next) {
  try {
    const { year, month, startDate, endDate } = req.query;
    const data = await reportsService.getAggregates({ year, month, startDate, endDate });
    return res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function getUserDetail(req, res, next) {
  try {
    const { userId } = req.params;
    const { year, month, startDate, endDate } = req.query;
    const data = await reportsService.getUserDetail(userId, { year, month, startDate, endDate });
    return res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function exportExcel(req, res, next) {
  try {
    const { year, month, startDate, endDate } = req.query;
    const data = await reportsService.getAggregates({ year, month, startDate, endDate });
    const buffer = await reportsGenerator.generateExcelReport(data, { year, month, startDate, endDate });
    await reportsService.logExport(req.user.userId, "EXCEL");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="Laporan_Keuangan.xlsx"');
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
}

export async function exportPdf(req, res, next) {
  try {
    const { year, month, startDate, endDate } = req.query;
    const data = await reportsService.getAggregates({ year, month, startDate, endDate });
    const buffer = await reportsGenerator.generatePdfReport(data, { year, month, startDate, endDate });
    await reportsService.logExport(req.user.userId, "PDF");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="Laporan_Keuangan.pdf"');
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
}

export async function exportDocx(req, res, next) {
  try {
    const { year, month, startDate, endDate } = req.query;
    const data = await reportsService.getAggregates({ year, month, startDate, endDate });
    const buffer = await reportsGenerator.generateDocxReport(data, { year, month, startDate, endDate });
    await reportsService.logExport(req.user.userId, "DOCX");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", 'attachment; filename="Laporan_Keuangan.docx"');
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
}
